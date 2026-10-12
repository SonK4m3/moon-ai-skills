**Ticket:** L-2

## 📝 Summary

Viết lại `docs/agent-ledger/DESIGN.md` từ 606 xuống 249 dòng: trạng thái hiện hành lên đầu, lịch sử gom về một chỗ, và mọi mục bị gộp đều có lệnh lấy lại nguyên văn.

## 🛠️ Changes

- `[Refactor]` ♻️ Thêm `## 0. Trạng thái hiện tại` ở đầu `DESIGN.md` — skill làm gì bây giờ, và ba việc chỉ `ledger` làm
- `[Refactor]` ♻️ Thêm bảng phân loại **còn hiệu lực / lịch sử** cho từng mục
- `[Refactor]` ♻️ Gom lịch sử `pm` → `ledger` và CLI về `§9`, kèm ba lệnh `git show` lấy lại
- `[Feature]` ✨ Thêm `§13.2` — lệnh lấy lại **từng mục** của bản 606 dòng, đã chạy thật 4/4 xanh
- `[Bugfix]` 🐛 Sửa hai câu sai có sẵn trong tài liệu: hai blob `pm.mjs` **không** cùng nội dung (85496 vs 85539 byte); `.gitignore` mất **3** dòng không phải 2

## 🔄 Behavior

**Khi một người mới mở `DESIGN.md`:**

1. Trước: 606 dòng, phải đọc hết mới biết phần nào còn dùng được
2. Sau: `§0` trả lời trong 20 dòng đầu; bảng phân loại cho biết mục nào là lịch sử
3. Mục nào bị gộp thì `§13.2` có lệnh lấy lại nguyên văn

**Lưu ý:** Không đụng `skills/ledger/**` (0 file). Ba chủ đề từng bị bỏ sót ở vòng một — *"Những gì không xây"*, *"Rủi ro & cách chống"*, `worlds.yml` — đã khôi phục sau review. Một lỗi tự gây đã tự sửa: bản đầu dùng `awk` để cắt dòng mà Windows không có `awk`, nên cả 5 lệnh không chạy được; đã thay bằng `git show` + cắt theo dòng và chạy lại toàn bộ.