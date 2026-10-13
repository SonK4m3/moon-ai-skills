// wm.mjs -- doc va ghi plan.md ma khong pha dinh dang.
//
// VI SAO CO FILE NAY
// Ban truoc cua skill (pm) co mot CLI. Khi doi ten sang ledger, CLI bi go
// (commit e9c4a75) va thay bang "agent tu lam bang cong cu cua minh". Ket qua
// do duoc trong log phien: 185 lenh pwsh, 87 trong so do phai goi API encoding
// .NET de tu ghi UTF-8, va 5 commit fix(plans) di sua hau qua. Mot file phinh
// len 22735 dong.
//
// Bon kieu hong, va day la thu chan tung kieu:
//   1. PowerShell lam phang mang long nhau -> acceptance thanh ["M","g","C"]
//   2. [regex]::Replace an dau $ trong chuoi thay the
//   3. Ghi UTF-8 sai (BOM, hoac doc .ps1 khong BOM theo ANSI) -> mojibake
//   4. Nhay trong YAML khong can doi -> YAML khong parse duoc
//
// File nay sua DUNG NHUNG DONG can sua. Moi thu khac trong file duoc giu
// nguyen tung byte, ke ca thu tu khoa, dong trong, va kieu xuong dong.
//
// TOAN BO FILE NAY LA ASCII, CO Y. Thong bao loi khong dau vi console Windows
// doi encoding theo codepage. Du lieu thi van la UTF-8 -- xem chu thich o
// LOG_HEADER. Giu nguyen quy uoc nay khi sua.
//
// Dung:
//   node wm.mjs read <plan.md>
//   node wm.mjs set <plan.md> <key> --text <value>
//   node wm.mjs set <plan.md> <key> --delete
//   node wm.mjs accept <plan.md> --json-file <path>
//   node wm.mjs env <plan.md> <env> <state> [--pr N] [--sha S]
//   node wm.mjs log <plan.md> --text <message> [--at "YYYY-MM-DD HH:MM"]
//   node wm.mjs validate <plan.md...>
//
// Them --dry-run vao bat ky lenh ghi nao de xem ket qua ma khong ghi.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ENV_NAMES = ['main', 'develop', 'staging', 'prod'];
export const ENV_STATES = ['none', 'cherry-picked', 'merged', 'verified', 'failed'];
export const STATUSES = ['pending', 'in-progress', 'in-review', 'completed', 'cancelled'];
export const ROUTINGS = ['ready-for-agent', 'ready-for-human', 'needs-info', 'needs-triage', 'wontfix'];
export const REQUIRED_KEYS = ['id', 'title', 'status', 'priority', 'created'];
export const LOCATOR_KEYS = ['project', 'repo', 'branch'];

// '# Nhat ky' nhung co dau. Viet bang escape de nguon giu duoc ASCII.
const LOG_HEADER = '# Nh\u1eadt k\u00fd';
const DOT = '\u00b7'; // dau cham giua trong dong log

// ---------------------------------------------------------------- doc file

export function parseDoc(text) {
  const hasBOM = text.charCodeAt(0) === 0xfeff;
  const bare = hasBOM ? text.slice(1) : text;
  const eol = bare.includes('\r\n') ? '\r\n' : '\n';
  const lines = bare.split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  let fmEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { fmEnd = i; break; }
  }
  if (fmEnd < 0) return null;
  return { hasBOM, eol, lines, fmStart: 1, fmEnd };
}

export function renderDoc(doc) {
  return doc.lines.join(doc.eol);
}

// Vung dong cua tung khoa o cot 0. end la exclusive.
export function keyMap(doc) {
  const map = new Map();
  let i = doc.fmStart;
  while (i < doc.fmEnd) {
    const line = doc.lines[i];
    if (line.trim() === '') { i++; continue; }
    const m = /^([A-Za-z_][A-Za-z0-9_]*):/.exec(line);
    if (!m) { i++; continue; }
    let j = i + 1;
    while (j < doc.fmEnd && /^\s+\S/.test(doc.lines[j])) j++;
    if (!map.has(m[1])) map.set(m[1], { start: i, end: j });
    i = j;
  }
  return map;
}

// ------------------------------------------------------------- doc YAML con

function splitTop(s) {
  const parts = [];
  let depth = 0, quote = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; cur += c; continue; }
    if (c === '{' || c === '[') depth++;
    if (c === '}' || c === ']') depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim() !== '') parts.push(cur);
  return parts;
}

export function parseScalar(raw) {
  const t = (raw ?? '').trim();
  if (t === '') return null;
  if (t.startsWith("'") && t.endsWith("'") && t.length >= 2) {
    return t.slice(1, -1).replace(/''/g, "'");
  }
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\(.)/g, '$1');
  }
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim();
    return inner === '' ? [] : splitTop(inner).map(parseScalar);
  }
  if (t.startsWith('{') && t.endsWith('}')) {
    const o = {};
    for (const part of splitTop(t.slice(1, -1))) {
      const k = part.indexOf(':');
      if (k > 0) o[part.slice(0, k).trim()] = parseScalar(part.slice(k + 1));
    }
    return o;
  }
  if (t === 'null' || t === '~') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  return t;
}

function parseBlock(lines, start, end) {
  if (/^\s+- /.test(lines[start])) {
    const out = [];
    let cur = null;
    for (let i = start; i < end; i++) {
      const li = /^\s+- ([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(lines[i]);
      if (li) { cur = { [li[1]]: parseScalar(li[2]) }; out.push(cur); continue; }
      const ci = /^\s+([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(lines[i]);
      if (ci && cur) cur[ci[1]] = parseScalar(ci[2]);
    }
    return out;
  }
  const o = {};
  for (let i = start; i < end; i++) {
    const m = /^\s+([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(lines[i]);
    if (m) o[m[1]] = parseScalar(m[2]);
  }
  return o;
}

export function readFrontmatter(doc) {
  const out = {};
  const map = keyMap(doc);
  for (const [key, { start, end }] of map) {
    const rest = doc.lines[start].slice(key.length + 1);
    out[key] = rest.trim() === '' ? parseBlock(doc.lines, start + 1, end) : parseScalar(rest);
  }
  return out;
}

// ------------------------------------------------------------ ghi YAML

const BARE_OK = /^[A-Za-z0-9_][A-Za-z0-9_./@+-]*$/;
const RESERVED = new Set(['true', 'false', 'null', 'yes', 'no', 'on', 'off', 'y', 'n', '~']);

// Nhay don la kieu DUY NHAT cua YAML khong co escape bang backslash: ben trong
// no chi co mot quy tac, '' la mot dau nhay don. Vi vay no an toan cho dau $,
// dau backtick, duong dan Windows, va tieng Viet -- dung bon thu da pha file.
export function fmtScalar(v) {
  const s = String(v);
  if (/[\r\n]/.test(s)) throw new Error('gia tri khong duoc chua xuong dong');
  if (BARE_OK.test(s) && !RESERVED.has(s.toLowerCase())) return s;
  return "'" + s.replace(/'/g, "''") + "'";
}

function splice(doc, start, end, replacement) {
  doc.lines.splice(start, end - start, ...replacement);
  const delta = replacement.length - (end - start);
  return delta;
}

export function setScalar(doc, key, value) {
  const map = keyMap(doc);
  const line = `${key}: ${fmtScalar(value)}`;
  if (map.has(key)) {
    const { start, end } = map.get(key);
    splice(doc, start, end, [line]);
    return { action: 'updated', line };
  }
  // Khoa moi: chen truoc `env:` neu co, vi env theo quy uoc nam cuoi.
  const at = map.has('env') ? map.get('env').start : doc.fmEnd;
  splice(doc, at, at, [line]);
  return { action: 'added', line };
}

export function deleteKey(doc, key) {
  const map = keyMap(doc);
  if (!map.has(key)) return { action: 'absent' };
  const { start, end } = map.get(key);
  splice(doc, start, end, []);
  return { action: 'deleted' };
}

// formats.md muc 2 luat 8: acceptance la danh sach {text, verify}, va verify
// phai la mot lenh chay duoc. Kiem truoc khi ghi, khong phai sau.
export function assertAcceptance(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('acceptance phai la mang khong rong');
  }
  items.forEach((it, n) => {
    const at = `acceptance[${n}]`;
    if (it === null || typeof it !== 'object' || Array.isArray(it)) {
      throw new Error(`${at} phai la object {text, verify}`);
    }
    for (const k of ['text', 'verify']) {
      if (typeof it[k] !== 'string' || it[k].trim() === '') {
        throw new Error(`${at} thieu "${k}" (formats.md muc 2 luat 8)`);
      }
    }
  });
}

export function setAcceptance(doc, items) {
  assertAcceptance(items);
  const block = ['acceptance:'];
  for (const it of items) {
    block.push(`  - text: ${fmtScalar(it.text)}`);
    block.push(`    verify: ${fmtScalar(it.verify)}`);
  }
  const map = keyMap(doc);
  if (map.has('acceptance')) {
    const { start, end } = map.get('acceptance');
    splice(doc, start, end, block);
    return { action: 'updated', items: items.length };
  }
  const at = map.has('env') ? map.get('env').start : doc.fmEnd;
  splice(doc, at, at, block);
  return { action: 'added', items: items.length };
}

export function setEnv(doc, name, state, { pr, sha } = {}) {
  if (!ENV_NAMES.includes(name)) {
    throw new Error(`env khong hop le: ${name} (dung: ${ENV_NAMES.join(', ')})`);
  }
  if (!ENV_STATES.includes(state)) {
    throw new Error(`state khong hop le: ${state} (dung: ${ENV_STATES.join(', ')})`);
  }
  const map = keyMap(doc);
  if (!map.has('env')) throw new Error('plan.md khong co khoi env: (formats.md muc 2 luat 2)');
  const { start, end } = map.get('env');
  let hit = -1;
  for (let i = start + 1; i < end; i++) {
    const m = /^\s+([A-Za-z_][A-Za-z0-9_]*):/.exec(doc.lines[i]);
    if (m && m[1] === name) { hit = i; break; }
  }
  if (hit < 0) throw new Error(`env thieu khoa ${name} (formats.md muc 2 luat 2)`);
  const parts = [`state: ${state}`];
  if (pr !== undefined && pr !== null) parts.push(`pr: ${pr}`);
  if (sha !== undefined && sha !== null) parts.push(`sha: ${fmtScalar(sha)}`);
  const line = `  ${name}: { ${parts.join(', ')} }`;
  doc.lines[hit] = line;
  return { action: 'updated', line };
}

// ------------------------------------------------------------------- log

export function appendLog(planPath, message, at) {
  const file = join(dirname(planPath), 'log.md');
  const when = at ?? nowStamp();
  const line = `- ${when} ${DOT} ${message}`;
  let text = existsSync(file) ? readFileSync(file, 'utf8') : `${LOG_HEADER}\n`;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  if (!text.endsWith('\n')) text += eol;
  text += line + eol;
  return { file, line, text };
}

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// -------------------------------------------------------------- validate

// Tra ve {fails, warns, topKeys}. Khong in, khong thoat -- de check-fm.mjs
// va lenh `validate` dung chung dung mot ban kiem tra.
export function validateFrontmatter(raw) {
  const fails = [];
  const warns = [];
  const F = (line, msg) => fails.push({ line, msg });
  const W = (line, msg) => warns.push({ line, msg });

  if (raw.charCodeAt(0) === 0xfeff) F(1, 'co BOM o dau file');
  const doc = parseDoc(raw);
  if (!doc) {
    const lines = raw.replace(/^\ufeff/, '').split(/\r?\n/);
    if (lines[0].trim() !== '---') F(1, 'dong dau khong phai ---');
    else F(1, 'thieu --- dong frontmatter');
    return { fails, warns, topKeys: [], doc: null };
  }
  const fm = doc.lines.slice(doc.fmStart, doc.fmEnd);
  const topKeys = [];
  const seen = new Set();

  let i = 0;
  while (i < fm.length) {
    const line = fm[i];
    const n = i + 2;
    if (line.trim() === '') { i++; continue; }
    if (line.includes('\t')) F(n, 'co ky tu TAB (YAML cam tab de thut le)');
    const m = /^([A-Za-z_][A-Za-z0-9_]*):(?: (.*))?$/.exec(line);
    if (!m) { F(n, `khong khop "key:" o cot 0 -> ${JSON.stringify(line)}`); i++; continue; }
    const [, key, rest] = m;
    if (seen.has(key)) F(n, `key trung lap: ${key}`);
    seen.add(key);
    topKeys.push(key);

    if (rest === undefined || rest === '') {
      const block = [];
      let j = i + 1;
      while (j < fm.length && /^\s+\S/.test(fm[j])) { block.push({ text: fm[j], num: j + 2 }); j++; }
      if (block.length === 0) {
        F(n, `${key}: khong co gia tri va khong co khoi long`);
        i = j;
        continue;
      }
      // List hay mapping? Quyet dinh bang DONG DAU, khong phai moi dong:
      // muc list co dong ke tiep thut le sau hon ("    verify:") nen every() la sai.
      const isList = /^\s+- /.test(block[0].text);
      if (isList) {
        for (const b of block) {
          if (/^\s+- /.test(b.text)) {
            if (!/^\s+- \S/.test(b.text)) F(b.num, 'muc list rong');
            else if (!/^\s+- [A-Za-z_][A-Za-z0-9_]*:/.test(b.text)) {
              F(b.num, `${key}: muc list khong phai "key: value" -> ${JSON.stringify(b.text)}`);
            }
          } else if (!/^\s+[A-Za-z_][A-Za-z0-9_]*: \S/.test(b.text)) {
            F(b.num, `${key}: dong long khong hop le -> ${JSON.stringify(b.text)}`);
          }
        }
        if (key === 'acceptance') {
          const items = [];
          let cur = null;
          for (const b of block) {
            if (/^\s+- /.test(b.text)) { cur = { num: b.num, keys: [], first: b.text }; items.push(cur); }
            if (!cur) continue;
            const km = /^\s+-?\s*([A-Za-z_][A-Za-z0-9_]*):/.exec(b.text);
            if (km) cur.keys.push(km[1]);
          }
          if (items.length === 0) F(n, 'acceptance: khong doc duoc muc nao');
          for (const it of items) {
            if (!it.keys.includes('text')) F(it.num, 'acceptance: muc thieu "text"');
            if (!it.keys.includes('verify')) {
              F(it.num, `acceptance: muc thieu "verify" (formats.md muc 2 luat 8) -> ${JSON.stringify(it.first)}`);
            }
          }
        }
      } else {
        for (const b of block) {
          if (!/^\s+[A-Za-z_][A-Za-z0-9_]*: \S/.test(b.text)) {
            F(b.num, `dong long khong hop le -> ${JSON.stringify(b.text)}`);
          }
        }
      }
      i = j;
      continue;
    }

    const dq = (rest.match(/"/g) || []).length;
    const sq = (rest.match(/'/g) || []).length;
    if (dq % 2 !== 0) F(n, `${key}: nhay kep le`);
    if (sq % 2 !== 0) F(n, `${key}: nhay don le`);
    if (key === 'acceptance') {
      F(n, 'acceptance: phai la list cua {text, verify}, khong phai scalar (formats.md muc 2 luat 8)');
    }
    if (/^\[.*\]$/.test(rest)) { i++; continue; }
    if (/^\{.*\}$/.test(rest)) {
      const inner = rest.slice(1, -1).trim();
      if (inner !== '' && !/^[A-Za-z_][A-Za-z0-9_]*: \S+(, [A-Za-z_][A-Za-z0-9_]*: \S+)*$/.test(inner)) {
        F(n, `${key}: flow mapping sai cu phap -> ${JSON.stringify(rest)}`);
      }
      i++;
      continue;
    }
    if (!/^["']/.test(rest)) {
      if (/: /.test(rest)) F(n, `${key}: gia tri chua ": " nhung khong boc nhay -> ${JSON.stringify(rest)}`);
      if (/^[!&*?|>%@`]/.test(rest)) F(n, `${key}: bat dau bang ky tu dac biet YAML -> ${JSON.stringify(rest)}`);
      if (/(^|\s)#/.test(rest)) F(n, `${key}: co " #" nhung khong boc nhay -> comment bi cat`);
    }
    i++;
  }

  for (const k of REQUIRED_KEYS) if (!seen.has(k)) F(1, `thieu key bat buoc: ${k}`);
  for (const k of LOCATOR_KEYS) {
    if (!seen.has(k)) W(1, `thieu truong dinh vi: ${k} (formats.md muc 2 luat 9)`);
  }
  if (seen.has('status')) {
    const v = parseScalar((/^status:(.*)$/m.exec(fm.join('\n')) ?? [])[1] ?? '');
    if (v !== null && !STATUSES.includes(v)) F(1, `status ngoai enum: ${v}`);
  }
  if (seen.has('routing')) {
    const v = parseScalar((/^routing:(.*)$/m.exec(fm.join('\n')) ?? [])[1] ?? '');
    if (v !== null && !ROUTINGS.includes(v)) F(1, `routing ngoai enum: ${v}`);
  }
  if (seen.has('env')) {
    const envBlock = fm.filter((l) => /^\s+(main|develop|staging|prod):/.test(l));
    const names = envBlock.map((l) => /^\s+(\w+):/.exec(l)[1]);
    for (const e of ENV_NAMES) if (!names.includes(e)) F(1, `env thieu khoa ${e}`);
    for (const l of envBlock) {
      const st = /state:\s*([\w-]+)/.exec(l);
      if (!st) { F(1, `env thieu state -> ${JSON.stringify(l)}`); continue; }
      if (!ENV_STATES.includes(st[1])) F(1, `env state ngoai enum: ${st[1]}`);
    }
  }
  return { fails, warns, topKeys, doc };
}

// ------------------------------------------------------------------- CLI

function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      if (k === 'dry-run' || k === 'delete') { flags[k] = true; continue; }
      flags[k] = argv[++i];
    } else pos.push(a);
  }
  return { flags, pos };
}

function loadPlan(file) {
  const raw = readFileSync(file, 'utf8');
  const doc = parseDoc(raw);
  if (!doc) throw new Error(`${file}: khong doc duoc frontmatter`);
  return { raw, doc };
}

function commit(file, doc, raw, dryRun) {
  const out = renderDoc(doc);
  if (out === raw.replace(/^\ufeff/, '')) return 'khong doi';
  if (dryRun) return 'DRY-RUN, khong ghi';
  writeFileSync(file, out, 'utf8'); // utf8 khong BOM, dung nhu validator doi
  return 'da ghi';
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv.shift();
  const { flags, pos } = parseArgs(argv);

  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log('wm.mjs read|set|accept|env|log|validate -- xem dau file de biet cu phap');
    process.exit(cmd ? 0 : 1);
  }

  try {
    if (cmd === 'read') {
      const { doc } = loadPlan(pos[0]);
      console.log(JSON.stringify(readFrontmatter(doc), null, 2));
      return;
    }

    if (cmd === 'validate') {
      let failed = 0, warned = 0;
      for (const f of pos) {
        const r = validateFrontmatter(readFileSync(f, 'utf8'));
        console.log(`== ${f}`);
        for (const x of r.fails) { failed++; console.log(`  FAIL ${f}:${x.line} ${x.msg}`); }
        for (const x of r.warns) { warned++; console.log(`  warn ${f}:${x.line} ${x.msg}`); }
      }
      console.log(failed === 0 ? `\nRESULT: PASS (0 loi, ${warned} warn)` : `\nRESULT: ${failed} loi, ${warned} warn`);
      process.exit(failed === 0 ? 0 : 1);
    }

    if (cmd === 'set') {
      const [file, key] = pos;
      if (!file || !key) throw new Error('set can <plan.md> <key>');
      const { raw, doc } = loadPlan(file);
      if (!flags.delete && flags.text === undefined) {
        throw new Error('set can --text <value> hoac --delete');
      }
      const r = flags.delete ? deleteKey(doc, key) : setScalar(doc, key, flags.text);
      console.log(`${key}: ${r.action}${r.line ? ' -> ' + r.line : ''}`);
      console.log(commit(file, doc, raw, flags['dry-run']));
      return;
    }

    if (cmd === 'accept') {
      const [file] = pos;
      if (!file) throw new Error('accept can <plan.md>');
      if (!flags['json-file']) throw new Error('accept can --json-file <path>');
      const items = JSON.parse(readFileSync(flags['json-file'], 'utf8'));
      const { raw, doc } = loadPlan(file);
      const r = setAcceptance(doc, items);
      console.log(`acceptance: ${r.action} (${r.items} muc)`);
      console.log(commit(file, doc, raw, flags['dry-run']));
      return;
    }

    if (cmd === 'env') {
      const [file, name, state] = pos;
      if (!file || !name || !state) throw new Error('env can <plan.md> <env> <state>');
      const { raw, doc } = loadPlan(file);
      const r = setEnv(doc, name, state, { pr: flags.pr, sha: flags.sha });
      console.log(r.line);
      console.log(commit(file, doc, raw, flags['dry-run']));
      return;
    }

    if (cmd === 'log') {
      const [file] = pos;
      if (!file) throw new Error('log can <plan.md>');
      if (flags.text === undefined) throw new Error('log can --text <message>');
      const r = appendLog(file, flags.text, flags.at);
      if (flags['dry-run']) { console.log(`DRY-RUN ${r.file}:`); console.log(r.line); return; }
      writeFileSync(r.file, r.text, 'utf8');
      console.log(`${r.file}: ${r.line}`);
      return;
    }

    throw new Error(`lenh khong biet: ${cmd}`);
  } catch (e) {
    console.error(`wm loi: ${e.message}`);
    process.exit(1);
  }
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) main();
