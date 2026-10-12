# Bằng chứng nghiệm thu — L-3

Nhánh `feat/L-3-readme-khop-thuc-te`, worktree `D:\Web\moon-L-3`, PowerShell 5.1.
Bốn lệnh dưới đây lấy **nguyên văn** từ `acceptance` trong `plan.md` (cắt phần `→ mong đợi` để lại cho người đọc), chạy tại gốc repo.

## Bốn lệnh verify

1. **Mọi đường dẫn nội bộ trong README.md đều tồn tại trong repo — không còn liên kết chết**

   ```powershell
   $t = [regex]::Matches((Get-Content README.md -Raw), "\]\((\./[^)]+)\)") | ForEach-Object { $_.Groups[1].Value }; $miss = @($t | Where-Object { -not (Test-Path $_) }); "link=$($t.Count) missing=$($miss.Count)"; $miss
   ```

2. **Bảng Skills khớp thực tế: mọi thư mục có SKILL.md đều có một dòng, và không dòng nào trỏ tới thư mục không tồn tại**

   ```powershell
   $root = (Get-Location).Path; $have = @(Get-ChildItem -Recurse -Filter SKILL.md skills | ForEach-Object { (Split-Path $_.FullName -Parent).Replace("$root\", "").Replace("\", "/") }); $want = @([regex]::Matches((Get-Content README.md -Raw), "\]\((\./skills/[^)]+)\)") | ForEach-Object { $_.Groups[1].Value.Substring(2) } | Where-Object { $_ -notmatch "references/" }); "thua=" + (($want | Where-Object { $have -notcontains $_ }) -join ",") + " thieu=" + (($have | Where-Object { $want -notcontains $_ }) -join ",")
   ```

3. **README không còn dấu vết của skill `pm` đã đổi tên hay CLI đã gỡ**

   ```powershell
   (Select-String -Path README.md -Pattern "skills/pm|pm\.mjs|archive/pm-cli|\bpm\b" -AllMatches | Measure-Object).Count
   ```

4. **Mục Install giữ nguyên (ràng buộc out_of_scope) — diff so với gốc không chạm khoảng ## Install…## Domains**

   ```powershell
   $base = git show 4eb42d4:README.md; $i1 = ($base | Select-String -Pattern "^## Install$").LineNumber; $i2 = ($base | Select-String -Pattern "^## Domains$").LineNumber; $h = @(git diff 4eb42d4 -- README.md | Select-String -Pattern "^@@ -(\d+)(?:,(\d+))?"); $touch = $false; foreach ($x in $h) { $s = [int]$x.Matches[0].Groups[1].Value; $c = if ($x.Matches[0].Groups[2].Success) { [int]$x.Matches[0].Groups[2].Value } else { 1 }; if ($s -le $i2 -and ($s + $c - 1) -ge $i1) { $touch = $true } }; "install=$i1-$i2 hunks=$($h.Count) install_touched=$touch"
   ```

## Lần chạy 1 — TRƯỚC khi sửa README (nhánh ở commit `5d1ae15`)

```text
=== VERIFY 1: Mọi đường dẫn nội bộ trong README.md đều tồn tại trong repo — không còn liên kết chết ===
link=13 missing=1
./skills/astra-luna-orchestrator
--- exit=0 ---
=== VERIFY 2: Bảng Skills khớp thực tế: mọi thư mục có SKILL.md đều có một dòng, và không dòng nào trỏ tới thư mục không tồn tại ===
thua=skills/astra-luna-orchestrator thieu=
--- exit=0 ---
=== VERIFY 3: README không còn dấu vết của skill pm đã đổi tên hay CLI đã gỡ ===
0
--- exit=0 ---
=== VERIFY 4: Mục Install giữ nguyên (ràng buộc out_of_scope) — diff so với gốc không chạm khoảng ## Install…## Domains ===
install=24-55 hunks=0 install_touched=False
--- exit=0 ---
```

## Lần chạy 2 — SAU khi sửa README

```text
=== VERIFY 1: Mọi đường dẫn nội bộ trong README.md đều tồn tại trong repo — không còn liên kết chết ===
link=12 missing=0
--- exit= ---
=== VERIFY 2: Bảng Skills khớp thực tế: mọi thư mục có SKILL.md đều có một dòng, và không dòng nào trỏ tới thư mục không tồn tại ===
thua= thieu=
--- exit= ---
=== VERIFY 3: README không còn dấu vết của skill pm đã đổi tên hay CLI đã gỡ ===
0
--- exit= ---
=== VERIFY 4: Mục Install giữ nguyên (ràng buộc out_of_scope) — diff so với gốc không chạm khoảng ## Install…## Domains ===
install=24-55 hunks=1 install_touched=False
--- exit=0 ---
```

## Diff README so với gốc `4eb42d4`

```diff
diff --git a/README.md b/README.md
index ddbcf4e..fa15b43 100644
--- a/README.md
+++ b/README.md
@@ -9,7 +9,6 @@ Works with Claude Code, OpenCode, Kiro, Antigravity, Codex, and any agent that s
 | Skill | Domain | Description |
 |-------|--------|-------------|
 | [`ledger`](./skills/ledger) | Workflow | Giữ sổ công việc: chuẩn hoá yêu cầu từ Chat thành work-item, theo dõi mỗi việc đã tới môi trường nào, nói hôm nay nên làm gì |
-| [`astra-orchestrator`](./skills/astra-luna-orchestrator) | Orchestration | Orchestrate complex Codex work with root planner/integrator, Luna subagents, and an Astra reviewer |
 | [`tech-team-chat-communication`](./skills/tech-team-chat-communication) | Workflow | Viết message/reply trên Google Chat theo vai trò Lead hoặc Member |
 | [`feature-design`](./skills/engineering/feature-design) | Engineering | Design software features from requirements |
 | [`feature-layer-pattern`](./skills/engineering/feature-layer-pattern) | Engineering | 5-layer feature module pattern (types→api→keys→queries→mutations→store) |
```

## Ghi chú cách đọc

- Cổng 1, 2, 3 là cmdlet PowerShell thuần nên **không** đặt `$LASTEXITCODE`; giá trị quyết định là thứ in ra: `missing=`, cặp `thua=/thieu=`, và số `0`. Lần chạy 1 in `exit=0` cho cả bốn chỉ vì ngay trước đó cùng phiên có chạy `git branch` (lệnh native đặt `$LASTEXITCODE`); lần chạy 2 không có lệnh native nào trước đó nên ba cổng đầu để trống. Cả hai đều **không phải** kết quả của cổng.
- Cổng 1 và 2 **trượt ở lần chạy 1** (`missing=1`, `thua=skills/astra-luna-orchestrator`) rồi **đạt ở lần chạy 2** — đó là bằng chứng cổng đo được cái nó định đo, không phải cổng luôn xanh.
- Cổng 3 và 4 xanh ở cả hai lần: đây là hai cổng chống hồi quy (không còn dấu vết `pm`/CLI; mục Install không bị chạm).
- `install=24-55` là khoảng dòng `## Install`…`## Domains` của README gốc; `hunks=1` là hunk xoá dòng `astra-orchestrator` nằm ngoài khoảng đó.
