---
id: L-2
title: "DESIGN.md đọc được trong 2 phút"
project: "Dọn dẹp bộ skill ledger"
repo: SonK4m3/moon-ai-skills
branch: feat/L-2-design-md-trang-thai-hien-tai
status: pending
priority: P2
created: 2026-10-12
routing: ready-for-agent
source: "trực tiếp — dọn dẹp sau khi đổi tên pm -> ledger"
requester: "chính mình"
acceptance:
  - text: 'Mở DESIGN.md là thấy ngay mục "Trạng thái hiện tại" ở đầu, nêu skill làm gì BÂY GIỜ và ba việc chỉ nó làm'
    verify: 'grep -n "^## 0\." docs/agent-ledger/DESIGN.md  → phải thấy; và đọc 20 dòng đầu phải trả lời được "skill này giờ làm gì"'
  - text: 'Có bảng phân loại mục nào là LỊCH SỬ, mục nào còn hiệu lực'
    verify: 'grep -n "lịch sử" docs/agent-ledger/DESIGN.md  → >= 1 bảng'
  - text: 'Không mất thông tin: mọi sự thật còn dùng được vẫn tra ra được từ file'
    verify: 'với mỗi mục bị gộp, có đường dẫn hoặc lệnh lấy lại nội dung cũ; đếm ^## sau >= 1 và mọi mục lịch sử nằm trong một mục có nhãn rõ'
scope: "docs/agent-ledger/DESIGN.md"
out_of_scope: "không xoá lịch sử · không sửa skills/ledger/**"
sync_pending: true
env:
  main: { state: none }
  develop: { state: none }
  staging: { state: none }
  prod: { state: none }
---

# DESIGN.md đọc được trong 2 phút

## Yêu cầu gốc

Dọn dẹp còn lại sau khi skill pm đổi tên thành ledger và CLI bị gỡ.

## Việc cần làm

Xem bốn tiêu chí trong frontmatter. Chạy đúng lệnh erify của từng tiêu chí **trước khi** nói xong.

## Phạm vi

- **Trong:** docs/agent-ledger/DESIGN.md
- **Ngoài:** không xoá lịch sử · không sửa skills/ledger/**

## Ghi chú

- sync_pending: true vì chưa tạo được Issue — gh chỉ có tài khoản work, tài khoản này chỉ có SSH.
- Luật 4: mở PR là quyền tự chủ, **merge thì phải hỏi người**.