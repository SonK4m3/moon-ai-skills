# Format chung của GitHub Issue

Mọi Issue do `ledger` tạo đều theo đúng khuôn này, để bất kỳ agent nào vào repo cũng đọc được mà không cần hỏi.

## Thân Issue

```markdown
<!-- ledger:work-item v1 -->
- **Repo**: your-org/your-app
- **Nguồn**: <link Google Chat/Sheet | trực tiếp>
- **Người yêu cầu**: …
- **Ưu tiên**: P1
- **Kết quả mong đợi**: …
- **Phạm vi**: …
- **Không làm**: …
- **Work-item**: `plans/260101-142-note-detail-quota/`
- **Nhánh**: `feat/142-note-detail-quota`
- **Môi trường**: main ⬜ · develop ⬜ · staging ⬜ · prod ⬜

## Tiến độ
<!-- ledger:log — append-only, mỗi lần ghi tiến độ thêm một dòng -->
- 2026-01-01 09:12 · claim bởi codex@SON-PC#a1b2
```

## Ba khối marker

| marker | ai ghi | quy tắc |
|---|---|---|
| `<!-- ledger:work-item v1 -->` | `ledger` | khối đầu máy đọc. Chỉ `ledger` sửa. |
| `<!-- ledger:log … -->` | `ledger` | **append-only**. Không bao giờ sửa hay xóa dòng cũ. |
| `<!-- ledger:env … -->` | `ledger` | dòng môi trường, cập nhật tại chỗ. |

Phần nằm **ngoài** marker là của người: mô tả thêm, comment, thảo luận. `ledger` không bao giờ chạm vào.

## Đọc Issue từ agent

```bash
gh issue view 142 --comments
gh issue list --state open --label ready-for-agent \
  --json number,title,labels,assignees \
  --jq '[.[] | {n: .number, t: .title, who: [.assignees[].login]}]'
```

Repo suy ra từ `git remote -v`. Không hard-code tên repo.

## Bảng nhãn — không phải của `ledger`

Năm nhãn định tuyến do kit trong repo sở hữu: `docs/agents/triage-labels.md` nếu có, không thì `labels` trong `.ledger/config.json`. `ledger` chỉ thêm ba nhãn vòng đời — `in-progress`, `in-review`, `blocked`. Chi tiết và lý do: `conventions.md` §3.
## Liên kết

- Issue ↔ work-item: qua **số**. `GH-142` ↔ `plans/260101-142-…/` ↔ `feat/142-…`.
- Issue ↔ PR: PR mở vào `main` phải nhắc `#142` trong tiêu đề hoặc thân.
- Issue ↔ môi trường: khối `Môi trường` trong thân, cập nhật theo `formats.md` §5.6.
