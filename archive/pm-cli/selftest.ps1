# pm selftest — dựng một repo giả có lỗi cố ý, rồi kiểm tra `pm doctor` bắt đúng.
# Chạy:  & .\skills\pm\scripts\selftest.ps1        (Windows PowerShell 5.1 hoặc pwsh)
#        pwsh -File skills/pm/scripts/selftest.ps1
$PSNativeCommandUseErrorActionPreference = $false
# PS 5.1 biến stderr của lệnh native (kể cả cảnh báo CRLF vô hại của git) thành
# ErrorRecord. Để 'Stop' thì script tự chết vì một cảnh báo — nên kiểm lỗi bằng
# $LASTEXITCODE, không bằng ErrorActionPreference.
$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$pm  = Join-Path $PSScriptRoot 'pm.mjs'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$fx  = Join-Path $repo '.pm-tmp\fixture-repo'

if (Test-Path $fx) { Remove-Item -Recurse -Force $fx }
New-Item -ItemType Directory -Force -Path $fx | Out-Null
git -C $fx init -q *> $null
git -C $fx remote add origin 'git@github-example-account:example-org/fixture-repo.git' *> $null
node $pm setup --repo $fx *> $null

$utf8 = New-Object System.Text.UTF8Encoding($false)
function W($rel, $text) {
  $p = Join-Path $fx $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $p) | Out-Null
  [System.IO.File]::WriteAllText($p, $text, $utf8)
}

# 1. hợp lệ, nhưng claim đã 10 ngày mà chưa có handoff  -> warn
W 'plans\260101-142-note-detail-quota\plan.md' @'
---
id: GH-142
title: 'Note detail - quota'
status: in-progress
priority: P1
created: 2026-01-01
routing: ready-for-agent
branch: feat/142-note-detail-quota
claimed_by: codex@SON-PC#a1b2
claimed_at: 2026-01-01T09:00:00+07:00
env:
  main: { state: merged, pr: 87, sha: 1a2b3c4 }
  develop: { state: none }
---
# Note detail - quota
'@
# 2. in-progress nhưng chưa claim  -> fail
W 'plans\260103-151-save-button\plan.md' @'
---
id: GH-151
title: 'Save button disabled when note empty'
status: in-progress
priority: P2
created: 2026-01-03
routing: ready-for-agent
---
# Save button
'@
# 3. id lệch số thư mục  -> fail
W 'plans\260104-143-wrong-number\plan.md' @'
---
id: GH-142
title: 'Wrong dir number'
status: pending
priority: P3
created: 2026-01-04
---
# mismatch
'@
# 4. plan cũ không theo schema  -> bỏ qua, không chặn
W 'plans\260908-recording-reliability\plan.md' @'
# Recording reliability plan
Date: 2026-09-08
Status: in progress
'@

git -C $fx add -A *> $null
git -C $fx -c user.email=pm@local -c user.name=pm commit -qm "fixture" *> $null
git -C $fx branch feat/142-note-detail-quota *> $null
(Get-Item (Join-Path $fx 'plans\260101-142-note-detail-quota\plan.md')).LastWriteTime = (Get-Date).AddDays(-10)

$out = node $pm doctor --repo $fx --json --no-net
$data = $out | ConvertFrom-Json

# Bám vào các mốc ASCII, không bám vào tiếng Việt: console Windows có thể đổi
# encoding khiến chuỗi tiếng Việt trong JSON bị méo.
$expected = @(
  @{ level = 'fail'; has = 'claimed_by';        what = 'in-progress nhung thieu claimed_by' },
  @{ level = 'fail'; has = 'wrong-number';      what = 'id lech so thu muc' },
  @{ level = 'warn'; has = 'note-detail-quota'; what = 'claim lau ma chua co handoff' }
)

$bad = 0
foreach ($e in $expected) {
  $hit = @($data.checks | Where-Object { $_.level -eq $e.level -and $_.msg -like "*$($e.has)*" })
  if ($hit.Count -ge 1) { Write-Host "  [dat]  $($e.level): $($e.what)" -ForegroundColor Green }
  else { Write-Host "  [HONG] mong doi $($e.level) cho '$($e.what)' nhung khong thay" -ForegroundColor Red; $bad++ }
}

$fails = @($data.checks | Where-Object { $_.level -eq 'fail' }).Count
if ($fails -ne 2) { Write-Host "  [HONG] mong doi dung 2 fail, thay $fails" -ForegroundColor Red; $bad++ }
else { Write-Host "  [dat]  dung 2 fail" -ForegroundColor Green }

$wi = $data.summaries[0].workItems
if ($wi -ne 3) { Write-Host "  [HONG] mong doi 3 work-item theo schema, thay $wi" -ForegroundColor Red; $bad++ }
else { Write-Host "  [dat]  3 work-item theo schema" -ForegroundColor Green }

# ── Phần 2: vòng đời đầy đủ trên repo sạch ──────────────────────────────
Write-Host "`n-- vong doi: intake -> claim -> note -> handoff -> env -> archive --" -ForegroundColor Cyan
# PS 5.1 biến stderr của lệnh native thành ErrorRecord; để 'Stop' sẽ giết script
# ngay khi git/node chỉ *cảnh báo*. Từ đây kiểm lỗi bằng $LASTEXITCODE.
$ErrorActionPreference = 'Continue'
$fx2 = Join-Path $repo '.pm-tmp\lifecycle-repo'
if (Test-Path $fx2) { Remove-Item -Recurse -Force $fx2 }
New-Item -ItemType Directory -Force -Path $fx2 | Out-Null
git -C $fx2 init -q *> $null
git -C $fx2 remote add origin 'git@github-example-account:example-org/fixture-repo.git' *> $null
[System.IO.File]::WriteAllText("$fx2\README.md", "# fixture`n", $utf8)
git -C $fx2 add -A *> $null
git -C $fx2 -c user.email=pm@local -c user.name=pm commit -qm init *> $null
node $pm setup --repo $fx2 *> $null
[System.IO.File]::WriteAllText("$fx2\req.txt", "Can noi kiem tra chung cho nhieu session AI`nBiet task nao da co session nhat`n", $utf8)

function Step($name, [scriptblock]$body) {
  & $body *> $null
  if ($LASTEXITCODE -eq 0) { Write-Host "  [dat]  $name" -ForegroundColor Green }
  else { Write-Host "  [HONG] $name (exit $LASTEXITCODE)" -ForegroundColor Red; $script:bad++ }
}
function Assert($name, $cond) {
  if ($cond) { Write-Host "  [dat]  $name" -ForegroundColor Green }
  else { Write-Host "  [HONG] $name" -ForegroundColor Red; $script:bad++ }
}

Step 'intake --create' { node $pm intake --from-file "$fx2\req.txt" --create --repo $fx2 --title "Noi kiem tra chung" --priority P1 }
Step 'next'            { node $pm next --repo $fx2 }
Step 'claim'           { node $pm claim L-1 --repo $fx2 }
Step 'note'            { node $pm note L-1 "tien do 1" --repo $fx2 }
Step 'handoff'         { node $pm handoff L-1 --repo $fx2 }
Step 'env main'        { node $pm env L-1 main merged --pr 1 --sha abc1234 --repo $fx2 }
Step 'doctor sach'     { node $pm doctor --repo $fx2 --no-net }
Step 'hook stop sau handoff (phai im)' { Push-Location $fx2; node $pm hook stop; Pop-Location }

$itemDir = Get-ChildItem (Join-Path $fx2 'plans') -Directory | Select-Object -First 1
Assert 'plan.md duoc tao'          (Test-Path (Join-Path $itemDir.FullName 'plan.md'))
Assert 'log.md co >= 3 dong'       ((Get-Content (Join-Path $itemDir.FullName 'log.md')).Count -ge 3)
Assert 'handoff-*.md duoc tao'     (@(Get-ChildItem $itemDir.FullName -Filter 'handoff-*.md').Count -eq 1)
Assert 'env main = merged'         ((Get-Content (Join-Path $itemDir.FullName 'plan.md') -Raw) -match 'main:\s*\{\s*state:\s*merged')
Assert 'claimed_by da ghi'         ((Get-Content (Join-Path $itemDir.FullName 'plan.md') -Raw) -match 'claimed_by:')
git -C $fx2 rev-parse --verify --quiet 'refs/heads/feat/1-noi-kiem-tra-chung' *> $null
$branchOk = ($LASTEXITCODE -eq 0)
Assert 'nhanh feat/1-* da tao'     $branchOk
Assert 'AGENTS.md co khoi pm'      ((Get-Content (Join-Path $fx2 'AGENTS.md') -Raw) -match '<!-- pm:start -->')
Assert 'hook da ghi vao settings'  ((Get-Content (Join-Path $fx2 '.claude\settings.json') -Raw) -match 'hook session-start')

Step 'archive'         { node $pm archive L-1 --repo $fx2 }
Assert 'archive chuyen thu muc'    (Test-Path (Join-Path $fx2 "plans\archive\$($itemDir.Name)"))
Assert 'archive danh dau completed' ((Get-Content (Join-Path $fx2 "plans\archive\$($itemDir.Name)\plan.md") -Raw) -match 'status:\s*completed')

if ($bad -eq 0) { Write-Host "`nSELFTEST DAT" -ForegroundColor Green; exit 0 }
Write-Host "`nSELFTEST HONG ($bad)" -ForegroundColor Red; exit 1
