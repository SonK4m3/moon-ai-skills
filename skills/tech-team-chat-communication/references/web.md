# Hướng dẫn Communication cho Web/Frontend Team

Khi xác định người dùng thuộc Web/Frontend Team, hãy sử dụng các nguyên tắc và template dưới đây.

## 1. Thuật ngữ (Terminology)

Giữ nguyên các từ:

- UI / UX / Layout / Responsive
- Component, State, Props
- API Integration, Loading State, Error Handling
- Double-click, Redirect, DOM
- DEV / STG / PROD

## 2. Template Bàn giao QC (Ready for QC)

**[ Feature Name / Phase ] - READY FOR QC 🚀**

@QC-Team Tính năng **[tên tính năng]** đã được deploy lên **[DEV/STG]**.

**Scope chính:**

- [User flow mới / Behavior thay đổi]
- [Các tính năng được bổ sung]

**Lưu ý khi test:**

- [Loading state, responsive, edge case]
- [Regression area cần chú ý]

**Tài liệu liên quan:**

- Figma & Docs: [Link Figma/UI Docs]
- API Contract: [Link BE Swagger nếu cần]

**CC:** @Backend-Team @PM

## 3. Template BE Dependency (Khi Web cần BE hỗ trợ)

**[ Feature Name ] - BE DEPENDENCY 🔗**
@Backend-Team nhờ support/confirm giúp phần sau:
**Context:** [Web đang tích hợp API...]
**FE đang cần:** [Response field mới / API mới / Đổi format]
**Current impact:** [Block QC / Block task]
**Tài liệu liên quan:** [Link API Docs]
CC: @PM
