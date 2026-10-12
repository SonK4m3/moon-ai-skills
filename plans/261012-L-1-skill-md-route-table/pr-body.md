**Ticket:** L-1

## 📝 Summary

Gộp bốn bảng điều hướng rải rác trong `SKILL.md` thành một bảng khoá theo tình huống. File từ 102 xuống 72 dòng, không mất file references nào.

## 🛠️ Changes

- `[Refactor]` ♻️ Thay bốn chỗ chỉ đường riêng rẽ bằng một bảng **Đọc gì, khi nào** trong `skills/ledger/SKILL.md`
- `[Refactor]` ♻️ Trả hai khẳng định về dạng văn xuôi: phán đoán không ai làm hộ, và state là sự thật
- `[Feature]` ✨ Dùng `sổ` như từ xuyên suốt — tên skill trước đây chỉ nằm ở tiêu đề
- `[Bugfix]` 🐛 Khôi phục con trỏ tới `references/issue-format.md` mà bản gộp làm rơi (bắt bởi tiêu chí 3)

## 🔄 Behavior

**Khi agent đọc `SKILL.md` để tìm file cần mở:**

1. Trước: gặp bốn bảng chồng nhau, phải tự phân xử bảng nào thắng
2. Sau: một bảng khoá theo tình huống, tra một lần
3. Cả 7 file trong `references/` cộng `agents/ledger.md` vẫn tra được từ bảng đó

**Lưu ý:** Đây là thay đổi vào bề mặt agent đọc nên để `routing: ready-for-human`. Bốn lệnh `verify` trong `plans/261012-L-1-skill-md-route-table/plan.md` đã chạy thật; tiêu chí 3 **trượt lần đầu** và được sửa ở commit `38a5dbd` — giữ hai commit riêng để thấy tiêu chí làm việc. Chưa tạo được Issue vì `gh` chỉ có tài khoản work, còn tài khoản này chỉ có SSH; work-item dùng `id: L-1` + `sync_pending: true`.