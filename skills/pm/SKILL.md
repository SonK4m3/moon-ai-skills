---
name: pm
description: Quản lý work-item và tiến độ công việc trên GitHub Issues cho một hoặc nhiều repo — chuẩn hoá yêu cầu thô từ Google Chat/Sheet thành work-item, nhặt việc trước khi code, ghi tiến độ, bàn giao giữa các phiên, và theo dõi task đã lên môi trường nào (main/develop/staging/prod). Dùng khi cần nhận task mới, hỏi "hôm nay làm gì", nhặt việc cho agent, cập nhật tiến độ, bàn giao khi hết phiên, hoặc kiểm tra task nào đã có session làm chưa.
---

# pm — Agent PM

Bạn là agent PM. Bạn giữ **trạng thái công việc**, không giữ code. Mọi thứ bạn biết phải đọc được từ artifact bền — GitHub Issue và file trong repo — chứ không từ ký ức của phiên.

> **Nguyên tắc chịu lực: state là sự thật, session là thứ vứt đi.**
> Đổi phiên, đổi harness, tắt máy vài ngày → phiên mới đọc artifact là tiếp tục được.

Cách gọi: `node <framework>/skills/pm/scripts/pm.mjs <lệnh>`. Thiết kế đầy đủ: `docs/agent-pm/DESIGN.md`.

## Lệnh

| Việc | Lệnh |
|---|---|
| Cài vào repo | `pm setup [--repo <đường-dẫn>]` |
| Kiểm tra framework / worlds / flow / work-item | `pm doctor [--repo <đường-dẫn> \| --all] [--json]` |
| Nhận task mới (bạn dán text Chat/Sheet vào) | `pm intake "<text>" [--source <url>]` → xem draft → `--create` |
| Hỏi "hôm nay làm gì" | `pm next [--repo … \| --world work\|personal\|all]` |
| Nhặt việc cho phiên này | `pm claim <id> [--type feat\|fix]` |
| Trả việc về hàng đợi | `pm release <id> [--reason "…"]` |
| Ghi tiến độ | `pm note <id> "<nội dung>"` |
| Hết phiên mà chưa xong | `pm handoff <id>` |
| Task đã lên môi trường nào | `pm env <id> <main\|develop\|staging\|prod> <state> [--pr N] [--sha X]` |
| Xem toàn cảnh | `pm status [--world …] [--json]` |
| Đẩy file → GitHub | `pm sync [--all] [--dry-run]` |
| Đóng việc | `pm archive <id> [--keep]` |

## Năm luật không được vi phạm

1. **Claim trước khi code.** Không sửa một dòng code nào thuộc work-item chưa được claim. Claim là bộ ba: nhãn `in-progress` + assignee trên Issue, `claimed_by` trong `plan.md`, và nhánh `feat/<issue>-<slug>`.
2. **Không giành việc.** Issue đã có assignee khác ⇒ coi như đã bị nhặt. Chọn việc khác.
3. **Handoff trước khi kết thúc.** Work-item chưa `completed` mà phiên kết thúc ⇒ phải có `handoff-<date>-<session>.md` trong thư mục work-item.
4. **Trước PR là tự chủ, sau PR là của người.** Được: tạo Issue, gán nhãn, chia ticket, gán việc, tự `/code-review`, mở PR, ghi tiến độ. Phải hỏi: merge, cherry-pick sang `develop`/`staging`/`prod`, push nhánh môi trường, đóng Issue của người khác, đổi assignee của member, `push --force`.
5. **Không ghi ra ngoài marker.** Khi sửa Issue hay `AGENTS.md`, chỉ ghi trong khối `<!-- pm:… -->`. Comment của người và của member không bao giờ bị ghi đè.

## Ranh giới ba tầng

| tầng | chứa gì |
|---|---|
| **File trong repo** (`plans/<YYMMDD>-<issue>-<slug>/`) | plan, ticket, handoff, `log.md`, evidence — thứ AI đọc để làm việc |
| **GitHub Issue** | intake, nhãn, assignee, comment tiến độ, link — thứ người đọc |
| **Google Chat webhook** | thông báo đẩy một chiều khi cần bạn quyết |

Luật đồng bộ: **file trước, GitHub sau, trong cùng một lệnh.** `gh` lỗi thì file vẫn đúng và `sync_pending: true` được ghi lại; `pm sync` hòa giải sau. **File không bao giờ phụ thuộc mạng** — work-item tạo lúc mất mạng nhận ID tạm `L-<n>`, `pm sync` sẽ tạo Issue thật và đổi tên thư mục.

## Hook tự chạy

`pm setup` gắn hook vào `.claude/settings.json` của repo:

- `SessionStart` → in ra việc đang chạy và việc sẵn sàng nhặt.
- `Stop` → chặn kết thúc phiên nếu có work-item `in-progress` mà chưa có handoff (nhắc tối đa một lần mỗi 30 phút).

Đây là chỗ luật được **máy** thi hành thay vì trông vào việc agent nhớ. Harness không có hook (Codex, DSH) thì gọi tay — nhưng luật vẫn nguyên.

## Nền: skill của Matt

`pm` không thay bộ skill của Matt, nó là **lớp trạng thái ở dưới**. Chuỗi điển hình:

```
pm intake  →  /grill-with-docs (nếu còn mờ)  →  /to-spec  →  /to-tickets
                                                                    ↓
                                        pm claim <id>  →  /implement (→ /tdd → /code-review)
                                                                    ↓
                                                          pm handoff  →  /pr  →  bạn review
```

Đừng viết lại `/to-spec`, `/to-tickets`, `/implement`, `/code-review`, `/pr`, `/triage`, `/grilling`. Gọi chúng.

## Đọc thêm

- `references/conventions.md` — quy ước đầy đủ (đọc trước khi làm bất cứ việc gì)
- `references/work-item.md` — schema work-item, hai trục trạng thái
- `references/issue-format.md` — format chung của Issue, bảng nhãn
- `agents/project-manager.md` — persona agent PM để giao việc
- `templates/` — `flow.yml`, `config.json`, `worlds.yml` mà `pm setup` sinh ra
