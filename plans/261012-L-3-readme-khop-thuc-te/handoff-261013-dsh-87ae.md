# Handoff — L-3 · dsh@DESKTOP-SEC48UO#87ae · 2026-10-13

## Đã làm

- **Claim** (trước khi sửa `README.md`): `status: in-progress`, `claimed_by: dsh@DESKTOP-SEC48UO#87ae`, `claimed_at: 2026-10-13T00:21:56+07:00`, thêm dòng `log.md`. Nhánh `feat/L-3-readme-khop-thuc-te` đã có sẵn trong worktree `D:\Web\moon-L-3`. Commit `5d1ae15`.
- **Dựng lại cổng nghiệm thu**: bốn tiêu chí gốc trong frontmatter bị hỏng (mỗi `text`/`verify` là **một ký tự rời**, ví dụ `text: "M"` / `verify: "ọ"`). Bản hỏng đã vào commit — `f86e395` (nhánh L-1) và bản cherry-pick `4eb42d4` (`main`) giống nhau từng ký tự; `L-2` và `L-4` cũng vậy. Đã dựng lại 4 tiêu chí đo được từ `title` + `source` + `scope`/`out_of_scope`, giữ nguyên văn bản hỏng trong thân plan để đối chiếu, và đổi `routing: ready-for-agent` → **`needs-info`**. Commit `5d1ae15`.
- **Sửa README**: xoá **một** dòng trong bảng Skills — dòng `astra-orchestrator` trỏ tới `./skills/astra-luna-orchestrator`, thư mục **chưa từng** được commit trên bất kỳ nhánh nào (`git log --all --diff-filter=A -- skills/astra-luna-orchestrator` rỗng; nó chỉ nằm untracked ở checkout chính `D:\Web\moon-ai-skills`). Dòng đó là liên kết chết từ `8ce75c8` — chính commit thêm nó. Commit `4a07e26`.
- **Chạy thật cả bốn cổng**, hai lần (trước và sau khi sửa README); output thô nằm nguyên trong `evidence.md`. Cổng 1 và 2 **trượt** trước khi sửa (`missing=1`; `thua=skills/astra-luna-orchestrator`) và **đạt** sau khi sửa (`link=12 missing=0`; `thua= thieu=`).

## Còn lại

- [ ] Người xác nhận **bốn tiêu chí dựng lại** (hoặc đưa lại tiêu chí gốc) — đây là toàn bộ lý do `routing: needs-info`.
- [ ] Quyết số phận skill `astra-orchestrator`: nếu muốn nó có trong README thì phải commit `skills/astra-luna-orchestrator/` (ngoài scope của work-item này, `out_of_scope` cấm sửa `skills/**`), rồi thêm lại **một** dòng vào bảng Skills.
- [ ] Tạo Issue thật khi có tài khoản `gh` quyền ghi, rồi chạy `sync` (`formats.md` §5.9): đổi `id: L-3` → `GH-<số>`, đổi tên thư mục, xoá `sync_pending`.
- [ ] Mở PR vào `main` nếu người muốn. Nhánh này **chưa push**, theo yêu cầu của phiên cha (commit-only).
- [ ] `env` giữ nguyên bốn cờ `none` — chưa có gì lên môi trường nào; lên `develop`/`staging` là việc phải hỏi người (luật 4).

## File và đường dẫn chính xác

- `README.md` — đã sửa: xoá 1 dòng (dòng 12 bản gốc). 12 liên kết nội bộ còn lại đều tồn tại; bảng Skills = đúng 9 skill có `SKILL.md`.
- `plans/261012-L-3-readme-khop-thuc-te/plan.md` — claim + 4 tiêu chí dựng lại + mục "Nghiệm thu — tiêu chí gốc bị hỏng, đã dựng lại".
- `plans/261012-L-3-readme-khop-thuc-te/log.md` — 3 dòng (intake, claim, note).
- `plans/261012-L-3-readme-khop-thuc-te/evidence.md` — 4 lệnh verify nguyên văn + output thô hai lần chạy + diff README.
- `plans/261012-L-3-readme-khop-thuc-te/handoff-261013-dsh-87ae.md` — file này.
- Ngoài repo (không commit): `%TEMP%\l3-verify.ps1` — script sinh tự động từ `acceptance` trong `plan.md`; `%TEMP%\l3-verify-BEFORE.txt`, `l3-verify-AFTER.txt` — output thô.
- Cảnh báo: `D:\Web\moon-ai-skills\check-fm.mjs` (untracked ở checkout chính) **treo vô hạn** — vòng `while` trong đó không tăng `i` khi gặp scalar một dòng. Đừng dùng lại; muốn kiểm frontmatter thì parse bằng YAML thật (`python -c "import yaml"` có sẵn, PyYAML 6.0.3).

## Quyết định đã chốt

- **Tiêu chí gốc coi như mất**, không phải "đọc kỹ sẽ ra": đã tìm mọi nhánh, mọi worktree, `git fsck --dangling`, và session store của harness — không có bản lành. Commit message của `f86e395` nói có bốn tiêu chí kèm lệnh verify, nhưng nội dung thật chưa từng vào repo.
- **Dựng lại cổng rồi mới làm**, theo `formats.md` §2 luật 8; và **nói ra** rằng đây là bản agent tự viết, nên `routing` xuống `needs-info` thay vì tự nhận "xong".
- **Xoá dòng `astra-orchestrator` khỏi README** thay vì commit skill: `out_of_scope` cấm sửa `skills/**`, nên bên phải sửa là README. Thông tin không mất — nằm ở đây và ở commit message `4a07e26`.
- **Không tạo Issue, không push, không mở PR**: `gh` chỉ có quyền đọc (`permissions.push: false`), tạo Issue sẽ kéo theo đổi `id` + đổi tên thư mục work-item (việc người quyết), và phiên cha yêu cầu commit-only.
- **Giữ `sync_pending: true`** — vẫn đúng: chưa có Issue nào cho `L-3`.

## Cản trở

- `gh` đăng nhập bằng `Sotatek-SonNguyen16` với quyền **đọc** trên `SonK4m3/moon-ai-skills` (`{"pull":true,"push":false}`) ⇒ không tạo được Issue, không gán nhãn `in-progress`, không gán assignee. Nửa tracker của bộ ba claim không thực hiện được.
- Tiêu chí gốc mất ⇒ chỉ người yêu cầu xác nhận được "có đúng cái anh muốn không".
- Skill `astra-orchestrator` nằm ngoài repo (untracked ở checkout chính) ⇒ muốn README có lại dòng đó thì phải commit `skills/astra-luna-orchestrator/`, việc này ngoài scope.

## Skill nên gọi tiếp

- Người xác nhận bốn tiêu chí → nếu đồng ý: `/pr` để mở PR vào `main` (sau khi push nhánh), rồi `/code-review` nếu muốn soi lại.
- Sau khi merge: `formats.md` §5.9 `sync` để tạo Issue thật và đổi `id`; §5.6 `env` khi cần đưa lên `develop`/`staging` (phải hỏi người).
- Nếu chốt giữ dòng astra trong README: mở work-item mới, scope `skills/astra-luna-orchestrator/` + `README.md`.
- Cùng lỗi frontmatter ở `L-2` và `L-4`: hai phiên kia nên xử theo đúng cách ở đây (dựng lại cổng, nói ra, đổi routing).

## Lệnh chạy tiếp theo

```powershell
# tại gốc worktree D:\Web\moon-L-3, PowerShell 5.1
& "$env:TEMP\l3-verify.ps1"          # chạy lại đúng 4 cổng nghiệm thu
git --no-pager log --oneline 4eb42d4..HEAD   # 3 commit của work-item này
git --no-pager diff 4eb42d4 -- README.md     # thay đổi duy nhất ngoài plans/
```
