---
name: write-pr-description
description: Hỗ trợ tạo pull request và mô tả những thay đổi trong PR theo template chuẩn, chuyên nghiệp. Sử dụng skill này khi người dùng muốn tạo PR hoặc tóm tắt các thay đổi cho một PR.
---

# Pull Request Creator Skill

Khi được yêu cầu tạo mô tả cho một pull request (PR) hoặc tóm tắt các thay đổi của code, bạn PHẢI phân tích các thay đổi đó và tạo ra một bản mô tả sử dụng CHÍNH XÁC định dạng dưới đây. Luôn tuân thủ các quy tắc về formatting, emoji và phân loại thay đổi.

## Template

```markdown
[**Ticket:** MÃ-TICKET (nếu có nhắc đến trong prompt)]

## 📝 Summary

[Viết tối đa 3 dòng. Bắt đầu thẳng bằng động từ mạnh (Bổ sung, Sửa lỗi, Tối ưu hóa, v.v.), không dùng câu dẫn dắt rườm rà. Giải thích vấn đề được giải quyết hoặc tính năng được thêm vào.]

## 🛠️ Changes

[Liệt kê các thay đổi kỹ thuật. Bắt buộc gắn tag phân loại (Feature, Bugfix, Refactor, Test, v.v.) kèm emoji. Mỗi bullet point tối đa 2 dòng. Bắt buộc bọc tên file, component, hàm, biến quan trọng trong dấu backtick \` \`.]

- `[Feature]` ✨ [Thay đổi kỹ thuật 1 - ví dụ: Bổ sung tính năng X vào `App.tsx`]
- `[Bugfix]` 🐛 [Thay đổi kỹ thuật 2 - ví dụ: Sửa lỗi hiển thị UI trong `HeaderComponent`]
- `[Refactor]` ♻️ [Thay đổi kỹ thuật 3 - ví dụ: Tối ưu logic của `AuthService`]
- `[Test]` 🧪 [Thay đổi kỹ thuật 4 - ví dụ: Viết test cho hàm `calculateTotal()`]

## 🔄 Behavior

[Miêu tả flow/hành vi từ góc nhìn người dùng hoặc hệ thống. Dùng numbered list hoặc paragraph.]

**Khi [điều kiện/scenario cụ thể]:**

1. [Bước 1 - điều gì xảy ra]
2. [Bước 2 - điều gì xảy ra tiếp theo]
3. [Bước 3 - kết quả cuối cùng]

[Hoặc mô tả bằng paragraph nếu phù hợp hơn]

[🚨 **BREAKING CHANGES:** (CHỈ THÊM MỤC NÀY NẾU có sự thay đổi lớn ảnh hưởng đến config, database schema, hoặc third-party API)]

**Lưu ý:** [Bất kỳ điều gì đáng chú ý, edge cases, hoặc limitations]
```

## Hướng dẫn thực hiện (Instructions)

1. **Văn phong chuyên nghiệp:** Viết ngắn gọn, súc tích. Đi thẳng vào vấn đề bằng các động từ mạnh ("Bổ sung...", "Sửa lỗi...", "Cập nhật..."). Tuyệt đối tránh các cụm từ thừa thãi như "PR này tập trung vào...", "Theo tôi...", "Tôi đã làm...". Giới hạn Summary tối đa 3 dòng.
2. **Theo dõi Ticket (Tracking):** Tự động phát hiện mã ticket (ví dụ: SOT-123, PROJ-456) trong yêu cầu của người dùng để điền lên dòng đầu tiên. Nếu không có mã ticket, bỏ qua dòng này.
3. **Phân loại thay đổi (Categorization & Emojis):** Luôn chia các thay đổi trong mục "Changes" thành các loại tương ứng như `[Feature]` ✨, `[Bugfix]` 🐛, `[Refactor]` ♻️, `[Test]` 🧪. Mỗi thay đổi không được viết dài quá 2 dòng.
4. **Nhấn mạnh code bị ảnh hưởng (File references):** BẮT BUỘC highlight tên các file, component, hàm, hoặc biến quan trọng bị thay đổi bằng cách đặt chúng trong dấu backtick (ví dụ: `UserController.ts`, `AuthService`).
5. **Cảnh báo (Breaking Changes):** Tự động phát hiện các thay đổi rủi ro cao (đổi cấu trúc DB, sửa config hệ thống, thay API public). Nếu có, bắt buộc chèn khối **🚨 BREAKING CHANGES:** vào trước phần Lưu ý để nhắc nhở reviewer.
6. **Hành vi (Behavior):** Giải thích rõ ràng điều gì xảy ra khi hệ thống/người dùng tương tác.
7. **Ngôn ngữ:** Sử dụng tiếng Việt làm ngôn ngữ chính (hoặc tuân theo yêu cầu cụ thể của người dùng). Đừng bao gồm các dấu ngoặc vuông `[...]` trong kết quả hiển thị cuối cùng.
