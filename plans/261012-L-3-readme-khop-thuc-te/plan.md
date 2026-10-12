---
id: L-3
issue: 4
title: "README khớp với thực tế repo"
project: "Dọn dẹp bộ skill ledger"
repo: SonK4m3/moon-ai-skills
branch: feat/L-3-readme-khop-thuc-te
status: in-progress
priority: P2
created: 2026-10-12
routing: needs-info
source: "trực tiếp — dọn dẹp sau khi đổi tên pm -> ledger"
requester: "chính mình"
claimed_by: "dsh@DESKTOP-SEC48UO#87ae"
claimed_at: "2026-10-13T00:21:56+07:00"
acceptance:
  - text: "Mọi đường dẫn nội bộ trong README.md đều tồn tại trong repo — không còn liên kết chết"
    verify: '$t = [regex]::Matches((Get-Content README.md -Raw), "\]\((\./[^)]+)\)") | ForEach-Object { $_.Groups[1].Value }; $miss = @($t | Where-Object { -not (Test-Path $_) }); "link=$($t.Count) missing=$($miss.Count)"; $miss   → mong đợi missing=0'
  - text: "Bảng Skills khớp thực tế: mọi thư mục có SKILL.md đều có một dòng, và không dòng nào trỏ tới thư mục không tồn tại"
    verify: '$root = (Get-Location).Path; $have = @(Get-ChildItem -Recurse -Filter SKILL.md skills | ForEach-Object { (Split-Path $_.FullName -Parent).Replace("$root\", "").Replace("\", "/") }); $want = @([regex]::Matches((Get-Content README.md -Raw), "\]\((\./skills/[^)]+)\)") | ForEach-Object { $_.Groups[1].Value.Substring(2) } | Where-Object { $_ -notmatch "references/" }); "thua=" + (($want | Where-Object { $have -notcontains $_ }) -join ",") + " thieu=" + (($have | Where-Object { $want -notcontains $_ }) -join ",")   → mong đợi thua= thieu='
  - text: "README không còn dấu vết của skill `pm` đã đổi tên hay CLI đã gỡ"
    verify: '(Select-String -Path README.md -Pattern "skills/pm|pm\.mjs|archive/pm-cli|\bpm\b" -AllMatches | Measure-Object).Count   → mong đợi 0'
  - text: "Mục Install giữ nguyên (ràng buộc out_of_scope) — diff so với gốc không chạm khoảng ## Install…## Domains"
    verify: '$base = git show 4eb42d4:README.md; $i1 = ($base | Select-String -Pattern "^## Install$").LineNumber; $i2 = ($base | Select-String -Pattern "^## Domains$").LineNumber; $h = @(git diff 4eb42d4 -- README.md | Select-String -Pattern "^@@ -(\d+)(?:,(\d+))?"); $touch = $false; foreach ($x in $h) { $s = [int]$x.Matches[0].Groups[1].Value; $c = if ($x.Matches[0].Groups[2].Success) { [int]$x.Matches[0].Groups[2].Value } else { 1 }; if ($s -le $i2 -and ($s + $c - 1) -ge $i1) { $touch = $true } }; "install=$i1-$i2 hunks=$($h.Count) install_touched=$touch"   → mong đợi install_touched=False'
scope: "README.md"
out_of_scope: "không sửa skills/** · không đổi mục Install nếu nó vẫn đúng"
sync_pending: true
env:
  main: { state: none }
  develop: { state: none }
  staging: { state: none }
  prod: { state: none }
---

# README khớp với thực tế repo

## Yêu cầu gốc

Dọn dẹp còn lại sau khi skill pm đổi tên thành ledger và CLI bị gỡ.

## Việc cần làm

Xem bốn tiêu chí trong frontmatter. Chạy đúng lệnh `verify` của từng tiêu chí **trước khi** nói xong.

## Nghiệm thu — tiêu chí gốc bị hỏng, đã dựng lại (2026-10-13)

Bốn tiêu chí gốc **không đọc được**. Frontmatter được sinh ra với `text` và `verify` là **từng ký tự rời**, và bản hỏng đó đã vào thẳng commit:

- `f86e395` (nhánh `feat/L-1-skill-md-route-table`) và bản cherry-pick `4eb42d4` trên `main` — **cả hai** mang bản hỏng, y hệt nhau.
- Hai work-item anh em cùng lỗi: `plans/261012-L-2-design-md-trang-thai-hien-tai/` và `plans/261012-L-4-hai-work-item-cu/`.
- Đã đi tìm bản lành: mọi nhánh, mọi worktree, `git fsck --dangling`, và session store của harness — **không có ở đâu**. Commit message của `f86e395` nói "Each carries four acceptance criteria with a runnable verify command", nhưng nội dung thật **chưa từng** vào repo. Tiêu chí gốc coi như mất, không phải "đọc kỹ sẽ ra".

Nguyên văn bản hỏng, giữ lại để đối chiếu:

```yaml
acceptance:
  - text: "M"
    verify: "ọ"
  - text: "f"
    verify: "o"
  - text: "K"
    verify: "h"
  - text: "g"
    verify: "r"
  - text: "S"
    verify: "ố"
  - text: "đ"
    verify: "ế"
```

(Cùng dấu vết ở phần thân: "lệnh  erify" — mất ký tự `v`.)

**Đã làm gì:** dựng lại **bốn** tiêu chí ở frontmatter từ đúng những gì plan này còn nói chắc được — `title`, `source` (dọn dẹp sau khi pm → ledger và CLI bị gỡ), `scope: README.md`, `out_of_scope`. Chúng **không phải** tiêu chí gốc, mà là bản agent tự viết để có cổng đo được — theo `formats.md` §2 luật 8: tiêu chí không có `verify` chạy được thì việc đầu tiên là dựng cổng chạy được, không phải bỏ qua.

Vì vậy `routing` đổi từ `ready-for-agent` sang **`needs-info`**: người yêu cầu phải xác nhận bốn tiêu chí dựng lại này, hoặc đưa lại tiêu chí gốc. Việc đã làm và đã đo, nhưng "có đúng cái anh muốn không" thì chỉ người trả lời được.

## Phạm vi

- **Trong:** README.md
- **Ngoài:** không sửa skills/** · không đổi mục Install nếu nó vẫn đúng

## Ghi chú

- sync_pending: true vì chưa tạo được Issue — gh chỉ có tài khoản work, tài khoản này chỉ có SSH.
- Luật 4: mở PR là quyền tự chủ, **merge thì phải hỏi người**.
- 2026-10-13 00:21 · claim bởi `dsh@DESKTOP-SEC48UO#87ae` · nhánh `feat/L-3-readme-khop-thuc-te` (đã có sẵn trong worktree `D:\Web\moon-L-3`).
- Kiểm tracker lại trước khi claim (không tin file): `gh auth status` → tài khoản `Sotatek-SonNguyen16`; `gh api repos/SonK4m3/moon-ai-skills --jq .permissions` → `{"admin":false,"maintain":false,"pull":true,"push":false,"triage":false}`. **Không tạo/sửa được Issue, nhãn hay assignee** (`push: false`) ⇒ nửa tracker của bộ ba claim không thực hiện được, `sync_pending` giữ `true`.
- `gh issue list --state all` chỉ có #1 và #2; không Issue nào cho `L-1`…`L-4` ⇒ **không ai giữ việc này**, được phép nhặt.