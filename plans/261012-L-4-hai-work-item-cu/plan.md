---
id: L-4
title: "Chốt số phận hai work-item cũ"
project: "Dọn dẹp bộ skill ledger"
repo: SonK4m3/moon-ai-skills
branch: feat/L-4-hai-work-item-cu
status: pending
priority: P2
created: 2026-10-12
routing: ready-for-agent
source: "trực tiếp — dọn dẹp sau khi đổi tên pm -> ledger"
requester: "chính mình"
acceptance:
  - text: "C"
    verify: "ả"
  - text: "g"
    verify: "r"
  - text: "M"
    verify: "ỗ"
  - text: "m"
    verify: "ỗ"
  - text: "C"
    verify: "h"
  - text: "g"
    verify: "r"
scope: "plans/261012-1-quickstart-pm/ · plans/261012-2-quyet-dinh-hai-thu-muc/"
out_of_scope: "không xoá thư mục · không sửa skills/ledger/**"
sync_pending: true
env:
  main: { state: none }
  develop: { state: none }
  staging: { state: none }
  prod: { state: none }
---

# Chốt số phận hai work-item cũ

## Yêu cầu gốc

Dọn dẹp còn lại sau khi skill pm đổi tên thành ledger và CLI bị gỡ.

## Việc cần làm

Xem bốn tiêu chí trong frontmatter. Chạy đúng lệnh erify của từng tiêu chí **trước khi** nói xong.

## Phạm vi

- **Trong:** plans/261012-1-quickstart-pm/ · plans/261012-2-quyet-dinh-hai-thu-muc/
- **Ngoài:** không xoá thư mục · không sửa skills/ledger/**

## Ghi chú

- sync_pending: true vì chưa tạo được Issue — gh chỉ có tài khoản work, tài khoản này chỉ có SSH.
- Luật 4: mở PR là quyền tự chủ, **merge thì phải hỏi người**.