# Ticket template (TOPX)

Copy khối dưới, điền, rồi đưa cho `scripts/new-ticket.ps1` hoặc post tay qua Jira wiki.

```text
h3. Tóm tắt
Một đoạn 2-3 câu: hành vi sai là gì, xảy ra khi nào, hậu quả với người dùng.

h3. Vì sao quan trọng
Impact thật: mất dữ liệu / sai quyền truy cập / chặn công việc / chỉ phiền mắt.
Nếu impact lớn hơn priority đang để thì nói rõ ở đây.

h3. Môi trường
* Sản phẩm / môi trường: EE | B2C, dev / staging / prod
* Build: số build hoặc commit đang chạy
* Tài khoản: email/role dùng để tái hiện
* Trình duyệt / thiết bị (nếu là lỗi UI)

h3. Các bước tái hiện
# Bước 1
# Bước 2
# Bước 3

h3. Kỳ vọng
Hành vi đúng, viết như một khẳng định kiểm chứng được.

h3. Thực tế
Hành vi đang thấy, không trộn với kỳ vọng, không suy đoán nguyên nhân.

h3. Bằng chứng
!screenshot.png!
Log / video / payload request nếu có.

h3. Acceptance criteria
* *AC-1* Given ..., When ..., Then ...
* *AC-2* Given ..., When ..., Then ...
```

## Checklist field

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| Summary | ✅ | `[PRODUCT-ENV][SURFACE] hành vi + điều kiện` |
| Description | ✅ | 4 mục: Steps, Expected, Actual, ENV |
| Issue type | ✅ | Bug / Story / Task / Sub-task |
| Priority | ✅ | Critical/ High · High · Medium · Low · Minor — kèm lý do |
| Reporter | tự động | người báo |
| Assignee | nếu biết | để trống nếu chưa phân công |
| Parent / links | Sub-task bắt buộc | relates/blocks nếu có liên quan |
| Labels | khuyến khích | `web`, `bookmark`, `trim-file`… |
| Attachment | với bug UI | ảnh/video tái hiện |

## Ví dụ điền (bug EE, dạng ngắn)

```text
h3. Tóm tắt
Khi note đang ở chế độ "Hạn chế" và còn danh sách người được mời, chuyển sang
"Công khai" thì FE vẫn gửi is_specific_enabled=true — hệ thống lưu chế độ hạn chế
trong khi người dùng tưởng đã public. Link share không mở được với người ngoài.

h3. Vì sao quan trọng
Sai lệch quyền truy cập chứ không phải lỗi hiển thị: người dùng chọn Công khai
nhưng note vẫn bị giới hạn.

h3. Môi trường
* Sản phẩm / môi trường: EE, báo cáo trên PROD-EE, fix kiểm trên EE dev
* Build: báo cáo gốc không ghi
* Tài khoản: báo cáo gốc không ghi

h3. Các bước tái hiện
# Mở 1 note, bấm Share, mời 1 người, chọn "Hạn chế", lưu
# Chuyển sang "Công khai" (vẫn còn người được mời), lưu
# Đóng hộp thoại Share rồi mở lại
# Copy link, mở ở cửa sổ ẩn danh

h3. Kỳ vọng
* Request gửi is_specific_enabled=false + is_public_enabled=true
* Mở lại vẫn thấy "Công khai"
* Link mở được ở cửa sổ ẩn danh

h3. Thực tế
* Request vẫn gửi is_specific_enabled=true
* Mở lại nhảy về "Hạn chế"
* Link không mở được với người ngoài
```

## Khi thiếu thông tin — placeholder, không bịa

Không tự chọn hành vi nghiệp vụ. Mục nào chưa có dữ liệu thì để nguyên và ghi đúng một chuỗi:

```text
<cần bổ sung tài liệu>
```

Kèm một dòng nói rõ cần ai/cái gì:

```text
h3. Các bước tái hiện
<cần bổ sung tài liệu> — QC xác nhận lại 3 bước trên bản PROD trước khi dev nhận.
```

Điều được phép khi viết lại một ticket thiếu:
- Giữ nguyên văn báo cáo gốc trong `{quote}` ở cuối (không sửa lỗi chính tả của người báo).
- Giữ nguyên attachment và comment cũ.
- Thêm phần "Cần bổ sung trước khi làm" liệt kê câu hỏi cụ thể.
- Thêm AC cho những gì **đã quan sát được**, không thêm AC cho luồng chưa ai mô tả.

Điều không được phép:
- Tự nghĩ ra bước tái hiện rồi trình bày như dữ kiện.
- Xoá mô tả cũ dù nó tệ.
- Đổi status/assignee/priority khi chưa được yêu cầu.

## Quy tắc viết AC cho ticket bug

- Mỗi AC chỉ một kết quả; không dùng "và" để nhồi 2 hành vi.
- Bắt buộc có: 1 AC happy path, 1 AC ca biên, 1 AC ca lỗi.
- Với bug đổi trạng thái/quyền: **phải có AC chiều ngược lại** — chiều ngược mới là chiều nguy hiểm (public nhầm thay vì private nhầm).
- Không viết AC bằng ngôn ngữ implementation (`gọi API X`, `setState Y`) — chỉ hành vi quan sát được.
