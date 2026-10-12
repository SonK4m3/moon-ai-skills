**Ticket:** L-4

## 📝 Summary

Chốt số phận hai work-item còn treo từ trước khi `pm` đổi tên thành `ledger`, và đưa chúng vào git lần đầu.

## 🛠️ Changes

- `[Refactor]` ♻️ `plans/261012-1-quickstart-pm/` → `status: cancelled`; `skills/pm/SKILL.md` không còn, nhánh có 0 commit, `acceptance` là chuỗi nên không thể `ready-for-agent`
- `[Refactor]` ♻️ `plans/261012-2-quyet-dinh-hai-thu-muc/` → `status: cancelled` **bản ghi**, không huỷ vấn đề: `react-component-preview/` và `skills/astra-luna-orchestrator/` vẫn chưa commit
- `[Test]` 🧪 Thêm `evidence.md` 236 dòng — output thô ba cổng, audit từng hit `pm`, và cảnh báo merge

## 🔄 Behavior

**Khi một phiên sau đọc `plans/`:**

1. Trước: hai thư mục **không nằm trong git**, chỉ tồn tại ở một checkout — worktree khác không thấy
2. Sau: cả hai được track, có `status` kết thúc, và mỗi cái có dòng log giải thích vì sao
3. Cảnh báo merge nằm trong `evidence.md`

**Lưu ý:** Ba điểm cần người quyết.
1. `gh` chỉ có quyền đọc (`push: false`) ⇒ Issue #1 và #2 vẫn OPEN, không nhãn, không assignee. Đóng #1 là việc của người.
2. Nhánh này **track hai thư mục lần đầu**, nên checkout chính còn bản untracked của chúng ⇒ merge sẽ báo `untracked working tree files would be overwritten` cho tới khi người dọn `D:\Web\moon-ai-skills\plans\261012-1-*` và `-2-*`.
3. Quyết định đầu của phiên là "giữ GH-2 `pending`" — sai với tiêu chí 1; đã sửa và để **dòng đính chính** trong `log.md` thay vì sửa dòng cũ.