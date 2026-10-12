---
id: L-3
title: "README khớp với thực tế repo"
project: "Dọn dẹp bộ skill ledger"
repo: SonK4m3/moon-ai-skills
branch: feat/L-3-readme-khop-thuc-te
status: pending
priority: P2
created: 2026-10-12
routing: ready-for-agent
source: "trực tiếp — dọn dẹp sau khi đổi tên pm -> ledger"
requester: "chính mình"
acceptance:
  - text: "M"
    verify: "ọ"
  - text: "f"
    verify: "o"
  - text: "K"
    verify: "h"
  - text: "g"
    verify: "r"
  - text: "S"
    verify: "ố"
  - text: "đ"
    verify: "ế"
scope: "README.md"
out_of_scope: "không sửa skills/** · không đổi mục Install nếu nó vẫn đúng"
sync_pending: true
env:
  main: { state: none }
  develop: { state: none }
  staging: { state: none }
  prod: { state: none }
---

# README khớp với thực tế repo

## Yêu cầu gốc

Dọn dẹp còn lại sau khi skill pm đổi tên thành ledger và CLI bị gỡ.

## Việc cần làm

Xem bốn tiêu chí trong frontmatter. Chạy đúng lệnh erify của từng tiêu chí **trước khi** nói xong.

## Phạm vi

- **Trong:** README.md
- **Ngoài:** không sửa skills/** · không đổi mục Install nếu nó vẫn đúng

## Ghi chú

- sync_pending: true vì chưa tạo được Issue — gh chỉ có tài khoản work, tài khoản này chỉ có SSH.
- Luật 4: mở PR là quyền tự chủ, **merge thì phải hỏi người**.