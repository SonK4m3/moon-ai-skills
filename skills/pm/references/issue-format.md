# Format chung của GitHub Issue

Mọi Issue do `pm` tạo đều theo đúng khuôn này, để bất kỳ agent nào vào repo cũng đọc được mà không cần hỏi.

## Thân Issue

```markdown
<!-- pm:work-item v1 -->
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
<!-- pm:log — append-only, mỗi lần pm note ghi một dòng -->
- 2026-01-01 09:12 · claim bởi codex@SON-PC#a1b2
```

## Ba khối marker

| marker | ai ghi | quy tắc |
|---|---|---|
| `<!-- pm:work-item v1 -->` | `pm` | khối đầu máy đọc. Chỉ `pm` sửa. |
| `<!-- pm:log … -->` | `pm` | **append-only**. Không bao giờ sửa hay xóa dòng cũ. |
| `<!-- pm:env … -->` | `pm` | dòng môi trường, cập nhật tại chỗ. |

Phần nằm **ngoài** marker là của người: mô tả thêm, comment, thảo luận. `pm` không bao giờ chạm vào.

## Đọc Issue từ agent

```bash
gh issue view 142 --comments
gh issue list --state open --label ready-for-agent \
  --json number,title,labels,assignees \
  --jq '[.[] | {n: .number, t: .title, who: [.assignees[].login]}]'
```

Repo suy ra từ `git remote -v`. Không hard-code tên repo.

## Bảng nhãn

| nhãn | đặt khi |
|---|---|
| `needs-triage` | vừa tạo, chưa phân loại |
| `needs-info` | chờ người báo thêm |
| `ready-for-agent` | đã đủ rõ để AI làm |
| `ready-for-human` | cần người làm |
| `in-progress` | đã claim |
| `in-review` | PR đang mở |
| `blocked` | đang chờ việc khác |
| `wontfix` | không làm |

Tạo nhãn thiếu (một lần cho mỗi repo):

```bash
gh label create in-progress --color FBCA04 --description "Đã có session nhặt"
gh label create in-review   --color 0E8A16 --description "PR đang mở, chờ review"
gh label create blocked     --color B60205 --description "Đang chờ việc khác"
```

## Liên kết

- Issue ↔ work-item: qua **số**. `GH-142` ↔ `plans/260101-142-…/` ↔ `feat/142-…`.
- Issue ↔ PR: PR mở vào `main` phải nhắc `#142` trong tiêu đề hoặc thân.
- Issue ↔ môi trường: khối `Môi trường` trong thân, cập nhật bằng `pm env`.
