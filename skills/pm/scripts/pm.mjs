#!/usr/bin/env node
/**
 * pm — Agent PM · bước 1
 *
 * Quản lý work-item trên GitHub Issues cho một hoặc nhiều repo.
 * Bước 1 cài đặt: init (sinh worlds.yml) · setup (cài vào repo) · doctor (kiểm tra).
 *
 * Không phụ thuộc gói ngoài. Chỉ cần node + git + gh.
 * Quy ước: skills/pm/references/conventions.md
 * Lý do thiết kế: docs/agent-pm/DESIGN.md
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));       // skills/pm/scripts
const SKILL_DIR = path.resolve(HERE, '..');                     // skills/pm
const FRAMEWORK_ROOT = path.resolve(SKILL_DIR, '..', '..');     // gốc moon-ai-skills
const TEMPLATES = path.join(SKILL_DIR, 'templates');
const PM_HOME = process.env.PM_HOME || path.join(os.homedir(), '.pm');
const WORLDS_PATH = path.join(PM_HOME, 'worlds.yml');

const WORK_ITEM_STATUS = ['pending', 'in-progress', 'in-review', 'completed', 'cancelled'];
const ROUTING = ['ready-for-agent', 'ready-for-human', 'needs-info', 'needs-triage', 'wontfix'];
const ENV_STATES = ['none', 'cherry-picked', 'merged', 'verified', 'failed'];
const ENV_KEYS = ['main', 'develop', 'staging', 'prod'];
const PROFILES = ['cherry-pick-4-env', 'github-flow'];

// ─────────────────────────────────────────────────────────── tiện ích

const toPosix = (p) => String(p).replace(/\\/g, '/');
const rel = (p) => path.relative(FRAMEWORK_ROOT, p) || '.';

// DSH (và một số sandbox khác) chặn child_process dùng stdio kiểu pipe → EPERM.
// Nên thu output qua file tạm thay vì qua pipe. Xem diagnose-windows-sandbox-acl.
let TMP_DIR = null;
function tmpDir() {
  if (TMP_DIR) return TMP_DIR;
  const candidates = [
    process.env.PM_TMP,
    path.join(os.tmpdir(), 'pm-run'),
    path.join(FRAMEWORK_ROOT, '.pm-tmp'),
    path.join(process.cwd(), '.pm-tmp'),
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      fs.mkdirSync(c, { recursive: true });
      fs.accessSync(c, fs.constants.W_OK);
      TMP_DIR = c;
      return c;
    } catch { /* thử chỗ kế tiếp */ }
  }
  throw new Error('không tìm được thư mục tạm ghi được — đặt biến PM_TMP=<đường-dẫn>');
}

let runSeq = 0;
function run(cmd, args, cwd) {
  let file, fd;
  try { file = path.join(tmpDir(), `${process.pid}-${++runSeq}.out`); }
  catch (e) { return { ok: false, err: e.message }; }
  try {
    fd = fs.openSync(file, 'w');
    execFileSync(cmd, args, { cwd, stdio: ['ignore', fd, fd], windowsHide: true });
    return { ok: true, out: fs.readFileSync(file, 'utf8').trim() };
  } catch (e) {
    let txt = '';
    try { txt = fs.readFileSync(file, 'utf8').trim(); } catch { /* chưa ghi được gì */ }
    if (e.code === 'ENOENT' || /ENOENT/.test(String(e.message))) {
      return { ok: false, err: `không tìm thấy lệnh "${cmd}"` };
    }
    return { ok: false, out: txt, err: txt || String(e.message).split('\n')[0] };
  } finally {
    try { if (fd !== undefined) fs.closeSync(fd); } catch { /* đã đóng */ }
    try { fs.rmSync(file, { force: true }); } catch { /* không quan trọng */ }
  }
}
const git = (repo, ...args) => run('git', ['-C', repo, ...args]);
const gh = (...args) => run('gh', args);

// ─────────────────────────────────────────────────── parser YAML tối giản
// Hỗ trợ đúng tập con mà pm dùng: map lồng theo thụt lề, list "- item",
// list của map ("- key: value"), inline [a, b] và {k: v}, chuỗi có/không nháy,
// bool/số/null, và comment "#". Không hỗ trợ anchor, block scalar, đa tài liệu.
// Dòng không hiểu được sẽ báo lỗi kèm số dòng, để không âm thầm đọc sai.

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function splitKeyValue(text) {
  let q = null, depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ':' && depth === 0 && (i + 1 === text.length || text[i + 1] === ' ')) {
      return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
    }
  }
  return null;
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v === '' || v === '~' || v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d+\.\d+$/.test(v)) return Number(v);
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
    return v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) return v.slice(1, -1).replace(/''/g, "'");
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return splitTop(inner).map(parseScalar);
  }
  if (v.startsWith('{') && v.endsWith('}')) {
    const inner = v.slice(1, -1).trim();
    const obj = {};
    if (!inner) return obj;
    for (const part of splitTop(inner)) {
      const kv = splitKeyValue(part);
      if (kv) obj[kv[0]] = parseScalar(kv[1]);
    }
    return obj;
  }
  return v;
}

function splitTop(text) {
  const parts = []; let q = null, depth = 0, cur = '';
  for (const c of text) {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function parseYaml(text) {
  const rows = [];
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((line, n) => {
    const clean = stripComment(line);
    if (!clean.trim() || clean.trim() === '---') return;
    rows.push({ indent: clean.match(/^ */)[0].length, text: clean.trim(), line: n + 1 });
  });
  let i = 0;
  const boom = (msg, ln) => { throw new Error(`dòng ${ln}: ${msg}`); };

  function parseBlock() { return rows[i].text.startsWith('-') ? parseList(rows[i].indent) : parseMap(rows[i].indent); }

  function parseList(indent) {
    const arr = [];
    while (i < rows.length && rows[i].indent === indent && rows[i].text.startsWith('-')) {
      const cur = rows[i];
      const rest = cur.text === '-' ? '' : cur.text.slice(1).trim();
      i++;
      if (rest === '') { arr.push(rows[i] && rows[i].indent > indent ? parseBlock() : null); continue; }
      const kv = splitKeyValue(rest);
      if (kv) {
        const map = {};
        map[kv[0]] = kv[1] === '' ? (rows[i] && rows[i].indent > indent ? parseBlock() : null) : parseScalar(kv[1]);
        if (rows[i] && rows[i].indent > indent && !rows[i].text.startsWith('-')) Object.assign(map, parseMap(rows[i].indent));
        arr.push(map);
      } else arr.push(parseScalar(rest));
    }
    return arr;
  }

  function parseMap(indent) {
    const obj = {};
    while (i < rows.length && rows[i].indent === indent && !rows[i].text.startsWith('-')) {
      const cur = rows[i];
      const kv = splitKeyValue(cur.text);
      if (!kv) boom(`không đọc được, cần dạng "key: value"`, cur.line);
      i++;
      if (kv[1] === '') obj[kv[0]] = rows[i] && rows[i].indent > indent ? parseBlock() : null;
      else obj[kv[0]] = parseScalar(kv[1]);
    }
    return obj;
  }

  const result = rows.length ? parseBlock() : {};
  if (i < rows.length) boom('thụt lề không nhất quán', rows[i].line);
  return result;
}

function readYaml(file) { return parseYaml(fs.readFileSync(file, 'utf8')); }

function readFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  return parseYaml(text.slice(3, end));
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

// ─────────────────────────────────────────────────────────── remote git

function parseRemote(url) {
  const u = String(url).trim();
  // Dạng ssh: [user@]host:org/repo.git  — host có dấu chấm là tên miền thật,
  // không dấu chấm là SSH alias trong ~/.ssh/config (ví dụ github-work-account).
  let m = u.match(/^(?:([A-Za-z0-9._-]+)@)?([A-Za-z0-9._-]+):([^/]+)\/(.+?)(?:\.git)?$/);
  if (m) {
    const host = m[2];
    return { alias: host.includes('.') ? null : host, full: `${m[3]}/${m[4].replace(/\.git$/, '')}` };
  }
  m = u.match(/^(?:https?|git):\/\/(?:[^@/]+@)?([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (m) return { alias: null, full: `${m[2]}/${m[3].replace(/\.git$/, '')}` };
  return { alias: null, full: null };
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'out', 'coverage', '.venv', 'venv', 'vendor', 'AppData', 'obj', 'bin']);

function findGitRepos(root, maxDepth = 2) {
  const found = [];
  const unreadable = [];
  const walk = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (e) { unreadable.push(`${toPosix(dir)} (${e.code || e.message})`); return; }
    if (entries.some((e) => e.isDirectory() && e.name === '.git')) { found.push(dir); return; }
    if (depth >= maxDepth) return;
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), depth + 1);
    }
  };
  walk(path.resolve(root), 0);
  return { repos: found.sort(), unreadable };
}

function repoWorkItemsDir(repoPath, config) {
  return path.join(repoPath, config?.work_items_dir || 'plans');
}

// ─────────────────────────────────────────────────────────── thu thập kết quả

let NO_NET = false;

const R = [];
const add = (level, scope, msg, fix) => R.push({ level, scope, msg, ...(fix ? { fix } : {}) });
const ok = (s, m) => add('ok', s, m);
const warn = (s, m, fix) => add('warn', s, m, fix);
const fail = (s, m, fix) => add('fail', s, m, fix);

// ─────────────────────────────────────────────────────────── doctor

function cmdDoctor(args) {
  const opts = parseArgs(args);
  const json = !!opts.flags.json;
  const doAll = !!opts.flags.all;
  const wantRepo = lastFlag(opts, 'repo');
  NO_NET = !!opts.flags['no-net'];

  R.length = 0;

  // ── 1. framework
  const S = 'framework';
  if (fs.existsSync(path.join(SKILL_DIR, 'SKILL.md'))) ok(S, 'skills/pm/SKILL.md');
  else fail(S, 'thiếu skills/pm/SKILL.md', 'file này bắt buộc để agent gọi được skill');
  for (const t of ['flow.yml', 'config.json', 'worlds.yml']) {
    if (fs.existsSync(path.join(TEMPLATES, t))) ok(S, `templates/${t}`);
    else fail(S, `thiếu templates/${t}`, 'chạy lại từ bản framework gốc');
  }
  for (const r of ['conventions.md', 'work-item.md', 'issue-format.md']) {
    if (fs.existsSync(path.join(SKILL_DIR, 'references', r))) ok(S, `references/${r}`);
    else fail(S, `thiếu references/${r}`);
  }

  // ── 2. worlds.yml
  const W = 'worlds';
  const RS = 'repo';
  let worlds = null;
  if (!fs.existsSync(WORLDS_PATH)) {
    fail(W, `chưa có ${toPosix(WORLDS_PATH)}`,
      `pm init --world work=${toPosix(path.dirname(FRAMEWORK_ROOT))} --world personal=<thư-mục> --account work=<gh-login>`);
  } else {
    try {
      worlds = readYaml(WORLDS_PATH);
      ok(W, `đọc được ${toPosix(WORLDS_PATH)} (version ${worlds.version ?? '?'})`);
    } catch (e) {
      fail(W, `worlds.yml lỗi cú pháp — ${e.message}`, 'sửa file rồi chạy lại');
    }
  }

  const repos = [];
  let remoteMatched = 0;
  let remoteChecked = 0;
  if (worlds?.worlds && typeof worlds.worlds === 'object') {
    const names = Object.keys(worlds.worlds);
    if (!names.length) fail(W, 'worlds.yml không có world nào');
    for (const name of names) {
      const w = worlds.worlds[name] || {};
      const sc = `world:${name}`;
      if (!w.root) fail(sc, 'thiếu "root"');
      else if (!fs.existsSync(w.root)) fail(sc, `root không tồn tại: ${w.root}`);
      else ok(sc, `root ${w.root}`);
      if (!w.gh_account) warn(sc, 'chưa khai báo gh_account', 'không biết dùng tài khoản GitHub nào cho vùng này');
      if (!w.ssh_alias) warn(sc, 'chưa khai báo ssh_alias');
      if (!Array.isArray(w.repos) || !w.repos.length) { warn(sc, 'không có repo nào'); continue; }
      for (const r of w.repos) {
        if (!r?.name || !r?.path) { warn(sc, 'một mục repo thiếu "name" hoặc "path"'); continue; }
        const p = path.resolve(r.path);
        repos.push({ world: name, ...r, path: p });
        if (!fs.existsSync(p)) { fail(RS, `${r.name} — thư mục không tồn tại: ${toPosix(p)}`); continue; }
        const rem = git(p, 'remote', 'get-url', 'origin');
        if (!rem.ok) { warn(RS, `${r.name} — không đọc được remote origin (${rem.err})`); continue; }
        const parsed = parseRemote(rem.out);
        remoteChecked++;
        if (!parsed.full) { warn(RS, `${r.name} — remote lạ: ${rem.out}`); continue; }
        if (parsed.full.toLowerCase() !== String(r.name).toLowerCase()) {
          warn(RS, `${r.name} — remote thật là ${parsed.full}`, 'sửa worlds.yml cho khớp');
          continue;
        }
        remoteMatched++;
        if (r.ssh_alias && parsed.alias && r.ssh_alias !== parsed.alias) {
          warn(RS, `${r.name} — ssh_alias lệch: worlds.yml=${r.ssh_alias}, remote=${parsed.alias}`);
        }
      }
    }
    if (remoteChecked) {
      if (remoteMatched === remoteChecked) ok(RS, `${remoteMatched}/${remoteChecked} repo khớp remote trong worlds.yml`);
      else ok(RS, `${remoteMatched}/${remoteChecked} repo khớp remote trong worlds.yml (phần còn lại xem cảnh báo bên dưới)`);
    }
  }

  // ── 3. gh
  const G = 'gh';
  const ghv = gh('--version');
  if (!ghv.ok) fail(G, `không gọi được gh — ${ghv.err}`, 'cài GitHub CLI rồi đăng nhập');
  else {
    const st = gh('auth', 'status');
    const active = (st.ok ? st.out : st.err).match(/account\s+(\S+)/i)?.[1] || null;
    const accounts = [...(st.ok ? st.out : st.err).matchAll(/account\s+(\S+)/gi)].map((m) => m[1]);
    if (!active) fail(G, 'chưa đăng nhập gh', 'gh auth login');
    else {
      ok(G, `đang đăng nhập: ${active}`);
      const declared = [...new Set(Object.values(worlds?.worlds || {}).map((w) => w?.gh_account).filter(Boolean))];
      for (const a of declared) {
        if (accounts.includes(a)) ok(G, `world dùng ${a} — có sẵn`);
        else warn(G, `world khai báo tài khoản "${a}" nhưng gh chưa đăng nhập tài khoản đó`,
          `gh auth login  (vùng đó sẽ không đọc được Issue cho tới khi đăng nhập)`);
      }
      if (accounts.length > 1) ok(G, `có ${accounts.length} tài khoản: ${accounts.join(', ')}`);
    }
  }

  // ── 4 + 5. repo và work-item
  let targets = [];
  if (wantRepo) targets = [{ path: path.resolve(wantRepo) }];
  else if (doAll) targets = repos.map((r) => ({ path: r.path, label: r.name, bulk: true }));
  else {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, '.pm'))) targets = [{ path: cwd }];
  }
  const summaries = [];
  for (const t of targets) summaries.push(inspectRepo(t.path, t.label, !!t.bulk));

  render(R, json, summaries);
  return R.some((r) => r.level === 'fail') ? 1 : 0;
}

function inspectRepo(repoPath, label = toPosix(repoPath), bulk = false) {
  const summary = { repo: label, path: toPosix(repoPath), installed: false, workItems: 0, byStatus: {}, envOpen: {} };

  const pmDir = path.join(repoPath, '.pm');
  if (!fs.existsSync(pmDir)) {
    if (!bulk) warn(label, 'chưa cài pm vào repo này', `pm setup --repo "${toPosix(repoPath)}"`);
    return summary;
  }
  summary.installed = true;

  let config = null;
  const cfgPath = path.join(pmDir, 'config.json');
  if (!fs.existsSync(cfgPath)) fail(label, 'thiếu .pm/config.json', 'pm setup --repo ... --force');
  else {
    try {
      config = readJson(cfgPath);
      ok(label, '.pm/config.json đọc được');
      const rem = git(repoPath, 'remote', 'get-url', 'origin');
      const parsed = rem.ok ? parseRemote(rem.out) : { full: null };
      if (config.repo && parsed.full && config.repo.toLowerCase() !== parsed.full.toLowerCase()) {
        warn(label, `config.repo=${config.repo} nhưng remote=${parsed.full}`, 'sửa .pm/config.json');
      }
    } catch (e) { fail(label, `.pm/config.json lỗi — ${e.message}`); }
  }

  const flowPath = path.join(pmDir, 'flow.yml');
  if (!fs.existsSync(flowPath)) fail(label, 'thiếu .pm/flow.yml', 'pm setup --repo ... --force');
  else {
    try {
      const flow = readYaml(flowPath);
      ok(label, '.pm/flow.yml đọc được');
      if (!PROFILES.includes(flow.profile)) fail(label, `flow.profile="${flow.profile}" không hợp lệ`, `chọn: ${PROFILES.join(' | ')}`);
      else ok(label, `flow.profile=${flow.profile}`);
      if (!flow.source_branch) fail(label, 'flow thiếu source_branch');
      if (!flow.pr_target && !flow.source_branch) warn(label, 'flow thiếu pr_target');
      if (flow.profile === 'cherry-pick-4-env' && !(flow.env_branches || []).length) {
        fail(label, 'profile cherry-pick-4-env nhưng env_branches rỗng');
      }
      if (flow.profile === 'cherry-pick-4-env') {
        for (const e of ENV_KEYS.slice(1)) {
          if (!(flow.env_branches || []).includes(e)) warn(label, `env_branches thiếu "${e}"`);
        }
      }
      if (!(flow.branch_types || []).length) fail(label, 'flow thiếu branch_types');
      if (flow.prod_policy === 'merge-from-main' && !(flow.env_branches || []).includes('prod')) {
        warn(label, 'prod_policy=merge-from-main nhưng env_branches không có prod');
      }
    } catch (e) { fail(label, `.pm/flow.yml lỗi — ${e.message}`); }
  }

  // Quyền ghi + nhãn trên GitHub. Chỉ chạy khi soi MỘT repo cụ thể (tốn mạng).
  // Bài học từ lần test thật: tài khoản gh không có quyền ghi vẫn TẠO ĐƯỢC Issue trên
  // repo công khai, nhưng không tạo được nhãn và không gán được assignee — nên nếu chỉ
  // thử tạo Issue thì tưởng mọi thứ ổn.
  if (!bulk && !NO_NET && config?.repo) {
    let canPush = null;
    const perm = gh('api', `repos/${config.repo}`, '--jq', '.permissions.push');
    if (perm.ok) canPush = perm.out.trim() === 'true';
    else warn(label, `không đọc được quyền trên ${config.repo}`, ghHint(perm.err) || null);

    const wantLabels = Object.values(config.labels || {});
    const listed = gh('label', 'list', '--repo', config.repo, '--limit', '100', '--json', 'name');
    if (!listed.ok) {
      warn(label, `không đọc được nhãn của ${config.repo}`, ghHint(listed.err) || null);
    } else {
      let have = new Set();
      try { have = new Set(JSON.parse(listed.out).map((x) => x.name)); } catch { have = new Set(toLines(listed.out)); }
      const missing = wantLabels.filter((n) => !have.has(n));
      if (!missing.length) ok(label, `đủ ${wantLabels.length} nhãn pm trên GitHub`);
      else if (canPush === false) {
        fail(label, `thiếu ${missing.length}/${wantLabels.length} nhãn pm, và tài khoản gh không có quyền ghi lên ${config.repo}`,
          'gh auth switch -u <tài khoản có quyền> rồi pm sync (nó tạo nhãn). Hiện chỉ tạo được Issue — không gán được nhãn hay assignee.');
      } else {
        warn(label, `thiếu ${missing.length} nhãn pm trên GitHub: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ' …' : ''}`,
          `pm sync (tự tạo), hoặc: gh label create "${missing[0]}" --repo ${config.repo}`);
      }
    }
  }

  const itemsDir = repoWorkItemsDir(repoPath, config);
  if (!fs.existsSync(itemsDir)) {
    warn(label, `chưa có thư mục ${path.basename(itemsDir)}/`, 'sẽ được tạo ở lần pm intake đầu tiên');
    return summary;
  }

  const entries = fs.readdirSync(itemsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  let legacy = 0, schema = 0;
  for (const e of entries) {
    const dir = path.join(itemsDir, e.name);
    const planFile = path.join(dir, 'plan.md');
    if (!fs.existsSync(planFile)) {
      const inner = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
      if (inner.length) legacy++;
      else warn(label, `${e.name}/ không có plan.md`);
      continue;
    }
    let fm;
    try { fm = readFrontmatter(planFile); } catch (err) { fail(label, `${e.name}/plan.md frontmatter lỗi — ${err.message}`); continue; }
    if (!fm || !fm.id) { legacy++; continue; }

    schema++;
    summary.workItems++;
    summary.byStatus[fm.status] = (summary.byStatus[fm.status] || 0) + 1;

    const where = `${e.name}`;
    if (!WORK_ITEM_STATUS.includes(fm.status)) fail(label, `${where}: status="${fm.status}" không hợp lệ`, WORK_ITEM_STATUS.join(' | '));
    if (fm.routing && !ROUTING.includes(fm.routing)) fail(label, `${where}: routing="${fm.routing}" không hợp lệ`, ROUTING.join(' | '));
    if (!fm.title) fail(label, `${where}: thiếu title`);

    const dirMatch = e.name.match(/^(\d{6})-(\d+)-(.+)$/);
    const idNum = String(fm.id).replace(/^\D+/, '');
    if (!dirMatch) warn(label, `${where}: tên thư mục không theo <YYMMDD>-<số>-<slug>`);
    else if (dirMatch[2] !== idNum) fail(label, `${where}: id=${fm.id} nhưng thư mục ghi số ${dirMatch[2]}`);

    const env = fm.env || {};
    for (const k of ENV_KEYS) {
      const cell = env[k];
      const state = cell && typeof cell === 'object' ? cell.state : cell;
      if (state == null) continue;
      if (!ENV_STATES.includes(state)) fail(label, `${where}: env.${k}.state="${state}" không hợp lệ`, ENV_STATES.join(' | '));
      else if (state !== 'none') summary.envOpen[k] = (summary.envOpen[k] || 0) + 1;
    }

    if ((fm.status === 'in-progress' || fm.status === 'in-review') && !fm.claimed_by) {
      fail(label, `${where}: status=${fm.status} nhưng chưa có claimed_by`, 'claim chưa hoàn tất — chạy pm claim');
    }
    if (fm.claimed_by && fm.status === 'in-progress') {
      const handoffs = fs.readdirSync(dir).filter((f) => /^handoff-.*\.md$/.test(f));
      const ageDays = (Date.now() - fs.statSync(planFile).mtimeMs) / 86400000;
      if (!handoffs.length && ageDays > 3) {
        warn(label, `${where}: claim đã ${Math.floor(ageDays)} ngày, chưa có handoff`, 'pm handoff <id>');
      }
      if (fm.branch) {
        const b = git(repoPath, 'rev-parse', '--verify', '--quiet', `refs/heads/${fm.branch}`);
        const bRemote = b.ok ? b : git(repoPath, 'ls-remote', '--heads', 'origin', fm.branch);
        if (!bRemote.ok) warn(label, `${where}: nhánh "${fm.branch}" không thấy ở local lẫn origin`);
      }
    }
    if (fm.sync_pending) warn(label, `${where}: sync_pending=true`, 'pm sync để đẩy lên GitHub');
  }

  if (legacy) ok(label, `${legacy} plan cũ không theo schema pm (bỏ qua, không chặn)`);
  if (schema) ok(label, `${schema} work-item theo schema pm`);
  return summary;
}

// ─────────────────────────────────────────────────────────── init

function cmdInit(args) {
  const opts = parseArgs(args);
  const out = lastFlag(opts, 'out') || WORLDS_PATH;
  const force = !!opts.flags.force;
  const depth = Number(lastFlag(opts, 'depth') || 2);
  const worldSpecs = opts.flags.world || [];
  if (!worldSpecs.length) {
    console.error('Cần ít nhất một --world <tên>=<thư-mục-gốc>');
    console.error('Ví dụ: pm init --world work=<thư-mục-công-việc> --world personal=<thư-mục-cá-nhân>');
    return 2;
  }
  const accounts = {};
  for (const a of opts.flags.account || []) { const [k, v] = String(a).split('='); accounts[k] = v; }

  if (fs.existsSync(out) && !force) {
    console.error(`Đã có ${toPosix(out)} — dùng --force để ghi đè.`);
    return 2;
  }

  const blocks = [];
  let total = 0;
  for (const spec of worldSpecs) {
    const eq = String(spec).indexOf('=');
    if (eq === -1) { console.error(`--world "${spec}" phải có dạng <tên>=<thư-mục>`); return 2; }
    const name = String(spec).slice(0, eq).trim();
    const root = String(spec).slice(eq + 1).trim();
    if (!fs.existsSync(root)) { console.error(`Thư mục gốc không tồn tại: ${root}`); return 2; }

    const { repos: dirs, unreadable } = findGitRepos(root, depth);
    if (unreadable.length) {
      console.warn(`  ! ${unreadable.length} thư mục không đọc được: ${unreadable.slice(0, 3).join(', ')}${unreadable.length > 3 ? ' …' : ''}`);
    }
    const rows = [];
    const aliasCount = {};
    const noRemote = [];
    for (const d of dirs) {
      const rem = git(d, 'remote', 'get-url', 'origin');
      if (!rem.ok || !rem.out) { noRemote.push(`${toPosix(d)}${rem.err ? ` (${rem.err.split('\n')[0]})` : ''}`); continue; }
      const { alias, full } = parseRemote(rem.out);
      if (!full) { noRemote.push(`${toPosix(d)} (remote lạ: ${rem.out})`); continue; }
      if (alias) aliasCount[alias] = (aliasCount[alias] || 0) + 1;
      rows.push({ name: full, path: toPosix(d), alias });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const worldAlias = Object.entries(aliasCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    total += rows.length;

    const lines = [];
    lines.push(`  ${name}:`);
    lines.push(`    root: ${toPosix(path.resolve(root))}`);
    lines.push(`    gh_account: ${accounts[name] || ''}`);
    lines.push(`    ssh_alias: ${worldAlias}`);
    lines.push('    repos:');
    for (const r of rows) {
      lines.push(`      - name: ${r.name}`);
      lines.push(`        path: ${r.path}`);
      lines.push(`        ssh_alias: ${r.alias || ''}`);
    }
    if (!rows.length) lines.push('      []');
    blocks.push(lines.join('\n'));
    console.log(`  ${name}: ${dirs.length} git repo tìm thấy, ${rows.length} có remote origin (alias: ${worldAlias || 'không có'})`);
    if (noRemote.length) {
      console.log(`    bỏ qua ${noRemote.length}: ${noRemote.slice(0, 4).join(' · ')}${noRemote.length > 4 ? ' …' : ''}`);
    }
  }

  const text = [
    '# ~/.pm/worlds.yml — cấu hình cấp MÁY. Không commit. Sinh bởi: pm init',
    `# Sinh lúc: ${new Date().toISOString()}`,
    '',
    'version: 1',
    '',
    'worlds:',
    ...blocks,
    '',
    'notify:',
    '  google_chat_webhook: ""',
    '',
  ].join('\n');

  try {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text, 'utf8');
  } catch (e) {
    console.error(`Không ghi được ${toPosix(out)} — ${e.message}`);
    console.error('Thử: pm init ... --out <đường-dẫn-trong-workspace>');
    return 1;
  }
  console.log(`\nĐã ghi ${toPosix(out)} — ${total} repo.`);
  console.log('Bước tiếp: pm doctor');
  return 0;
}

// ─────────────────────────────────────────────────────────── setup

function cmdSetup(args) {
  const opts = parseArgs(args);
  const repoPath = path.resolve(lastFlag(opts, 'repo') || process.cwd());
  const force = !!opts.flags.force;
  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    console.error(`Không phải git repo: ${toPosix(repoPath)}`);
    return 2;
  }
  const pmDir = path.join(repoPath, '.pm');
  fs.mkdirSync(pmDir, { recursive: true });

  const rem = git(repoPath, 'remote', 'get-url', 'origin');
  const repoName = rem.ok ? parseRemote(rem.out).full : null;
  if (!repoName) console.warn('! Không đọc được remote origin — .pm/config.json sẽ để trống "repo"');

  const written = [];
  const targets = [
    { tpl: 'flow.yml', dest: path.join(pmDir, 'flow.yml'), transform: (s) => s },
    {
      tpl: 'config.json',
      dest: path.join(pmDir, 'config.json'),
      transform: (s) => s.replace('"repo": ""', `"repo": ${JSON.stringify(repoName || '')}`),
    },
  ];
  for (const { tpl, dest, transform } of targets) {
    if (fs.existsSync(dest) && !force) { console.log(`= giữ nguyên ${toPosix(path.relative(repoPath, dest))} (đã có)`); continue; }
    fs.writeFileSync(dest, transform(fs.readFileSync(path.join(TEMPLATES, tpl), 'utf8')), 'utf8');
    written.push(toPosix(path.relative(repoPath, dest)));
  }

  const pmBin = toPosix(path.join(SKILL_DIR, 'scripts', 'pm.mjs'));
  const itemsDir = path.join(repoPath, 'plans');

  if (!opts.flags['no-hooks']) {
    const merged = mergeClaudeHooks(repoPath, pmBin);
    console.log(merged ? '+ .claude/settings.json (thêm hook pm)' : '= giữ nguyên .claude/settings.json');

    const agentSrc = path.join(SKILL_DIR, 'agents', 'project-manager.md');
    if (fs.existsSync(agentSrc)) {
      const agentsDir = path.join(repoPath, '.claude', 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      const dest = path.join(agentsDir, 'pm.md');
      const next = fs.readFileSync(agentSrc, 'utf8');
      const before = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
      if (before === next) console.log('= giữ nguyên .claude/agents/pm.md');
      else { fs.writeFileSync(dest, next, 'utf8'); console.log(before ? '+ .claude/agents/pm.md (cập nhật)' : '+ .claude/agents/pm.md'); }
    }
  }

  // .pm/.hook-state.json là state của hook, không nên commit.
  const gi = path.join(repoPath, '.gitignore');
  const giLine = '.pm/.hook-state.json';
  const giText = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  if (!giText.split(/\r?\n/).includes(giLine)) {
    fs.writeFileSync(gi, `${giText.replace(/\s*$/, '')}\n${giLine}\n`, 'utf8');
    console.log(`+ .gitignore (${giLine})`);
  }

  if (!fs.existsSync(itemsDir)) { fs.mkdirSync(itemsDir, { recursive: true }); written.push('plans/'); }

  // Khối trỏ trong AGENTS.md — chỉ ghi bên trong marker, không đụng phần bạn tự viết.
  const block = [
    '<!-- pm:start -->',
    '## pm — quản lý work-item',
    '',
    'Repo này dùng `pm`. Quy ước đầy đủ: `skills/pm/references/conventions.md` trong moon-ai-skills.',
    '',
    '- Việc kế tiếp: `node "' + pmBin + '" next`',
    '- **Nhặt việc trước khi sửa code**: `... claim <id>`',
    '- Ghi tiến độ: `... note <id> "..."`',
    '- Hết phiên mà chưa xong: `... handoff <id>`',
    '- Kiểm tra lệch: `... doctor`',
    '',
    'Luật: claim trước khi code · không giành việc đã có assignee · handoff trước khi kết thúc ·',
    'trước PR là tự chủ, sau PR là của người · chỉ ghi trong marker `<!-- pm:… -->`.',
    '<!-- pm:end -->',
  ].join('\n');
  const agentsFile = path.join(repoPath, 'AGENTS.md');
  const agentsExisted = fs.existsSync(agentsFile);
  const hasBlock = agentsExisted && fs.readFileSync(agentsFile, 'utf8').includes('<!-- pm:start -->');
  if (hasBlock) {
    console.log('= giữ nguyên AGENTS.md (đã có khối pm)');
  } else {
    const head = agentsExisted ? `${fs.readFileSync(agentsFile, 'utf8').replace(/\s*$/, '')}\n\n` : '# AGENTS.md\n\n';
    fs.writeFileSync(agentsFile, `${head}${block}\n`, 'utf8');
    written.push(agentsExisted ? 'AGENTS.md (thêm khối pm)' : 'AGENTS.md (tạo mới)');
  }

  console.log(`\nĐã cài pm vào ${toPosix(repoPath)}`);
  for (const w of written) console.log(`  + ${w}`);
  console.log('\nBước tiếp:');
  console.log(`  pm doctor --repo "${toPosix(repoPath)}"`);
  console.log('  gh label create in-progress --color FBCA04 --description "Đã có session nhặt"');
  console.log('  gh label create in-review   --color 0E8A16 --description "PR đang mở, chờ review"');
  console.log('  gh label create blocked     --color B60205 --description "Đang chờ việc khác"');
  return 0;
}

// ─────────────────────────────────────────────────────────── nghiệp vụ

const LABEL_COLORS = {
  'needs-triage': 'ededed', 'needs-info': 'd4c5f9', 'ready-for-agent': '0e8a16',
  'ready-for-human': '1d76db', 'in-progress': 'fbca04', 'in-review': '5319e7',
  blocked: 'b60205', wontfix: 'ffffff',
};

function pad2(n) { return String(n).padStart(2, '0'); }
function stampYYMMDD(d = new Date()) { return `${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`; }
function stampISO(d = new Date()) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function stampFull(d = new Date()) { return `${stampISO(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

const SLUG_TAIL = new Set(['cho', 'va', 'o', 'tai', 'voi', 'cua', 'de', 'khi', 'trong', 'ngoai', 'tren', 'duoi', 'tu', 'den', 'bang', 'the', 'a', 'an', 'of', 'for', 'to', 'in', 'on', 'with', 'and']);

function slugify(text, maxWords = 5) {
  const words = String(text).replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim()
    .split(/\s+/).filter(Boolean).slice(0, maxWords);
  while (words.length > 1 && SLUG_TAIL.has(words[words.length - 1])) words.pop();
  return words.join('-').slice(0, 48) || 'work-item';
}

function defaultSession() {
  if (process.env.PM_SESSION) return process.env.PM_SESSION;
  const env = process.env;
  const harness = env.DSH_SESSION_ID || env.DSH_PROFILE ? 'dsh'
    : env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT ? 'claude'
      : env.CODEX_HOME || env.CODEX_SANDBOX ? 'codex'
        : env.OPENCODE ? 'opencode' : 'agent';
  const host = (os.hostname() || 'host').split('.')[0].toUpperCase();
  const tail = (env.PM_SESSION_TAIL || process.pid.toString(16).slice(-4)).padStart(4, '0');
  return `${harness}@${host}#${tail}`;
}

function toLines(out) { return String(out || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean); }

function fmtTable(headers, rows) {
  const flat = rows.map((r) => r.map((c) => (c === undefined || c === null ? '' : String(c))));
  const widths = headers.map((h, i) => Math.max(h.length, ...flat.map((r) => r[i].length), 1));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').replace(/\s+$/, '');
  return [line(headers), widths.map((w) => '─'.repeat(w)).join('  '), ...flat.map(line)].join('\n');
}

function renamedForIssue(dirName, issueNo) {
  const full = dirName.match(/^(\d{6})-(\d+)-(.*)$/);
  if (full) return `${full[1]}-${issueNo}-${full[3]}`;
  const legacy = dirName.match(/^(\d{6})-(.*)$/);
  if (legacy) return `${legacy[1]}-${issueNo}-${legacy[2]}`;
  return `${stampYYMMDD()}-${issueNo}-${slugify(dirName)}`;
}

function loadRepoCtx(repoPathArg) {
  const repoPath = path.resolve(repoPathArg || process.cwd());
  const pmDir = path.join(repoPath, '.pm');
  if (!fs.existsSync(pmDir)) {
    throw new Error(`chưa cài pm vào ${toPosix(repoPath)} — chạy: pm setup --repo "${toPosix(repoPath)}"`);
  }
  const configPath = path.join(pmDir, 'config.json');
  if (!fs.existsSync(configPath)) throw new Error(`thiếu ${toPosix(configPath)}`);
  const config = readJson(configPath);
  const flowPath = path.join(pmDir, 'flow.yml');
  const flow = fs.existsSync(flowPath) ? readYaml(flowPath) : {};
  const rem = git(repoPath, 'remote', 'get-url', 'origin');
  const remote = rem.ok ? parseRemote(rem.out).full : null;
  const itemsDir = path.join(repoPath, config.work_items_dir || 'plans');
  return { repoPath, pmDir, config, flow, remote, itemsDir };
}

function listWorkItems(ctx) {
  const out = [];
  if (!fs.existsSync(ctx.itemsDir)) return out;
  for (const e of fs.readdirSync(ctx.itemsDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = path.join(ctx.itemsDir, e.name);
    const file = path.join(dir, 'plan.md');
    if (!fs.existsSync(file)) continue;
    let fm = null;
    try { fm = readFrontmatter(file); } catch { /* frontmatter hỏng: doctor sẽ báo */ }
    if (!fm || !fm.id) continue;
    const id = String(fm.id);
    out.push({ dir, dirName: e.name, file, fm, id, num: id.replace(/^\D+/, ''), slug: e.name.replace(/^\d{6}-\d+-/, '') });
  }
  return out.sort((a, b) => Number(a.num) - Number(b.num));
}

function findItem(ctx, id) {
  const num = String(id).replace(/^\D+/, '');
  const hit = listWorkItems(ctx).find((i) => i.num === num);
  if (!hit) throw new Error(`không thấy work-item "${id}" trong ${toPosix(ctx.itemsDir)}`);
  return hit;
}

/** Sửa frontmatter tại chỗ: chỉ thay/xoá đúng khối của key, giữ nguyên phần còn lại. */
function editFrontmatter(file, updates) {
  let text = fs.readFileSync(file, 'utf8');
  const hadBom = text.startsWith('\uFEFF');
  if (hadBom) text = text.slice(1);
  if (!text.startsWith('---')) throw new Error('plan.md không có frontmatter');
  const end = text.indexOf('\n---', 3);
  if (end === -1) throw new Error('frontmatter không được đóng bằng ---');
  const lines = text.slice(4, end).split('\n');
  for (const [key, value] of Object.entries(updates)) {
    const incoming = value === null ? [] : Array.isArray(value) ? value : [`${key}: ${value}`];
    const idx = lines.findIndex((l) => l.startsWith(`${key}:`));
    if (idx === -1) {
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      lines.push(...incoming);
      continue;
    }
    let stop = idx + 1;
    while (stop < lines.length && /^\s+\S/.test(lines[stop])) stop++;
    if (incoming.length) lines.splice(idx, stop - idx, ...incoming);
    else lines.splice(idx, stop - idx);
  }
  fs.writeFileSync(file, `---\n${lines.join('\n')}\n${text.slice(end + 1)}`, 'utf8');
}

function serializeEnvBlock(env = {}) {
  const out = ['env:'];
  for (const k of ENV_KEYS) {
    const cell = env[k] && typeof env[k] === 'object' ? env[k] : {};
    const parts = [`state: ${cell.state || 'none'}`];
    if (cell.pr) parts.push(`pr: ${cell.pr}`);
    if (cell.sha) parts.push(`sha: ${cell.sha}`);
    out.push(`  ${k}: { ${parts.join(', ')} }`);
  }
  return out;
}

function envSummary(fm) {
  const env = fm.env || {};
  return ENV_KEYS.map((k) => {
    const st = env[k] && typeof env[k] === 'object' ? env[k].state : env[k];
    return `${k} ${st && st !== 'none' ? '✅' : '⬜'}`;
  }).join(' · ');
}

function issueBodyFor(item, ctx) {
  const fm = item.fm;
  const log = readLog(item).slice(-12);
  return [
    '<!-- pm:work-item v1 -->',
    `- **Repo**: ${ctx.remote || '(chưa rõ)'}`,
    `- **Nguồn**: ${fm.source || 'trực tiếp'}`,
    `- **Người yêu cầu**: ${fm.requester || '—'}`,
    `- **Ưu tiên**: ${fm.priority || 'P2'}`,
    `- **Kết quả mong đợi**: ${fm.acceptance || '—'}`,
    `- **Phạm vi**: ${fm.scope || '—'}`,
    `- **Không làm**: ${fm.out_of_scope || '—'}`,
    `- **Work-item**: \`${toPosix(path.relative(ctx.repoPath, item.dir))}/\``,
    `- **Nhánh**: \`${fm.branch || '—'}\``,
    `- **Môi trường**: ${envSummary(fm)}`,
    '',
    '## Tiến độ',
    '<!-- pm:log — append-only, mỗi lần pm note ghi một dòng -->',
    ...(log.length ? log.map((l) => `- ${l}`) : ['- (chưa có)']),
    '',
  ].join('\n');
}

const dirOf = (item) => (typeof item === 'string' ? item : item.dir);

function readLog(item) {
  const f = path.join(dirOf(item), 'log.md');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function writeLog(item, line) {
  const f = path.join(dirOf(item), 'log.md');
  const head = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '# Nhật ký\n\n';
  fs.writeFileSync(f, `${head.replace(/\s*$/, '')}\n- ${line}\n`, 'utf8');
}

// Dịch lỗi gh thành việc cần làm. Lỗi 404 khi GHI lên repo public hầu như luôn là
// thiếu quyền, không phải repo không tồn tại — và triệu chứng rất dễ chẩn đoán sai.
function ghHint(err) {
  const e = String(err || '');
  if (/Could not resolve to a Repository/i.test(e)) return 'không thấy repo — kiểm tra remote origin và quyền của tài khoản gh đang đăng nhập';
  if (/does not have the correct permissions|not accessible by|must have admin|Forbidden|HTTP 403/i.test(e)) {
    return 'tài khoản gh hiện tại không có quyền làm việc này trên repo — `gh auth status`, rồi `gh auth switch -u <tài khoản có quyền>`';
  }
  if (/HTTP 404/.test(e)) return 'tài khoản gh hiện tại KHÔNG có quyền ghi lên repo này (404 khi ghi = thiếu quyền). Kiểm tra `gh auth status`, rồi `gh auth switch -u <tài khoản có quyền>`';
  if (/not found/i.test(e) && /label/i.test(e)) return 'nhãn chưa tồn tại và không tạo được — thường do thiếu quyền ghi';
  return null;
}

function ghLabelsEnsure(ctx) {
  const none = { created: [], failed: [], have: [] };
  if (!ctx.remote) return { ...none, ok: false, err: 'không xác định được repo GitHub (thiếu remote origin)' };
  const want = Object.values(ctx.config.labels || {});
  const listed = gh('label', 'list', '--repo', ctx.remote, '--limit', '100', '--json', 'name');
  if (!listed.ok) return { ...none, ok: false, err: listed.err, hint: ghHint(listed.err) };
  let existing;
  try { existing = new Set(JSON.parse(listed.out).map((l) => l.name)); }
  catch { existing = new Set(toLines(listed.out)); }
  const created = [];
  const failed = [];
  for (const name of want) {
    if (existing.has(name)) continue;
    const r = gh('label', 'create', name, '--repo', ctx.remote, '--color', LABEL_COLORS[name] || 'ededed');
    if (r.ok) created.push(name);
    else failed.push({ name, err: String(r.err).split('\n')[0] });
  }
  return {
    ok: failed.length === 0,
    created,
    failed,
    have: [...existing],
    hint: failed.length ? ghHint(failed[0].err) : null,
  };
}

function issueNumberFromCreate(out) {
  const m = String(out).match(/\/issues\/(\d+)\s*$/m) || String(out).match(/(\d+)\s*$/);
  return m ? m[1] : null;
}

function ghIssueCreate(ctx, item, { label = null } = {}) {
  const f = path.join(tmpDir(), `issue-${process.pid}-${Date.now()}.md`);
  fs.writeFileSync(f, issueBodyFor(item, ctx), 'utf8');
  try {
    const args = ['issue', 'create', '--repo', ctx.remote, '--title', item.fm.title || item.slug, '--body-file', f];
    if (label) args.push('--label', label);
    const r = gh(...args);
    return r.ok
      ? { ok: true, number: issueNumberFromCreate(r.out), url: r.out }
      : { ok: false, err: r.err, hint: ghHint(r.err) };
  } finally { try { fs.rmSync(f, { force: true }); } catch { /* bỏ qua */ } }
}

function ghSyncItem(ctx, item) {
  if (!ctx.remote || String(item.fm.id).startsWith('L-')) return { ok: false, err: 'chưa có Issue trên GitHub' };
  const n = item.num;
  const f = path.join(tmpDir(), `body-${n}-${Date.now()}.md`);
  try {
    fs.writeFileSync(f, issueBodyFor(item, ctx), 'utf8');
    const body = gh('issue', 'edit', n, '--repo', ctx.remote, '--body-file', f);
    if (!body.ok) return { ok: false, err: body.err };
    const labels = gh('issue', 'edit', n, '--repo', ctx.remote, '--add-label', labelForStatus(item.fm, ctx));
    return labels.ok ? { ok: true } : { ok: false, err: labels.err };
  } finally { try { fs.rmSync(f, { force: true }); } catch { /* bỏ qua */ } }
}

function labelForStatus(fm, ctx) {
  const L = ctx.config.labels || {};
  if (fm.status === 'in-review') return L.in_review || 'in-review';
  if (fm.status === 'in-progress') return L.in_progress || 'in-progress';
  return fm.routing || L.ready_for_agent || 'ready-for-agent';
}

// ── intake

function cmdIntake(args) {
  const o = parseArgs(args);
  const fromFile = lastFlag(o, 'from-file');
  const text = (fromFile
    ? fs.readFileSync(fromFile, 'utf8').replace(/^\uFEFF/, '')
    : (o.rest.join(' ') || lastFlag(o, 'text') || '')).trim();
  if (!text) { console.error('Thiếu nội dung. Dùng: pm intake "<text>"  hoặc  pm intake --from-file <file>'); return 2; }
  const ctx = loadRepoCtx(lastFlag(o, 'repo'));
  const create = !!(o.flags.create || o.flags.yes);
  const dryRun = !!o.flags['dry-run'];

  const firstLine = text.split(/\r?\n/).map((s) => s.trim()).find(Boolean) || text;
  const title = String(lastFlag(o, 'title') || firstLine).slice(0, 110);
  const priority = String(lastFlag(o, 'priority') || 'P2').toUpperCase();
  const routing = String(lastFlag(o, 'routing') || ctx.config.labels?.ready_for_agent || 'ready-for-agent');
  const slug = slugify(lastFlag(o, 'slug') || title);
  const num = lastFlag(o, 'issue') ? String(lastFlag(o, 'issue')).replace(/^\D+/, '') : null;
  const session = lastFlag(o, 'session') || defaultSession();

  const draft = {
    title,
    description: text,
    priority: ['P1', 'P2', 'P3'].includes(priority) ? priority : 'P2',
    routing: ROUTING.includes(routing) ? routing : 'ready-for-agent',
    source: lastFlag(o, 'source') || 'trực tiếp',
    acceptance: lastFlag(o, 'acceptance') || '',
    scope: lastFlag(o, 'scope') || '',
    outOfScope: lastFlag(o, 'out-of-scope') || '',
    requester: lastFlag(o, 'requester') || '',
  };

  if (!create || dryRun) {
    console.log('DRAFT work-item (chưa ghi gì):\n');
    console.log(`  title     : ${draft.title}`);
    console.log(`  slug      : ${slug}`);
    console.log(`  priority  : ${draft.priority}`);
    console.log(`  routing   : ${draft.routing}`);
    console.log(`  source    : ${draft.source}`);
    console.log(`  repo      : ${ctx.remote || toPosix(ctx.repoPath)}`);
    console.log(`  thư mục   : ${ctx.config.work_items_dir}/${stampYYMMDD()}-<số>-${slug}/`);
    if (draft.acceptance) console.log(`  nghiệm thu: ${draft.acceptance}`);
    console.log('\nTạo thật: thêm --create. Sửa thì dùng --title/--priority/--routing/--slug/--source.');
    return 0;
  }

  const dayDir = stampYYMMDD();
  let issueNo = num;
  let syncPending = false;
  let id = num ? `${ctx.config.issue_prefix || 'GH-'}${num}` : null;

  // Nhãn phải tồn tại TRƯỚC khi tạo Issue: `gh issue create --label X` thất bại nếu X chưa có.
  let labelToApply = null;
  if (ctx.remote) {
    const lab = ghLabelsEnsure(ctx);
    if ((lab.created || []).length) console.log(`  tạo nhãn: ${lab.created.join(', ')}`);
    if (lab.ok) labelToApply = draft.routing;
    else {
      const detail = lab.err || (lab.failed || []).map((f) => `${f.name}: ${f.err}`).join(' · ');
      console.warn(`! Nhãn pm chưa đủ trên GitHub — ${detail}`);
      if (lab.hint) console.warn(`  → ${lab.hint}`);
      console.warn('  Issue vẫn tạo được nhưng sẽ THIẾU nhãn, và pm claim sẽ không gán được in-progress.');
    }
  }

  if (!id) {
    // Chưa có số Issue. Ưu tiên tạo Issue thật; nếu không được thì dùng ID tạm L-<n>.
    const probe = {
      fm: { ...draft, id: 'L-0', status: 'pending', created: stampISO(), tags: [] },
      dir: ctx.itemsDir, slug,
    };
    const created = ghIssueCreate(ctx, probe, { label: labelToApply });
    if (created.ok && created.number) {
      issueNo = created.number;
      id = `${ctx.config.issue_prefix || 'GH-'}${issueNo}`;
    } else {
      syncPending = true;
      const used = listWorkItems(ctx).map((i) => Number(i.num) || 0);
      const localNext = Math.max(0, ...used) + 1;
      issueNo = String(localNext);
      id = `L-${issueNo}`;
      console.warn(`! Chưa tạo được Issue (${String(created.err).split('\n')[0]}) — dùng ID tạm ${id}, pm sync sẽ tạo sau.`);
      if (created.hint) console.warn(`  → ${created.hint}`);
    }
  }

  const dirName = `${dayDir}-${issueNo}-${slug}`;
  const dir = path.join(ctx.itemsDir, dirName);
  if (fs.existsSync(dir)) { console.error(`Đã tồn tại ${toPosix(dir)}`); return 1; }
  fs.mkdirSync(dir, { recursive: true });

  const fm = [
    '---',
    `id: ${id}`,
    `title: ${JSON.stringify(draft.title)}`,
    `status: pending`,
    `priority: ${draft.priority}`,
    `created: ${stampISO()}`,
    `routing: ${draft.routing}`,
    `repo: ${ctx.remote || ''}`,
    `source: ${JSON.stringify(draft.source)}`,
    draft.requester ? `requester: ${JSON.stringify(draft.requester)}` : null,
    draft.acceptance ? `acceptance: ${JSON.stringify(draft.acceptance)}` : null,
    draft.scope ? `scope: ${JSON.stringify(draft.scope)}` : null,
    draft.outOfScope ? `out_of_scope: ${JSON.stringify(draft.outOfScope)}` : null,
    syncPending ? 'sync_pending: true' : null,
    ...serializeEnvBlock({}),
    '---',
    '',
    `# ${draft.title}`,
    '',
    '## Yêu cầu gốc',
    '',
    draft.description,
    '',
    '## Việc cần làm',
    '',
    '- [ ] (chia ticket bằng /to-tickets)',
    '',
    '## Nghiệm thu',
    '',
    draft.acceptance ? `- ${draft.acceptance}` : '- (bổ sung)',
    '',
  ].filter((l) => l !== null).join('\n');

  fs.writeFileSync(path.join(dir, 'plan.md'), fm, 'utf8');
  writeLog({ dir }, `${stampFull()} · intake bởi ${session} · nguồn: ${draft.source}`);

  const item = { dir, dirName, file: path.join(dir, 'plan.md'), fm: parseYaml(fm.slice(3, fm.indexOf('\n---', 3))), id, num: String(issueNo), slug };

  console.log(`\nĐã tạo ${id} — ${draft.title}`);
  console.log(`  thư mục : ${toPosix(path.relative(ctx.repoPath, dir))}/`);
  console.log(`  routing : ${draft.routing}`);
  console.log(`  ưu tiên  : ${draft.priority}`);
  if (syncPending) console.log('  ⚠ sync_pending — chưa có Issue trên GitHub, chạy pm sync khi có mạng/quyền');
  return 0;
}

// ── next

function cmdNext(args) {
  const o = parseArgs(args);
  const limit = Number(lastFlag(o, 'limit') || 10);
  const json = !!o.flags.json;
  const mode = String(lastFlag(o, 'routing') || 'ready-for-agent');

  const scanned = scanRepos(o);
  const rows = [];
  for (const { ctx, label } of scanned) {
    const items = listWorkItems(ctx);
    const done = new Set(items.filter((i) => i.fm.status === 'completed').map((i) => i.num));
    for (const it of items) {
      if (it.fm.status !== 'pending') continue;
      if (it.fm.claimed_by) continue;
      if ((it.fm.routing || 'ready-for-agent') !== mode) continue;
      const blocked = (it.fm.blocked_by || []).map((b) => String(b).replace(/^\D+/, '')).filter((b) => !done.has(b));
      rows.push({
        id: it.id,
        title: String(it.fm.title || it.slug).slice(0, 60),
        repo: label || ctx.remote || toPosix(ctx.repoPath),
        priority: it.fm.priority || 'P2',
        created: it.fm.created || '',
        blocked: blocked.length ? blocked.join(',') : '',
      });
    }
  }
  rows.sort((a, b) => String(a.priority).localeCompare(String(b.priority)) || String(a.created).localeCompare(String(b.created)));

  if (json) { console.log(JSON.stringify(rows.slice(0, limit), null, 2)); return 0; }
  if (!rows.length) { console.log(`Không có việc nào ở trạng thái "${mode}".`); return 0; }
  console.log(fmtTable(['ID', 'P', 'TẠO', 'BỊ CHẶN', 'TIÊU ĐỀ', 'REPO'],
    rows.slice(0, limit).map((r) => [r.id, r.priority, r.created, r.blocked || '—', r.title, r.repo])));
  console.log(`\n${rows.length} việc sẵn sàng · nhặt bằng: pm claim <ID>`);
  return 0;
}

// ── claim / release

function cmdClaim(args) {
  const o = parseArgs(args);
  const id = o.rest[0];
  if (!id) { console.error('Dùng: pm claim <id>'); return 2; }
  const ctx = loadRepoCtx(lastFlag(o, 'repo'));
  const item = findItem(ctx, id);
  const session = lastFlag(o, 'session') || defaultSession();
  const force = !!o.flags.force;

  if (item.fm.claimed_by && !force) {
    console.error(`✗ ${item.id} đã bị nhặt bởi ${item.fm.claimed_by} (${item.fm.claimed_at || '?'})`);
    console.error('  Không giành việc. Chọn việc khác, hoặc --force nếu chắc chắn session kia đã chết.');
    return 1;
  }

  const type = String(lastFlag(o, 'type') || 'feat');
  const fmt = ctx.flow.branch_format || '{type}/{issue}-{slug}';
  const branch = fmt.replace('{type}', type).replace('{issue}', item.num).replace('{slug}', item.slug);
  const src = ctx.flow.source_branch || 'main';

  let branchNote = '';
  const exists = git(ctx.repoPath, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
  if (!exists.ok) {
    const base = git(ctx.repoPath, 'rev-parse', '--verify', '--quiet', `refs/heads/${src}`).ok ? src : 'HEAD';
    const st = git(ctx.repoPath, 'status', '--porcelain');
    const clean = st.ok && !st.out;
    const wantCheckout = !!o.flags.checkout || clean;
    const made = wantCheckout
      ? git(ctx.repoPath, 'checkout', '-b', branch, base)
      : git(ctx.repoPath, 'branch', branch, base);
    if (made.ok) branchNote = wantCheckout ? `đã tạo và chuyển sang ${branch}` : `đã tạo ${branch} (chưa chuyển — cây làm việc đang bẩn)`;
    else branchNote = `chưa tạo được nhánh: ${made.err}`;
  } else branchNote = `nhánh ${branch} đã có sẵn`;

  editFrontmatter(item.file, {
    status: 'in-progress',
    branch,
    claimed_by: session,
    claimed_at: new Date().toISOString(),
    sync_pending: null,
  });
  writeLog(item.dir, `${stampFull()} · claim bởi ${session} · nhánh ${branch}`);

  let ghNote = 'chưa đồng bộ GitHub';
  if (ctx.remote && !item.id.startsWith('L-')) {
    // Tách assignee khỏi nhãn: nhãn lỗi thì assignee vẫn phải được gán.
    const rWho = gh('issue', 'edit', item.num, '--repo', ctx.remote, '--add-assignee', '@me');
    const rLab = gh('issue', 'edit', item.num, '--repo', ctx.remote, '--add-label', ctx.config.labels?.in_progress || 'in-progress');
    if (rWho.ok && rLab.ok) ghNote = 'đã gán assignee + nhãn in-progress';
    else {
      const bad = !rWho.ok ? rWho.err : rLab.err;
      ghNote = `gh lỗi: ${String(bad).split('\n')[0]}`;
      const hint = ghHint(bad);
      if (hint) ghNote += `\n            → ${hint}`;
      if (!rWho.ok) editFrontmatter(item.file, { sync_pending: 'true' });
    }
  } else {
    editFrontmatter(item.file, { sync_pending: 'true' });
  }

  console.log(`✓ Đã nhặt ${item.id} — ${item.fm.title}`);
  console.log(`  session : ${session}`);
  console.log(`  nhánh   : ${branchNote}`);
  console.log(`  github  : ${ghNote}`);
  console.log('\nGiờ mới được sửa code. Chuỗi gợi ý: /to-spec → /to-tickets → /implement (→ /tdd → /code-review)');
  return 0;
}

function cmdRelease(args) {
  const o = parseArgs(args);
  const id = o.rest[0];
  if (!id) { console.error('Dùng: pm release <id> [--reason "..."]'); return 2; }
  const ctx = loadRepoCtx(lastFlag(o, 'repo'));
  const item = findItem(ctx, id);
  const who = item.fm.claimed_by || '?';
  editFrontmatter(item.file, { status: 'pending', claimed_by: null, claimed_at: null, branch: null });
  writeLog(item.dir, `${stampFull()} · nhả việc (trước đó: ${who})${lastFlag(o, 'reason') ? ` · lý do: ${lastFlag(o, 'reason')}` : ''}`);
  let ghNote = 'chỉ ghi file';
  if (ctx.remote && !item.id.startsWith('L-')) {
    const rWho = gh('issue', 'edit', item.num, '--repo', ctx.remote, '--remove-assignee', '@me');
    const rLab = gh('issue', 'edit', item.num, '--repo', ctx.remote,
      '--remove-label', ctx.config.labels?.in_progress || 'in-progress',
      '--add-label', item.fm.routing || 'ready-for-agent');
    if (rWho.ok && rLab.ok) ghNote = 'đã gỡ assignee + nhãn';
    else {
      const bad = !rWho.ok ? rWho.err : rLab.err;
      ghNote = `gh lỗi: ${String(bad).split('\n')[0]}`;
      const hint = ghHint(bad);
      if (hint) ghNote += `\n            → ${hint}`;
      editFrontmatter(item.file, { sync_pending: 'true' });
    }
  }
  console.log(`✓ Đã nhả ${item.id} về hàng đợi (trước đó: ${who})`);
  console.log(`  github: ${ghNote}`);
  return 0;
}

// ── note

function cmdNote(args) {
  const o = parseArgs(args);
  const id = o.rest[0];
  const text = o.rest.slice(1).join(' ').trim() || lastFlag(o, 'text');
  if (!id || !text) { console.error('Dùng: pm note <id> "<nội dung>"'); return 2; }
  const ctx = loadRepoCtx(lastFlag(o, 'repo'));
  const item = findItem(ctx, id);
  const line = `${stampFull()} · ${text}`;
  writeLog(item.dir, line);
  let ghNote = 'chỉ ghi file (chưa có Issue)';
  if (ctx.remote && !item.id.startsWith('L-')) {
    const c = gh('issue', 'comment', item.num, '--repo', ctx.remote, '--body', `**${stampFull()}** · ${text}`);
    ghNote = c.ok ? 'đã comment lên Issue' : `gh lỗi: ${c.err} (đã ghi file)`;
  }
  console.log(`✓ ${item.id}: ${ghNote}`);
  return 0;
}

// ── handoff

function cmdHandoff(args) {
  const o = parseArgs(args);
  const id = o.rest[0];
  if (!id) { console.error('Dùng: pm handoff <id> [--session <id>] [--next "..."]'); return 2; }
  const ctx = loadRepoCtx(lastFlag(o, 'repo'));
  const item = findItem(ctx, id);
  const session = lastFlag(o, 'session') || item.fm.claimed_by || defaultSession();
  const short = String(session).split('#').pop().slice(0, 12);

  const branch = item.fm.branch;
  const changed = branch
    ? toLines(git(ctx.repoPath, 'diff', '--name-only', `${ctx.flow.source_branch || 'main'}...${branch}`).out)
    : [];
  const dirty = toLines(git(ctx.repoPath, 'status', '--porcelain').out).slice(0, 20);
  const log = readLog(item.dir).slice(-8);

  const body = [
    `# Handoff — ${item.id} · ${session} · ${stampISO()}`,
    '',
    `- **Tiêu đề**: ${item.fm.title}`,
    `- **Trạng thái**: ${item.fm.status} · ${item.fm.routing || '—'}`,
    `- **Nhánh**: ${branch || '—'}`,
    `- **Môi trường**: ${envSummary(item.fm)}`,
    '',
    '## Đã làm',
    '',
    '<!-- điền: việc đã xong, kèm đường dẫn file -->',
    '',
    '## Còn lại',
    '',
    '<!-- điền: việc tiếp theo, dạng checkbox -->',
    '',
    '## File đã đổi',
    '',
    ...(changed.length ? changed.map((f) => `- \`${f}\``) : ['- (chưa có diff so với nhánh nguồn)']),
    ...(dirty.length ? ['', 'Chưa commit:', ...dirty.map((f) => `- \`${f}\``)] : []),
    '',
    '## Nhật ký gần nhất',
    '',
    ...(log.length ? log.map((l) => `- ${l}`) : ['- (chưa có)']),
    '',
    '## Quyết định đã chốt',
    '',
    '<!-- điền: chọn gì, vì sao, phương án đã loại -->',
    '',
    '## Cản trở',
    '',
    '<!-- điền: cái gì đang chặn, cần ai gỡ -->',
    '',
    '## Skill nên gọi tiếp',
    '',
    `<!-- ví dụ: /implement cho phase kế, rồi /code-review; mở PR bằng /pr -->`,
    '',
    '## Lệnh chạy tiếp theo',
    '',
    '```bash',
    ctx.flow.pre_commit_gate || 'npm run ci:check',
    '```',
    '',
  ].join('\n');

  const name = `handoff-${stampYYMMDD()}-${short}.md`;
  const file = path.join(item.dir, name);
  if (fs.existsSync(file)) console.warn(`! Ghi đè ${name}`);
  fs.writeFileSync(file, body, 'utf8');
  writeLog(item.dir, `${stampFull()} · handoff → ${name}`);

  if (ctx.remote && !item.id.startsWith('L-')) {
    gh('issue', 'comment', item.num, '--repo', ctx.remote,
      '--body', `**Handoff** · \`${toPosix(path.relative(ctx.repoPath, file))}\` (${session})`);
  }

  console.log(`✓ Handoff: ${toPosix(path.relative(ctx.repoPath, file))}`);
  console.log('  Còn 6 mục "<!-- điền -->" — agent phải điền trước khi kết thúc phiên.');
  return 0;
}

// ── env

function cmdEnv(args) {
  const o = parseArgs(args);
  const [id, envName, state] = o.rest;
  if (!id || !envName || !state) { console.error('Dùng: pm env <id> <main|develop|staging|prod> <none|cherry-picked|merged|verified|failed> [--pr N] [--sha X]'); return 2; }
  if (!ENV_KEYS.includes(envName)) { console.error(`env không hợp lệ: ${envName} — chọn ${ENV_KEYS.join(' | ')}`); return 2; }
  if (!ENV_STATES.includes(state)) { console.error(`state không hợp lệ: ${state} — chọn ${ENV_STATES.join(' | ')}`); return 2; }
  const ctx = loadRepoCtx(lastFlag(o, 'repo'));
  const item = findItem(ctx, id);
  const env = { ...(item.fm.env || {}) };
  const cell = { state };
  if (lastFlag(o, 'pr')) cell.pr = Number(lastFlag(o, 'pr'));
  if (lastFlag(o, 'sha')) cell.sha = String(lastFlag(o, 'sha'));
  if (envName !== 'main' && !cell.sha && cell.state !== 'none') {
    const pr = cell.pr;
    console.warn('! Thiếu --sha — cờ môi trường nên kèm commit sha để đối chiếu được.');
    if (pr) cell.note = `PR #${pr}`;
  }
  env[envName] = cell;
  editFrontmatter(item.file, { env: serializeEnvBlock(env) });
  writeLog(item.dir, `${stampFull()} · env ${envName}=${state}${cell.pr ? ` (PR #${cell.pr})` : ''}${cell.sha ? ` @${String(cell.sha).slice(0, 8)}` : ''}`);
  let ghNote = 'chỉ ghi file';
  if (ctx.remote && !item.id.startsWith('L-')) {
    const r = ghSyncItem(ctx, item);
    ghNote = r.ok ? 'đã cập nhật Issue' : `gh lỗi: ${r.err}`;
    if (!r.ok) editFrontmatter(item.file, { sync_pending: 'true' });
  }
  console.log(`✓ ${item.id} · ${envName}=${state} · ${envSummary({ env })}`);
  console.log(`  github: ${ghNote}`);
  return 0;
}

// ── status

function scanRepos(o) {
  const one = lastFlag(o, 'repo');
  if (one) return [{ ctx: loadRepoCtx(one), label: null }];
  const world = lastFlag(o, 'world');
  if (o.flags.all || world) {
    if (!fs.existsSync(WORLDS_PATH)) return [{ ctx: loadRepoCtx(process.cwd()), label: null }];
    const worlds = readYaml(WORLDS_PATH).worlds || {};
    const out = [];
    for (const [name, w] of Object.entries(worlds)) {
      if (world && world !== 'all' && world !== name) continue;
      for (const r of w.repos || []) {
        if (!r?.path || !fs.existsSync(r.path)) continue;
        if (!fs.existsSync(path.join(r.path, '.pm'))) continue;
        try { out.push({ ctx: loadRepoCtx(r.path), label: r.name }); } catch { /* bỏ qua */ }
      }
    }
    return out.length ? out : [{ ctx: loadRepoCtx(process.cwd()), label: null }];
  }
  return [{ ctx: loadRepoCtx(process.cwd()), label: null }];
}

function cmdStatus(args) {
  const o = parseArgs(args);
  const json = !!o.flags.json;
  const scanned = scanRepos(o);
  const report = [];
  for (const { ctx, label } of scanned) {
    const items = listWorkItems(ctx);
    const row = { repo: label || ctx.remote || toPosix(ctx.repoPath), path: toPosix(ctx.repoPath), counts: {}, env: {}, pendingSync: 0, active: [] };
    for (const it of items) {
      row.counts[it.fm.status] = (row.counts[it.fm.status] || 0) + 1;
      if (it.fm.sync_pending) row.pendingSync++;
      for (const k of ENV_KEYS) {
        const st = it.fm.env?.[k] && typeof it.fm.env[k] === 'object' ? it.fm.env[k].state : it.fm.env?.[k];
        if (st && st !== 'none') row.env[k] = (row.env[k] || 0) + 1;
      }
      if (it.fm.status === 'in-progress' || it.fm.status === 'in-review') {
        row.active.push({ id: it.id, title: String(it.fm.title || '').slice(0, 50), status: it.fm.status, by: it.fm.claimed_by || '—', branch: it.fm.branch || '—' });
      }
    }
    report.push(row);
  }
  if (json) { console.log(JSON.stringify(report, null, 2)); return 0; }

  const rows = report.map((r) => [
    r.repo, r.counts.pending || 0, r.counts['in-progress'] || 0, r.counts['in-review'] || 0, r.counts.completed || 0,
    ENV_KEYS.map((k) => r.env[k] || 0).join('/'), r.pendingSync || '',
  ]);
  console.log(fmtTable(['REPO', 'CHỜ', 'ĐANG', 'REVIEW', 'XONG', 'main/dev/stg/prod', 'CHỜ SYNC'], rows));
  const active = report.flatMap((r) => r.active.map((a) => [a.id, a.status, a.by, a.branch, a.title, r.repo]));
  if (active.length) {
    console.log('\nĐang chạy:');
    console.log(fmtTable(['ID', 'TRẠNG THÁI', 'SESSION', 'NHÁNH', 'TIÊU ĐỀ', 'REPO'], active));
  } else {
    console.log('\nKhông có work-item nào đang chạy.');
  }
  return 0;
}

// ── sync

function cmdSync(args) {
  const o = parseArgs(args);
  const dry = !!o.flags['dry-run'];
  const scanned = scanRepos(o);
  let fixed = 0, failed = 0;
  for (const { ctx, label } of scanned) {
    const where = label || ctx.remote || toPosix(ctx.repoPath);
    if (!ctx.remote) { console.log(`[--] ${where}: không có remote origin`); continue; }
    if (!dry) {
      const lab = ghLabelsEnsure(ctx);
      if (!lab.ok) { console.log(`[fail] ${where}: không đồng bộ được nhãn — ${lab.err}`); failed++; continue; }
      if (lab.created.length) console.log(`[ok]   ${where}: tạo nhãn ${lab.created.join(', ')}`);
    }
    for (const item of listWorkItems(ctx)) {
      let target = item;
      if (item.id.startsWith('L-')) {
        if (dry) { console.log(`[dry]  ${where}: sẽ tạo Issue cho ${item.dirName}`); continue; }
        const created = ghIssueCreate(ctx, item);
        if (!created.ok || !created.number) { console.log(`[fail] ${where}: tạo Issue cho ${item.id} lỗi — ${created.err}`); failed++; continue; }
        const newId = `${ctx.config.issue_prefix || 'GH-'}${created.number}`;
        const newName = renamedForIssue(item.dirName, created.number);
        const newDir = path.join(ctx.itemsDir, newName);
        fs.renameSync(item.dir, newDir);
        editFrontmatter(path.join(newDir, 'plan.md'), { id: newId, sync_pending: null });
        console.log(`[ok]   ${where}: ${item.id} → ${newId} (${newName})`);
        target = { ...item, dir: newDir, dirName: newName, file: path.join(newDir, 'plan.md'), id: newId, num: String(created.number) };
        target.fm = readFrontmatter(target.file);
        fixed++;
        continue;
      }
      if (!item.fm.sync_pending && !o.flags.all) continue;
      if (dry) { console.log(`[dry]  ${where}: sẽ cập nhật Issue #${item.num}`); continue; }
      const r = ghSyncItem(ctx, target);
      if (r.ok) { editFrontmatter(target.file, { sync_pending: null }); console.log(`[ok]   ${where}: đồng bộ #${target.num} (${target.id})`); fixed++; }
      else { console.log(`[fail] ${where}: #${target.num} — ${r.err}`); failed++; }
    }
  }
  console.log(`\n${fixed} đồng bộ · ${failed} lỗi${dry ? ' (dry-run, chưa ghi gì)' : ''}`);
  return failed ? 1 : 0;
}

// ── archive

function cmdArchive(args) {
  const o = parseArgs(args);
  const id = o.rest[0];
  if (!id) { console.error('Dùng: pm archive <id> [--keep]'); return 2; }
  const ctx = loadRepoCtx(lastFlag(o, 'repo'));
  const item = findItem(ctx, id);
  const open = Object.entries(item.fm.env || {})
    .filter(([, v]) => { const s = v && typeof v === 'object' ? v.state : v; return s && s !== 'none'; })
    .map(([k]) => k);
  if (!open.length) console.warn('! Chưa có môi trường nào được đánh dấu — work-item này chưa lên được đâu cả.');

  editFrontmatter(item.file, { status: 'completed', completed: stampISO(), sync_pending: null });
  writeLog(item.dir, `${stampFull()} · archive · môi trường đã lên: ${open.join(', ') || 'chưa có'}`);
  let ghNote = 'chỉ ghi file';
  if (ctx.remote && !item.id.startsWith('L-')) {
    const c = gh('issue', 'close', item.num, '--repo', ctx.remote, '--comment', `Hoàn tất. Môi trường: ${open.join(', ') || '—'}`);
    const l = gh('issue', 'edit', item.num, '--repo', ctx.remote, '--remove-label', 'in-progress', '--remove-label', 'in-review');
    ghNote = c.ok && l.ok ? 'đã đóng Issue' : `gh lỗi: ${c.err || l.err}`;
  }
  console.log(`✓ ${item.id} → completed · ${ghNote}`);
  if (!o.flags.keep) {
    const arch = path.join(ctx.itemsDir, 'archive');
    fs.mkdirSync(arch, { recursive: true });
    const dest = path.join(arch, item.dirName);
    fs.renameSync(item.dir, dest);
    console.log(`  chuyển vào ${toPosix(path.relative(ctx.repoPath, dest))}/`);
  }
  return 0;
}



function render(rows, json, summaries) {
  if (json) { console.log(JSON.stringify({ checks: rows, summaries }, null, 2)); return; }
  const scopes = new Map();
  for (const r of rows) { if (!scopes.has(r.scope)) scopes.set(r.scope, []); scopes.get(r.scope).push(r); }
  for (const [scope, rs] of scopes) {
    console.log(`\n── ${scope} ${'─'.repeat(Math.max(2, 58 - scope.length))}`);
    for (const r of rs) {
      const mark = r.level === 'ok' ? '[ok]  ' : r.level === 'warn' ? '[warn]' : '[fail]';
      console.log(`${mark} ${r.msg}`);
      if (r.fix) console.log(`        → ${r.fix}`);
    }
  }
  for (const s of summaries || []) {
    if (!s.workItems) continue;
    const byStatus = Object.entries(s.byStatus).map(([k, v]) => `${k}:${v}`).join(' · ');
    console.log(`\nTổng ${s.workItems} work-item — ${byStatus}`);
    const env = Object.entries(s.envOpen).map(([k, v]) => `${k}:${v}`).join(' · ');
    if (env) console.log(`Đã lên môi trường — ${env}`);
  }
  if ((summaries || []).length > 1) {
    console.log(`\n── tổng hợp ${'─'.repeat(48)}`);
    for (const s of summaries) {
      const flag = !s.installed ? 'chưa cài pm'
        : s.workItems ? `${s.workItems} work-item`
          : 'đã cài, chưa có work-item';
      console.log(`  ${s.installed ? '[ok]  ' : '[--]  '} ${s.repo} — ${flag}`);
    }
    const installed = summaries.filter((s) => s.installed).length;
    console.log(`  ${installed}/${summaries.length} repo đã cài pm`);
  }
  const n = (l) => rows.filter((r) => r.level === l).length;
  console.log(`\n${n('ok')} ok · ${n('warn')} warn · ${n('fail')} fail`);
  if (n('fail')) console.log('Có lỗi cần sửa. Xem dòng [fail] ở trên.');
  else if (n('warn')) console.log('Không có lỗi chặn. Các dòng [warn] là việc nên xử lý.');
  else console.log('Sạch.');
}

// ── adopt (plan cũ → work-item theo schema pm)

function listLegacyDirs(ctx) {
  if (!fs.existsSync(ctx.itemsDir)) return [];
  const out = [];
  for (const e of fs.readdirSync(ctx.itemsDir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === 'archive') continue;
    const dir = path.join(ctx.itemsDir, e.name);
    const md = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    if (!md.length) continue;
    const planFile = path.join(dir, 'plan.md');
    let fm = null;
    if (fs.existsSync(planFile)) { try { fm = readFrontmatter(planFile); } catch { fm = null; } }
    if (fm?.id) continue;                       // đã theo schema
    out.push({ name: e.name, dir, planFile: fs.existsSync(planFile) ? planFile : path.join(dir, md[0]), files: md });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function cmdAdopt(args) {
  const o = parseArgs(args);
  const ctx = loadRepoCtx(lastFlag(o, 'repo'));
  const legacy = listLegacyDirs(ctx);
  const dry = !!o.flags['dry-run'];

  if (o.flags.list || (!o.rest.length && !o.flags.all)) {
    if (!legacy.length) { console.log('Không có plan cũ nào cần adopt.'); return 0; }
    console.log(`${legacy.length} plan cũ chưa theo schema pm:\n`);
    for (const l of legacy) console.log(`  ${l.name}  (${l.files.length} file .md)`);
    console.log('\nAdopt một cái:  pm adopt <tên-thư-mục> [--issue N] [--dry-run]');
    console.log('Adopt tất cả:   pm adopt --all [--dry-run]');
    return 0;
  }

  const picks = o.flags.all ? legacy : legacy.filter((l) => l.name === o.rest[0] || l.name.includes(o.rest[0]));
  if (!picks.length) { console.error(`Không thấy plan cũ khớp "${o.rest[0] || ''}". Xem: pm adopt --list`); return 1; }
  if (picks.length > 1 && !o.flags.all) {
    console.error(`"${o.rest[0]}" khớp ${picks.length} thư mục — ghi rõ hơn hoặc dùng --all.`);
    return 1;
  }

  const used = listWorkItems(ctx).map((i) => Number(i.num) || 0);
  let nextLocal = Math.max(0, ...used);
  let done = 0;

  for (const p of picks) {
    const text = fs.readFileSync(p.planFile, 'utf8').replace(/^\uFEFF/, '');
    const titleLine = text.split(/\r?\n/).find((l) => /^#\s+\S/.test(l));
    const title = String(lastFlag(o, 'title') || (titleLine ? titleLine.replace(/^#\s+/, '') : p.name)).slice(0, 110);
    nextLocal += 1;
    const issueNo = String(lastFlag(o, 'issue') || nextLocal);
    const id = o.flags.issue ? `${ctx.config.issue_prefix || 'GH-'}${issueNo}` : `L-${issueNo}`;
    const slug = slugify(title);

    console.log(`${dry ? '[dry] ' : ''}${p.name}  →  ${id} · ${title}`);
    if (dry) { done++; continue; }

    if (p.planFile.endsWith('plan.md')) {
      const front = [
        '---',
        `id: ${id}`,
        `title: ${JSON.stringify(title)}`,
        'status: pending',
        'priority: P2',
        `created: ${stampISO()}`,
        'routing: ready-for-agent',
        `repo: ${ctx.remote || ''}`,
        'sync_pending: true',
        ...serializeEnvBlock({}),
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(p.planFile, front + text, 'utf8');
    } else {
      fs.writeFileSync(path.join(p.dir, 'plan.md'), [
        '---', `id: ${id}`, `title: ${JSON.stringify(title)}`, 'status: pending', 'priority: P2',
        `created: ${stampISO()}`, 'routing: ready-for-agent', `repo: ${ctx.remote || ''}`, 'sync_pending: true',
        ...serializeEnvBlock({}), '---', '', `# ${title}`, '', `Nội dung cũ: \`${path.basename(p.planFile)}\``, '',
      ].join('\n'), 'utf8');
    }
    writeLog(p.dir, `${stampFull()} · adopt từ plan cũ (${slug}) · ${id}`);
    done++;
  }

  console.log(`\n${dry ? 'Sẽ adopt' : 'Đã adopt'} ${done} plan cũ.${dry ? '' : ' Chạy pm sync để tạo Issue và đổi ID tạm thành số thật.'}`);
  return 0;
}



function tryRepoCtx() {
  try { return loadRepoCtx(process.cwd()); } catch { return null; }
}

function pendingForHook(ctx, limit = 3) {
  const items = listWorkItems(ctx);
  const done = new Set(items.filter((i) => i.fm.status === 'completed').map((i) => i.num));
  return items
    .filter((i) => i.fm.status === 'pending' && !i.fm.claimed_by
      && (i.fm.routing || 'ready-for-agent') === 'ready-for-agent'
      && !(i.fm.blocked_by || []).some((b) => !done.has(String(b).replace(/^\D+/, ''))))
    .sort((a, b) => String(a.fm.priority || 'P2').localeCompare(String(b.fm.priority || 'P2')))
    .slice(0, limit);
}

function nagState(ctx) {
  const f = path.join(ctx.pmDir, '.hook-state.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; }
}
function setNagState(ctx, state) {
  try { fs.writeFileSync(path.join(ctx.pmDir, '.hook-state.json'), JSON.stringify(state), 'utf8'); } catch { /* bỏ qua */ }
}

function cmdHook(args) {
  const event = String(args[0] || '');
  const ctx = tryRepoCtx();
  if (!ctx) return 0;                       // repo chưa cài pm: im lặng, không phá phiên

  if (event === 'session-start') {
    const items = listWorkItems(ctx);
    const active = items.filter((i) => i.fm.status === 'in-progress' || i.fm.status === 'in-review');
    const next = pendingForHook(ctx);
    const lines = ['[pm] Trạng thái work-item trong repo này:'];
    if (active.length) {
      lines.push('  Đang chạy:');
      for (const a of active) lines.push(`    ${a.id} · ${a.fm.status} · ${a.fm.claimed_by || '—'} · ${String(a.fm.title || '').slice(0, 60)}`);
    }
    if (next.length) {
      lines.push('  Sẵn sàng nhặt:');
      for (const n of next) lines.push(`    ${n.id} · ${n.fm.priority || 'P2'} · ${String(n.fm.title || '').slice(0, 60)}`);
      lines.push('  Nhặt việc TRƯỚC khi sửa code: pm claim <id>');
    } else if (!active.length) {
      lines.push('  Không có việc nào đang chạy hoặc sẵn sàng.');
    }
    lines.push('  Luật: claim trước khi code · không giành việc · handoff trước khi kết thúc phiên.');
    console.log(lines.join('\n'));
    return 0;
  }

  if (event === 'stop') {
    const items = listWorkItems(ctx);
    const stuck = items.filter((i) => i.fm.status === 'in-progress'
      && !fs.readdirSync(i.dir).some((f) => /^handoff-.*\.md$/.test(f)));
    if (!stuck.length) return 0;

    const state = nagState(ctx);
    const now = Date.now();
    if (state.stopNagAt && now - state.stopNagAt < 30 * 60 * 1000) return 0;   // không nhắc lại quá dày
    setNagState(ctx, { ...state, stopNagAt: now });

    process.stderr.write([
      `[pm] ${stuck.length} work-item đang dở và CHƯA có handoff:`,
      ...stuck.map((s) => `  ${s.id} · ${String(s.fm.title || '').slice(0, 60)}`),
      'Trước khi kết thúc phiên, chạy: pm handoff <id>  rồi điền 6 mục <!-- điền -->.',
      'Nếu vẫn đang làm tiếp thì bỏ qua thông báo này.',
      '',
    ].join('\n'));
    return 2;                               // Claude Code: exit 2 = chặn dừng, hiện thông báo cho agent
  }

  console.error(`pm hook: sự kiện không hỗ trợ "${event}" (dùng: session-start | stop)`);
  return 2;
}

function mergeClaudeHooks(repoPath, pmBin) {
  const dir = path.join(repoPath, '.claude');
  const file = path.join(dir, 'settings.json');
  fs.mkdirSync(dir, { recursive: true });
  let settings = {};
  if (fs.existsSync(file)) {
    try { settings = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { console.warn('! .claude/settings.json không parse được — bỏ qua phần hook'); return false; }
  }
  if (!settings.hooks || typeof settings.hooks !== 'object') settings.hooks = {};
  const wanted = { SessionStart: 'hook session-start', Stop: 'hook stop' };
  let changed = false;
  for (const [event, sub] of Object.entries(wanted)) {
    if (!Array.isArray(settings.hooks[event])) settings.hooks[event] = [];
    if (JSON.stringify(settings.hooks[event]).includes('pm.mjs')) continue;
    settings.hooks[event].push({ hooks: [{ type: 'command', command: `node "${toPosix(pmBin)}" ${sub}` }] });
    changed = true;
  }
  if (changed) fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return changed;
}



function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) { (flags[a.slice(2, eq)] ||= []).push(a.slice(eq + 1)); continue; }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { (flags[key] ||= []).push(next); i++; }
      else (flags[key] ||= []).push(true);
    } else rest.push(a);
  }
  return { flags, rest };
}
const lastFlag = (o, k) => { const v = o.flags[k]; return Array.isArray(v) ? v[v.length - 1] : undefined; };

// ─────────────────────────────────────────────────────────── điều phối

const HELP = `pm — Agent PM

CÀI ĐẶT
  pm init    --world <tên>=<thư-mục-gốc> [--world …] [--account <tên>=<gh-login>]
             [--out <file>] [--depth 2] [--force]
             Quét thư mục gốc tìm git repo, sinh ~/.pm/worlds.yml
  pm setup   [--repo <đường-dẫn>] [--force] [--no-hooks]
             Cài .pm/flow.yml + .pm/config.json + khối pm trong AGENTS.md + hook Claude Code
  pm doctor  [--repo <đường-dẫn>] [--all] [--json] [--no-net]
             Kiểm tra framework, worlds, remote, tài khoản gh, quyền ghi, nhãn, flow, từng work-item
             (--no-net: bỏ qua các lần gọi GitHub, chạy nhanh và không cần mạng)

CÔNG VIỆC
  pm intake  "<text>" [--source <url>] [--title …] [--priority P1|P2|P3]
             [--routing ready-for-agent|ready-for-human] [--slug …] [--issue N]
             [--acceptance …] [--repo <đường-dẫn>] [--create] [--dry-run]
             Chuẩn hoá yêu cầu thô thành work-item. Mặc định chỉ in draft.
  pm next    [--repo <đường-dẫn> | --world work|personal|all] [--limit N] [--json]
             Việc kế tiếp nên làm (chưa ai nhặt, không bị chặn)
  pm claim   <id> [--type feat|fix|…] [--session <id>] [--checkout] [--force]
             Nhặt việc: nhãn + assignee, claimed_by trong plan.md, tạo nhánh
  pm release <id> [--reason "…"]      Nhả việc về hàng đợi
  pm note    <id> "<nội dung>"        Ghi tiến độ (log.md + comment lên Issue)
  pm handoff <id> [--session <id>]    Sinh handoff vào thư mục work-item
  pm env     <id> <main|develop|staging|prod> <none|cherry-picked|merged|verified|failed>
             [--pr N] [--sha X]       Cập nhật vị trí triển khai
  pm status  [--repo <đường-dẫn> | --world …] [--json]
             Bảng tổng hợp: vòng đời + bốn cờ môi trường
  pm sync    [--repo <đường-dẫn> | --all] [--dry-run]
             Đẩy file → GitHub; tạo Issue cho work-item còn ID tạm L-<n>
  pm archive <id> [--keep]            Đóng work-item, đóng Issue, chuyển vào plans/archive/
  pm adopt   [--list | <tên-thư-mục> | --all] [--issue N] [--dry-run]
             Đưa plan cũ (chưa theo schema pm) vào hệ thống
  pm hook    session-start | stop     Được Claude Code gọi tự động (không gọi tay)

  pm help · pm version

Quy ước: skills/pm/references/conventions.md · Thiết kế: docs/agent-pm/DESIGN.md`;

function main() {
  const [cmd = 'help', ...args] = process.argv.slice(2);
  try {
    switch (cmd) {
      case 'init': return cmdInit(args);
      case 'setup': return cmdSetup(args);
      case 'doctor': return cmdDoctor(args);
      case 'intake': return cmdIntake(args);
      case 'next': return cmdNext(args);
      case 'claim': return cmdClaim(args);
      case 'release': return cmdRelease(args);
      case 'note': return cmdNote(args);
      case 'handoff': return cmdHandoff(args);
      case 'env': return cmdEnv(args);
      case 'status': return cmdStatus(args);
      case 'sync': return cmdSync(args);
      case 'archive': return cmdArchive(args);
      case 'adopt': return cmdAdopt(args);
      case 'hook': return cmdHook(args);
      case 'help': case '--help': case '-h': console.log(HELP); return 0;
      case 'version': case '--version': console.log('pm 0.3.0'); return 0;
      default:
        console.error(`Không biết lệnh "${cmd}".\n`);
        console.log(HELP);
        return 2;
    }
  } catch (e) {
    console.error(`pm lỗi: ${e.message}`);
    if (process.env.PM_DEBUG) console.error(e.stack);
    return 1;
  }
}

process.exit(main());
