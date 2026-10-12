**Ticket:** L-3

## 📝 Summary

Sửa `README.md` khớp với thực tế repo: xoá một dòng bảng trỏ tới thư mục chưa từng được commit, khiến liên kết chết trên mọi bản clone.

## 🛠️ Changes

- `[Bugfix]` 🐛 Xoá dòng `astra-orchestrator` khỏi bảng `README.md` — trỏ `./skills/astra-luna-orchestrator`, thư mục **chưa từng có commit nào** (`git log --all --diff-filter=A` rỗng), chỉ nằm untracked ở một checkout. Liên kết chết từ `8ce75c8`, chính commit thêm nó
- `[Test]` 🧪 Thêm `plans/261012-L-3-readme-khop-thuc-te/evidence.md` — output thô của 4 cổng, chạy trước và sau khi sửa

## 🔄 Behavior

**Khi ai đó mở `README.md` trên GitHub:**

1. Trước: bảng Skills có 9 dòng nhưng một dòng trỏ tới thư mục không tồn tại → 404
2. Sau: 9 dòng, 9 thư mục có `SKILL.md`, 12/12 liên kết nội bộ sống
3. Mục `## Install` không bị chạm (0 hunk trong khoảng 24–55)

**🚨 BREAKING CHANGES:** Không.

**Lưu ý:** Hai điều cần người xác nhận.
1. Bốn tiêu chí nghiệm thu trong `plan.md` gốc **không đọc được** — mỗi `text`/`verify` chỉ còn một ký tự rời. Bản hỏng đã vào commit nên không lấy lại được từ git. Tôi dựng lại 4 tiêu chí đo được từ `title` + `source` + `scope`, chạy thật, và **hạ `routing` xuống `needs-info`** vì đây là bản tôi tự viết, không phải bản người yêu cầu.
2. Tôi **xoá dòng** thay vì commit thư mục, vì `out_of_scope` cấm đụng `skills/**`. Nếu muốn có lại dòng đó thì cần một work-item mới cho `skills/astra-luna-orchestrator/`.