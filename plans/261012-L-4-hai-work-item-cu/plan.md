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
  - text: "Cả hai plan.md có status kết thúc (completed hoặc cancelled), không còn pending hay in-progress"
    verify: "grep "^status:" plans/261012-1-quickstart-pm/plan.md plans/261012-2-quyet-dinh-hai-thu-muc/plan.md  → cả hai thuộc {completed, cancelled}"
  - text: "Mỗi cái có một dòng log giải thích VÌ SAO kết thúc ở trạng thái đó"
    verify: "mỗi log.md có >= 1 dòng mới nói rõ lý do kết thúc"
  - text: "Chỗ nào còn nhắc "pm" như thể còn dùng được thì sửa thành "ledger" hoặc ghi rõ là lịch sử"
    verify: "grep -n "pm" trong hai thư mục  → mọi lần xuất hiện đều nằm trong ngữ cảnh lịch sử"
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