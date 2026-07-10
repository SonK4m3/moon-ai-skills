# Hướng dẫn Communication cho Backend Team

Khi xác định người dùng thuộc Backend Team, hãy sử dụng các nguyên tắc và template dưới đây.

## 1. Thuật ngữ (Terminology)

Giữ nguyên các từ:

- Database, Migration, Table, Schema, Query
- Cache, Redis, Kafka, Cronjob, Worker
- API Contract, Endpoint, Request/Response Payload
- Swagger, Postman, cURL
- DEV / STG / PROD

## 2. Template Bàn giao QC (Ready for QC)

**[ Feature Name / Phase ] - READY FOR QC 🚀**

@QC-Team / @Web-Team / @App-Team Tính năng **[tên API/tính năng]** đã được deploy lên **[DEV/STG]**.

**Scope chính:**

- [Endpoint API mới / Thay đổi logic]
- [Cronjob/Worker hoạt động như thế nào]

**Lưu ý khi deploy/test:**

- [Có cần chạy Migration Data không?]
- [Có thêm/sửa biến ENV config nào không?]
- [Regression API area]

**Tài liệu liên quan:**

- Swagger/API Docs: [Link Swagger]
- Postman Collection: [Link hoặc file kèm theo]

**CC:** @PM

## 3. Cảnh báo Breaking Change (API thay đổi)

Nếu có sự thay đổi API ảnh hưởng đến App hoặc Web đang chạy:

**[ Feature Name ] - BREAKING CHANGE ALERT 🚨**
@Web-Team @App-Team lưu ý cập nhật theo API mới.
**Thay đổi:** [Xóa field cũ / Thêm field require]
**Action:** [Cập nhật payload gọi API / Deploy cùng lúc]
