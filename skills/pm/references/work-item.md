# Work-item — schema

Một work-item là **một thư mục** trong `plans/` của repo, cộng với **một GitHub Issue** cùng số.

```
plans/260101-142-note-detail-quota/
├── plan.md                          # bắt buộc — frontmatter + thân plan
├── phase-01-<slug>.md               # do /to-tickets sinh
├── handoff-260101-codex-a1b2.md     # một file mỗi lần bàn giao
├── evidence.md                      # bằng chứng nghiệm thu
└── reports/                         # report của subagent
```

---

## Frontmatter `plan.md`

```yaml
---
# --- bắt buộc ---
id: GH-142
title: 'Note detail — quota'
status: pending              # pending | in-progress | in-review | completed | cancelled
priority: P1                 # P1 | P2 | P3
created: 2026-01-01

# --- nên có ---
description: 'Hiển thị quota còn lại ở trang chi tiết note.'
effort: 8h
branch: feat/142-note-detail-quota
tags: [frontend, quota]
repo: your-org/your-app
routing: ready-for-agent     # ready-for-agent | ready-for-human | needs-info | needs-triage | wontfix
owner: sonnh                 # GitHub login chịu trách nhiệm
source: https://chat.google.com/...   # nguồn intake

# --- pm ghi, người không cần sửa ---
claimed_by: codex@SON-PC#a1b2
claimed_at: 2026-01-01T09:00:00+07:00
sync_pending: false
blocked_by: [GH-140]
env:
  main:    { state: merged,        pr: 87, sha: 1a2b3c4 }
  develop: { state: cherry-picked, pr: 91, sha: 5d6e7f8 }
  staging: { state: none }
  prod:    { state: none }
---
```

### Trường bắt buộc

| trường | kiểm tra ở `formats.md` §5.10 |
|---|---|
| `id` | khớp số trong tên thư mục |
| `title` | không rỗng |
| `status` | thuộc enum |
| `priority` | thuộc enum |

Thiếu trường bắt buộc ⇒ `doctor` báo **fail**. Plan cũ không theo schema ⇒ **warn**, không chặn.

### Trường `routing`

Phải khớp nhãn trên Issue. Lệch ⇒ `doctor` báo warn và nói rõ **file thắng**.

### Trường `env`

Bốn khóa `main`, `develop`, `staging`, `prod`. Mỗi khóa:

```yaml
main: { state: merged, pr: 87, sha: 1a2b3c4 }
```

`state` ∈ `none · cherry-picked · merged · verified · failed`. Thiếu khóa nào thì coi như `none`.

---

## Vòng đời một work-item

```
1. intake      pm intake "<text>"        → Issue + thư mục + plan.md (status: pending)
2. triage      bạn xác nhận routing      → nhãn ready-for-agent | ready-for-human
3. claim       pm claim 142              → in-progress + claimed_by + nhánh
4. build       /implement …              → phase-*.md, code
5. note        pm note 142 "…"           → log vào Issue + file
6. handoff     pm handoff 142            → handoff-*.md
7. pr          /pr                       → nhãn in-review, status: in-review
8. env         pm env 142 main merged --pr 87 --sha 1a2b3c4
9. done        pm archive 142            → completed, đóng Issue
```

`blocked_by` chặn việc đó xuất hiện trong danh sách sẵn sàng cho tới khi mọi việc nó chờ đều `completed`.

---

## Ví dụ tối thiểu — một bug nhỏ

```yaml
---
id: GH-151
title: 'Nút lưu bị disable sai khi note rỗng'
status: pending
priority: P2
created: 2026-01-03
routing: ready-for-agent
branch: fix/151-save-button-disabled
env:
  main:    { state: none }
  develop: { state: none }
  staging: { state: none }
  prod:    { state: none }
---
```

Work-item nhỏ vẫn là một thư mục. Không có đường tắt — danh sách kiểm tra cần chỗ để đối chiếu.
