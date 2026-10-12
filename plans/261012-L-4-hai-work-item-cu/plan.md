---
id: L-4
title: "Chốt số phận hai work-item cũ"
project: "Dọn dẹp bộ skill ledger"
repo: SonK4m3/moon-ai-skills
branch: feat/L-4-hai-work-item-cu
status: in-progress
priority: P2
created: 2026-10-12
routing: ready-for-agent
source: "trực tiếp — dọn dẹp sau khi đổi tên pm -> ledger"
requester: "chính mình"
acceptance:
  - text: 'Cả hai plan.md có status kết thúc (completed hoặc cancelled), không còn pending hay in-progress'
    verify: 'grep "^status:" plans/261012-1-quickstart-pm/plan.md plans/261012-2-quyet-dinh-hai-thu-muc/plan.md  → cả hai thuộc {completed, cancelled}'
  - text: 'Mỗi cái có một dòng log giải thích VÌ SAO kết thúc ở trạng thái đó'
    verify: 'mỗi log.md có >= 1 dòng mới nói rõ lý do kết thúc'
  - text: 'Chỗ nào còn nhắc "pm" như thể còn dùng được thì sửa thành "ledger" hoặc ghi rõ là lịch sử'
    verify: 'grep -n "pm" trong hai thư mục  → mọi lần xuất hiện đều nằm trong ngữ cảnh lịch sử'
scope: "plans/261012-1-quickstart-pm/ · plans/261012-2-quyet-dinh-hai-thu-muc/"
out_of_scope: "không xoá thư mục · không sửa skills/ledger/**"
claimed_by: dsh@DESKTOP-SEC48UO#4b1f
claimed_at: 2026-10-13T00:19:21+07:00
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

Xem ba tiêu chí trong frontmatter. Chạy đúng lệnh `verify` của từng tiêu chí **trước khi** nói xong.

## Phạm vi

- **Trong:** plans/261012-1-quickstart-pm/ · plans/261012-2-quyet-dinh-hai-thu-muc/
- **Ngoài:** không xoá thư mục · không sửa skills/ledger/**

## Ghi chú

- sync_pending: true vì chưa tạo được Issue — gh chỉ có tài khoản work, tài khoản này chỉ có SSH.
- Luật 4: mở PR là quyền tự chủ, **merge thì phải hỏi người**.

## Ghi chú về khối `acceptance`

Ba tiêu chí ở frontmatter lấy **nguyên văn** từ `main` (commit `1e80d3e` sửa khối bị hỏng của `4eb42d4`); nhánh này chỉ đổi nháy kép bao ngoài thành nháy đơn, vì bản trên `main` lồng nháy kép bên trong (`"… "pm" …"`) nên **pyyaml không parse được** (`ParserError` ở dòng `verify: "grep "^status:" …`). Bằng chứng thô của cả hai việc — bản hỏng ở `4eb42d4` và lỗi parse của bản `1e80d3e` — ở `evidence.md` §1.

## Kết quả — số phận hai work-item cũ

| work-item | chốt | vì sao |
|---|---|---|
| `plans/261012-1-quickstart-pm/` (GH-1) | `status: cancelled` | phạm vi `skills/pm/SKILL.md` đã bị xoá sau khi pm → ledger; nhánh `feat/1-quickstart-pm` 0 commit; `acceptance` là chuỗi nên không có cổng chạy được ⇒ không thể `ready-for-agent`. Yêu cầu gốc (Quickstart cho người mới) **chưa được đáp cho `ledger`** ⇒ muốn làm thì intake lại |
| `plans/261012-2-quyet-dinh-hai-thu-muc/` (GH-2) | `status: cancelled` | bản ghi là vật thời `pm` (marker `<!-- pm:work-item v1 -->`, `acceptance` là chuỗi, chưa từng được commit) ⇒ huỷ bản ghi. **Vấn đề thì không huỷ:** `react-component-preview/` và `skills/astra-luna-orchestrator/` vẫn chưa commit, quyết định commit/ignore/xoá vẫn là việc của người ⇒ phải intake lại hoặc người quyết trực tiếp |

Chi tiết, bằng chứng và ba lệnh verify: `evidence.md`. Issue #1/#2 vẫn **OPEN** — tài khoản `gh` chỉ có quyền `pull` nên không đóng, không gắn nhãn, không gán assignee được; `sync_pending: true` giữ nguyên.