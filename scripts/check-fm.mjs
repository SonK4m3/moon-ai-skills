// Kiem tra frontmatter plan.md theo dung tap con YAML ma formats.md muc 2 dung.
// Khong phai YAML parser tong quat: chi chap nhan scalar, list long nhau, flow mapping 1 dong.
//
// TOAN BO FILE NAY LA ASCII, CO Y. Comment va thong bao loi deu khong dau.
// Ly do: console Windows doi encoding theo codepage, va mot file ASCII khong bao gio
// hong vi ly do do. Giu nguyen quy uoc nay khi sua.
//
// Dung: node scripts/check-fm.mjs [file...]
//       node scripts/check-fm.mjs              -> tu quet plans/*/plan.md
//       node scripts/check-fm.mjs --staged     -> chi plan.md da stage (pre-commit hook)
//       node scripts/check-fm.mjs --base <ref> -> chi plan.md doi so voi <ref> (CI)
//
// --base khong resolve duoc thi exit 1, KHONG exit 0: mot guardrail im lang
// khong chay con te hon khong co guardrail nao.
//
// FAIL = sai cau truc YAML, hoac acceptance sai hop dong (formats.md muc 2 luat 8). exit 1.
// WARN = thieu truong dinh vi (luat 9). Khong anh huong exit code.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const PLAN_RE = /^plans\/[^/]+\/plan\.md$/;

function gitLines(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((s) => s.trim().replace(/\\/g, '/'))
      .filter(Boolean);
  } catch {
    return null;
  }
}

function onlyPlans(list) {
  return list.filter((p) => PLAN_RE.test(p) && existsSync(p));
}

function defaultTargets() {
  if (!existsSync('plans')) return [];
  return readdirSync('plans', { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join('plans', d.name, 'plan.md'))
    .filter((p) => existsSync(p));
}

const argv = process.argv.slice(2);
let files;
let scanned = 'all';

if (argv.includes('--staged')) {
  scanned = 'staged';
  const staged = gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  if (staged === null) { console.log('FAIL: khong chay duoc git diff --cached'); process.exit(1); }
  files = onlyPlans(staged);
} else if (argv.includes('--base')) {
  const ref = argv[argv.indexOf('--base') + 1];
  if (!ref) { console.log('FAIL: --base can mot ref'); process.exit(1); }
  scanned = `base ${ref}`;
  let changed = gitLines(['diff', '--name-only', '--diff-filter=ACMR', `${ref}...HEAD`]);
  if (changed === null) changed = gitLines(['diff', '--name-only', '--diff-filter=ACMR', ref, 'HEAD']);
  if (changed === null) {
    console.log(`FAIL: khong resolve duoc base '${ref}' -- guardrail khong chay duoc`);
    process.exit(1);
  }
  files = onlyPlans(changed);
} else {
  const named = argv.filter((a) => !a.startsWith('--'));
  scanned = named.length ? 'named' : 'all';
  files = named.length ? named : defaultTargets();
}

let failed = 0;
let warned = 0;

if (files.length === 0) {
  if (scanned === 'all') {
    console.log('khong tim thay plan.md nao (chay tu goc repo?)');
    process.exit(1);
  }
  console.log(`khong co plan.md nao thay doi (${scanned}) -- khong co gi de kiem`);
  process.exit(0);
}
console.log(`pham vi: ${scanned} -- ${files.length} file`);

function fail(file, line, msg) {
  failed++;
  console.log(`  FAIL ${file}:${line} ${msg}`);
}
function warn(file, line, msg) {
  warned++;
  console.log(`  warn ${file}:${line} ${msg}`);
}

// Kiem mot khoi list long nhau: "  - text: ..." + "    verify: ..."
// Tra ve danh sach muc, moi muc la { num, keys }.
function parseListItems(block) {
  const items = [];
  let cur = null;
  for (const b of block) {
    if (/^\s+- /.test(b.text)) {
      cur = { num: b.num, keys: [], firstLine: b.text };
      items.push(cur);
    }
    if (!cur) continue;
    const km = /^\s+-?\s*([A-Za-z_][A-Za-z0-9_]*):/.exec(b.text);
    if (km) cur.keys.push(km[1]);
  }
  return items;
}

for (const file of files) {
  console.log(`== ${file}`);
  const raw = readFileSync(file, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) fail(file, 1, 'co BOM o dau file');
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== '---') { fail(file, 1, 'dong dau khong phai ---'); continue; }
  const end = lines.indexOf('---', 1);
  if (end < 0) { fail(file, 1, 'thieu --- dong frontmatter'); continue; }
  const fm = lines.slice(1, end);

  const topKeys = [];
  const seen = new Set();
  let i = 0;
  while (i < fm.length) {
    const line = fm[i];
    const n = i + 2; // so dong that trong file
    if (line.trim() === '') { i++; continue; }
    if (line.includes('\t')) fail(file, n, 'co ky tu TAB (YAML cam tab de thut le)');
    const m = /^([A-Za-z_][A-Za-z0-9_]*):(?: (.*))?$/.exec(line);
    if (!m) { fail(file, n, `khong khop "key:" o cot 0 -> ${JSON.stringify(line)}`); i++; continue; }
    const [, key, rest] = m;
    if (seen.has(key)) fail(file, n, `key trung lap: ${key}`);
    seen.add(key);
    topKeys.push(key);

    if (rest === undefined || rest === '') {
      // khoi long: list "  - ..." hoac mapping "  main: {...}"
      const block = [];
      let j = i + 1;
      while (j < fm.length && /^\s+\S/.test(fm[j])) { block.push({ text: fm[j], num: j + 2 }); j++; }
      if (block.length === 0) {
        fail(file, n, `${key}: khong co gia tri va khong co khoi long`);
        i = j;
        continue;
      }
      // List hay mapping? Quyet dinh bang DONG DAU, khong phai moi dong:
      // muc list co dong ke tiep thut le sau hon ("    verify:") nen "every" la sai.
      const isList = /^\s+- /.test(block[0].text);
      if (isList) {
        for (const b of block) {
          if (/^\s+- /.test(b.text)) {
            if (!/^\s+- \S/.test(b.text)) fail(file, b.num, 'muc list rong');
            else if (!/^\s+- [A-Za-z_][A-Za-z0-9_]*:/.test(b.text)) {
              fail(file, b.num, `${key}: muc list khong phai "key: value" -> ${JSON.stringify(b.text)}`);
            }
          } else if (!/^\s+[A-Za-z_][A-Za-z0-9_]*: \S/.test(b.text)) {
            fail(file, b.num, `${key}: dong long khong hop le -> ${JSON.stringify(b.text)}`);
          }
        }
        if (key === 'acceptance') {
          // formats.md muc 2 luat 8: acceptance la list cua {text, verify}.
          // Thieu verify => khong duoc coi la ready-for-agent.
          const items = parseListItems(block);
          if (items.length === 0) fail(file, n, 'acceptance: khong doc duoc muc nao');
          for (const it of items) {
            if (!it.keys.includes('text')) fail(file, it.num, 'acceptance: muc thieu "text"');
            if (!it.keys.includes('verify')) {
              fail(file, it.num, `acceptance: muc thieu "verify" (formats.md muc 2 luat 8) -> ${JSON.stringify(it.firstLine)}`);
            }
          }
        }
      } else {
        for (const b of block) {
          if (!/^\s+[A-Za-z_][A-Za-z0-9_]*: \S/.test(b.text)) fail(file, b.num, `dong long khong hop le -> ${JSON.stringify(b.text)}`);
        }
      }
      i = j;
      continue;
    }

    // scalar 1 dong: kiem tra nhay can doi
    const dq = (rest.match(/"/g) || []).length;
    const sq = (rest.match(/'/g) || []).length;
    if (dq % 2 !== 0) fail(file, n, `${key}: nhay kep le`);
    if (sq % 2 !== 0) fail(file, n, `${key}: nhay don le`);
    if (key === 'acceptance') {
      fail(file, n, 'acceptance: phai la list cua {text, verify}, khong phai scalar (formats.md muc 2 luat 8)');
    }
    if (/^\[.*\]$/.test(rest)) { i++; continue; }
    if (/^\{.*\}$/.test(rest)) {
      const inner = rest.slice(1, -1).trim();
      if (inner !== '' && !/^[A-Za-z_][A-Za-z0-9_]*: \S+(, [A-Za-z_][A-Za-z0-9_]*: \S+)*$/.test(inner)) {
        fail(file, n, `${key}: flow mapping sai cu phap -> ${JSON.stringify(rest)}`);
      }
      i++;
      continue;
    }
    // scalar khong quote ma chua ": " hoac bat dau bang ky tu dac biet => rui ro
    if (!/^["']/.test(rest)) {
      if (/: /.test(rest)) fail(file, n, `${key}: gia tri chua ": " nhung khong boc nhay -> ${JSON.stringify(rest)}`);
      if (/^[!&*?|>%@`]/.test(rest)) fail(file, n, `${key}: bat dau bang ky tu dac biet YAML -> ${JSON.stringify(rest)}`);
      if (/(^|\s)#/.test(rest)) fail(file, n, `${key}: co " #" nhung khong boc nhay -> comment bi cat`);
    }
    i++;
  }

  // doi chieu voi hop dong
  const required = ['id', 'title', 'status', 'priority', 'created'];
  for (const k of required) if (!seen.has(k)) fail(file, 1, `thieu key bat buoc: ${k}`);
  for (const k of ['project', 'repo', 'branch']) {
    if (!seen.has(k)) warn(file, 1, `thieu truong dinh vi: ${k} (formats.md muc 2 luat 9)`);
  }
  if (seen.has('env')) {
    const envBlock = fm.filter((l) => /^\s+(main|develop|staging|prod):/.test(l));
    const names = envBlock.map((l) => /^\s+(\w+):/.exec(l)[1]);
    for (const e of ['main', 'develop', 'staging', 'prod']) {
      if (!names.includes(e)) fail(file, 1, `env thieu khoa ${e}`);
    }
    for (const l of envBlock) {
      const st = /state:\s*([\w-]+)/.exec(l);
      if (!st) { fail(file, 1, `env thieu state -> ${JSON.stringify(l)}`); continue; }
      if (!['none', 'cherry-picked', 'merged', 'verified', 'failed'].includes(st[1])) {
        fail(file, 1, `env state ngoai enum: ${st[1]}`);
      }
    }
  }
  console.log(`  parsed ok - ${topKeys.length} key: ${topKeys.join(', ')}`);
}

console.log(
  failed === 0
    ? `\nRESULT: PASS (0 loi, ${warned} warn, ${files.length} file)`
    : `\nRESULT: ${failed} loi, ${warned} warn, ${files.length} file`,
);
process.exit(failed === 0 ? 0 : 1);
