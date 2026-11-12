# Ví dụ ticket mẫu

## 1. Bug EE — có fix rồi, ticket đang chờ test (TOPX-303)

**Summary**: `[PROD-EE][web][share] Gửi sai is_specific_enabled khi chuyển share sang Công khai`

```text
h3. Tóm tắt
Khi note ở chế độ "Hạn chế" và còn danh sách người được mời, chuyển sang "Công khai"
thì FE vẫn gửi is_specific_enabled=true — hệ thống lưu chế độ hạn chế, link share
không mở được với người ngoài.

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

h3. Bằng chứng
!image-2026-11-06-14-07-04-893.png!
```

Điểm đáng học: có **AC chiều ngược lại** (Công khai → Hạn chế) vì chiều đó mới là rủi ro bảo mật.

## 2. Bug B2C — hành vi hiển thị sai (TOPX-151)

**Summary**: `[PROD][WEB] Mở link note public có mật khẩu hiện "Yêu cầu truy cập" thay vì ô nhập mật khẩu`

```text
h3. Các bước tái hiện
# Tạo note, bật share public, đặt mật khẩu
# Copy link, mở ở cửa sổ ẩn danh (chưa đăng nhập)
# Nhập mật khẩu đúng

h3. Kỳ vọng
* Bước 2: hiện ô nhập mật khẩu
* Bước 3: mở được note
* Nhập sai: báo "Mật khẩu bạn nhập không chính xác." ngay trên form

h3. Thực tế
* Bước 2: hiện màn "Yêu cầu truy cập" — không có chỗ nhập mật khẩu
```

## 3. Story — tính năng mới (Change Password)

**Summary**: `[B2C][WEB] Change Password cho user đăng nhập email + password`

```text
h3. User story
Là user đăng nhập bằng email + password, tôi muốn đổi mật khẩu trong màn cài đặt
tài khoản, để tự bảo vệ tài khoản mà không phải liên hệ support.

h3. Phạm vi
Trong: form đổi mật khẩu trên web B2C.
Ngoài: Delete Account (ticket riêng), App (ticket riêng).
Đối chiếu: EE đã có trên production — hành vi EE là reference.

h3. Acceptance criteria
* AC-1 Given ... When ... Then ...
(xem docs/topx-338-ac-change-password.md cho bản đầy đủ 35 AC)
```

## 4. Ticket rỗng — không được bịa

**TOPX-207** `[EE][WEB] regenerate transcript` — description trống, parent cũng trống, 0 comment.

Sai: tự nghĩ ra luồng regenerate transcript rồi viết AC.
Đúng: tạo ticket ở trạng thái hiện tại + ghi rõ cái đã biết và cái còn thiếu:

```text
h3. Hiện trạng
Ticket được tách từ TOPX-204 ([EE] Regenerate transcript) nhưng chưa có mô tả,
chưa có design, API BE (TOPX-205) mới In Progress.

h3. Cần bổ sung trước khi làm
# Luồng người dùng: regenerate ở đâu, cho note nào, giới hạn bao nhiêu lần
# Dữ liệu cũ xử lý thế nào (ghi đè hay tạo bản mới)
# Điều kiện lỗi: transcript quá dài, note đang xử lý, hết quota
```

Nguyên tắc: **không tự chọn hành vi nghiệp vụ**. Thiếu thì hỏi, không đoán.

## 5. Checklist trước khi submit

- [ ] Summary có tag `[PRODUCT-ENV][SURFACE]`
- [ ] Có Steps, Expected, Actual, ENV
- [ ] Expected và Actual không trộn
- [ ] Có 5–8 AC, gồm ca biên và ca lỗi
- [ ] Ảnh/video đính kèm nếu là lỗi UI
- [ ] Không gộp 2 việc trong 1 ticket
- [ ] Nếu là Sub-task: đã có parent và mô tả riêng
