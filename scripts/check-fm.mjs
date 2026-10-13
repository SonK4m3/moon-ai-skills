// Kiem tra frontmatter plan.md -- lop pham vi cho guardrail cua repo nay.
//
// Toan bo viec kiem nam o skills/ledger/scripts/wm.mjs. File nay chi quyet dinh
// KIEM NHUNG FILE NAO. Mot ban kiem, hai loi goi: `npm run check:fm` o day, va
// `node wm.mjs validate` trong repo da cai ledger. Chung khong the lech nhau.
//
// TOAN BO FILE NAY LA ASCII, CO Y. Thong bao loi khong dau vi console Windows
// doi encoding theo codepage. Giu nguyen quy uoc nay khi sua.
//
// Dung: node scripts/check-fm.mjs [file...]
//       node scripts/check-fm.mjs              -> tu quet plans/*/plan.md
//       node scripts/check-fm.mjs --staged     -> chi plan.md da stage (pre-commit hook)
//       node scripts/check-fm.mjs --base <ref> -> chi plan.md doi so voi <ref> (CI)
//
// --base khong resolve duoc thi exit 1, KHONG exit 0: mot guardrail im lang
// khong chay con te hon khong co guardrail nao.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateFrontmatter } from '../skills/ledger/scripts/wm.mjs';

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

for (const file of files) {
  console.log(`== ${file}`);
  const r = validateFrontmatter(readFileSync(file, 'utf8'));
  for (const x of r.fails) { failed++; console.log(`  FAIL ${file}:${x.line} ${x.msg}`); }
  for (const x of r.warns) { warned++; console.log(`  warn ${file}:${x.line} ${x.msg}`); }
  if (r.doc) console.log(`  parsed ok - ${r.topKeys.length} key: ${r.topKeys.join(', ')}`);
}

console.log(
  failed === 0
    ? `\nRESULT: PASS (0 loi, ${warned} warn, ${files.length} file)`
    : `\nRESULT: ${failed} loi, ${warned} warn, ${files.length} file`,
);
process.exit(failed === 0 ? 0 : 1);
