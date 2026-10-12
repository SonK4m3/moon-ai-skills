# Định dạng và thủ tục

Bạn làm mọi việc bằng công cụ của mình: đọc/ghi file, `git`, `gh`. File này là **hợp đồng định dạng** — không có gì kiểm tra hộ, nên sai một ký tự là work-item trở nên vô hình với phiên sau. Không có "format thứ hai".

> Đọc `conventions.md` trước để biết luật. File này chỉ nói **viết cái gì, viết thế nào**.

---

## 1. Định danh

| thứ | dạng | ví dụ |
|---|---|---|
| Thư mục work-item | `plans/<YYMMDD>-<số>-<slug>/` | `plans/260101-142-note-detail-quota/` |
| Nhánh | `<type>/<số>-<slug>` | `feat/142-note-detail-quota` |
| Handoff | `handoff-<YYMMDD>-<session>.md` | `handoff-260101-codex-a1b2.md` |
| Dòng log | `- YYYY-MM-DD HH:mm · <nội dung>` | `- 2026-01-01 09:12 · claim bởi …` |
| Session id | `<harness>@<HOST>#<4 ký tự>` | `codex@MAY-A#a1b2` |

- `<YYMMDD>` là **ngày tạo**, không đổi về sau.
- `<số>` là **số Issue**. Khi chưa tạo được Issue (mất mạng, thiếu quyền), dùng `L-<n>` với `n = max(số đang có) + 1`, và ghi `sync_pending: true`.
- `<slug>`: kebab-case, không dấu, tối đa 5 từ, **không kết thúc bằng hư từ** (`cho`, `va`, `voi`, `cua`, `de`…).
- Session id: tự đặt một lần, **giữ nguyên suốt phiên**.

---

## 2. `plan.md` — frontmatter

```markdown
---
id: GH-142
title: "Note detail — quota"
status: in-progress
priority: P1
created: 2026-01-01
routing: ready-for-agent
repo: your-org/your-app
source: "Google Chat #team-fe"
requester: "Anh Sơn"
acceptance: "Mở trang với 500 note, cuộn hết danh sách không khựng quá 100ms"
scope: "src/features/note-detail"
out_of_scope: "không đổi cấu trúc dữ liệu, không phân trang ở API"
branch: feat/142-note-detail-quota
claimed_by: codex@MAY-A#a1b2
claimed_at: 2026-01-01T09:00:00+07:00
blocked_by: [GH-140]
env:
  main: { state: merged, pr: 87, sha: 1a2b3c4 }
  develop: { state: cherry-picked, pr: 91, sha: 5d6e7f8 }
  staging: { state: none }
  prod: { state: none }
---

# Note detail — quota

## Yêu cầu gốc
<nguyên văn tin nhắn, để đối chiếu về sau>

## Việc cần làm
- [ ] …

## Nghiệm thu
- …
```

**Luật sửa file này:**

1. Chuỗi có dấu hai chấm, dấu `#`, hoặc bắt đầu bằng ký tự đặc biệt → **luôn bọc trong nháy kép**.
2. `env:` **luôn đủ bốn khoá** `main`, `develop`, `staging`, `prod`. Thiếu khoá = coi như `none`, nhưng đừng để thiếu.
3. `state` chỉ nhận: `none` · `cherry-picked` · `merged` · `verified` · `failed`.
4. `status` chỉ nhận: `pending` · `in-progress` · `in-review` · `completed` · `cancelled`.
5. `routing` chỉ nhận: `ready-for-agent` · `ready-for-human` · `needs-info` · `needs-triage` · `wontfix`.
6. Xoá một khoá thì xoá **cả dòng**, đừng để `claimed_by:` trống — dòng trống bị đọc thành `null` và gây lẫn giữa "chưa nhặt" với "nhặt rồi mà không ghi ai".
7. Ngày: `created` là `YYYY-MM-DD`; `claimed_at` là ISO có múi giờ.

---

## 3. `log.md`

```markdown
# Nhật ký

- 2026-01-01 09:12 · claim bởi codex@MAY-A#a1b2 · nhánh feat/142-note-detail-quota
- 2026-01-01 14:03 · xong phase 1, còn phase 2
```

**Append-only.** Không bao giờ sửa hay xoá dòng cũ. Muốn đính chính thì thêm dòng mới nói rõ.

---

## 4. Issue trên tracker

### 4.1 Thân Issue

```markdown
<!-- ledger:work-item v1 -->
- **Repo**: your-org/your-app
- **Nguồn**: <link Chat/Sheet | trực tiếp>
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
- 2026-01-01 09:12 · claim bởi codex@MAY-A#a1b2
```

Ba marker: `ledger:work-item v1` (khối đầu), `ledger:log` (append-only), `ledger:env` (dòng môi trường nếu tách riêng). **Chỉ ghi bên trong marker.** Mọi thứ ngoài marker là của người.

### 4.2 Tạo và đọc Issue — theo tracker của repo

**Tracker không phải của `ledger`.** Nếu repo có `docs/agents/issue-tracker.md`, **đọc nó trước** và làm đúng theo đó. Repo khác có thể dùng GitLab, Linear, Jira hay file markdown — `ledger` không cần biết chi tiết, chỉ cần biết **việc được ghi ở đâu và đọc lại thế nào**.

`.ledger/config.json` khai báo `tracker`. Mặc định khi repo chưa cấu hình gì: GitHub qua `gh`.

Mặc định đó — và chỉ khi không có file cấu hình nào:

```bash
gh issue create --repo <org/repo> --title "<tiêu đề>" --body-file /tmp/issue.md --label ready-for-agent
gh issue view <số> --comments
gh issue list --state open --label ready-for-agent --json number,title,labels,assignees
```

Repo suy ra từ `git remote -v`. Viết body ra file tạm trước — truyền tiếng Việt qua dòng lệnh dễ hỏng dấu.

`gh label create` trả **HTTP 404** nghĩa là **thiếu quyền ghi**, không phải repo không tồn tại — báo người dùng chuyển tài khoản, đừng thử lại.


### 4.4 Nhãn

Ba nhãn **vòng đời** là phần duy nhất `ledger` thêm vào; năm nhãn định tuyến do kit của repo sở hữu (đầu mục 4).

```bash
gh label create in-progress --color fbca04 --description "Đã có phiên nhặt"
gh label create in-review   --color 5319e7 --description "PR đang mở"
gh label create blocked     --color b60205 --description "Đang chờ việc khác"
```

Tracker không phải GitHub thì tạo nhãn tương đương theo cách của nó. Không tạo được thì **nói rõ với người dùng**, đừng bỏ qua im lặng.

## 5. Thủ tục

Mỗi thủ tục: **làm gì → kiểm tra gì**. Kiểm tra là bắt buộc — không có gì nhắc bạn.

### 5.1 `setup` — cài vào một repo

1. Tạo `.ledger/flow.yml` (copy `templates/flow.yml`, sửa `profile` cho đúng repo).
2. Tạo `.ledger/config.json` (copy `templates/config.json`, điền `repo` = `<org>/<name>` từ `git remote -v`).
3. Thêm khối `<!-- ledger:start -->…<!-- ledger:end -->` vào cuối `AGENTS.md` (tạo file nếu chưa có).

4. Tạo thư mục `plans/`.
5. **Kiểm tra**: `cat .ledger/config.json`, `git status --short` — và nói cho người dùng biết file nào được git theo dõi.

### 5.2 `intake` — nhận việc mới

1. **Soạn nội dung** theo `intake.md`. Đây là phần khó; đừng bỏ qua.
2. Trình bản nháp cho người dùng. **Chờ xác nhận.**
3. Tạo Issue (§4.2) → lấy số từ URL in ra.
4. Tạo `plans/<YYMMDD>-<số>-<slug>/plan.md` (§2) và `log.md` (§3).
5. Gán nhãn routing lên Issue.
6. **Kiểm tra**: đọc lại Issue thấy đúng nhãn; `ls plans/` thấy thư mục; frontmatter parse được.

Nếu bước 3 hỏng vì mất mạng hoặc thiếu quyền: dùng `L-<n>`, ghi `sync_pending: true`, và **nói rõ** với người dùng là Issue chưa tồn tại.

### 5.3 `claim` — nhặt việc (**trước khi sửa code**)

1. Đọc `plans/*/plan.md` tìm work-item theo số. Nếu `claimed_by` đã có → **dừng, không giành**.
2. Gán assignee cho chính bạn trên tracker — **gọi riêng**, để nhãn lỗi không làm mất assignee.
3. Gán nhãn `in-progress` — gọi riêng.
4. Sửa `plan.md`: `status: in-progress`, `branch`, `claimed_by`, `claimed_at`.
5. Thêm dòng vào `log.md`.
6. Tạo nhánh: `git checkout -b <type>/<số>-<slug>` **chỉ khi cây làm việc sạch**; nếu bẩn thì `git branch <tên>` và nói rõ chưa chuyển.
7. **Kiểm tra**: `git branch --list`, và đọc lại Issue thấy assignee + nhãn. Bước nào lỗi thì ghi `sync_pending: true` và **nói ra**.

### 5.4 `note` — ghi tiến độ

1. Thêm một dòng vào `log.md`.
2. Comment một dòng cùng nội dung lên Issue, theo cách của tracker (mục 4.2).
3. **Kiểm tra**: `tail -3 log.md`.

### 5.5 Bản ghi công việc — khác `/handoff`

Hai thứ khác nhau, đừng lẫn:

| | để làm gì | ở đâu |
|---|---|---|
| `/handoff` (hoặc kit tương đương) | chuyển **phiên** sang harness khác, thư mục khác, hay cho người khác | thư mục tạm của hệ điều hành |
| **bản ghi công việc** | để phiên sau **trong cùng repo** tiếp tục mà không phải đọc lại cả thread Issue | `plans/<work-item>/` |

Khi hết phiên mà việc chưa xong:

1. Thu dữ liệu git: `git diff --name-only <nhánh nguồn>...<nhánh>`, `git status --porcelain`.
2. Viết `handoff-<YYMMDD>-<session>.md` trong thư mục work-item, theo khung ở `conventions.md` §5.
3. **Điền cả sáu mục** — khung rỗng là vô dụng.
4. Thêm một dòng vào `log.md`, và comment link file lên Issue.

Người dùng sẽ tiếp tục ở harness khác thì gọi thêm `/handoff`.

### 5.6 `env` — cập nhật môi trường

1. Sửa khối `env:` trong `plan.md`, giữ đủ bốn khoá.
2. Cập nhật dòng `**Môi trường**` trong thân Issue và ghi một comment.
3. **Kiểm tra**: `sha` phải có khi `state` khác `none` — không có sha thì không đối chiếu được về sau.

### 5.7 `release` — nhả việc

1. Gỡ assignee của bạn trên tracker (riêng).
2. Gỡ nhãn `in-progress`, gán nhãn routing (riêng).
3. Xoá `claimed_by`, `claimed_at`, `branch` khỏi `plan.md`; `status: pending`.
4. Ghi log kèm lý do.

### 5.8 `archive` — đóng việc

1. `status: completed` + `completed: <ngày>`.
2. Đóng Issue kèm comment, gỡ nhãn `in-progress`/`in-review`.
3. `git mv plans/<tên> plans/archive/<tên>`.
4. **Kiểm tra**: `git status` sạch; Issue đã đóng.

### 5.9 `sync` — hòa giải file ↔ GitHub

Chạy khi `sync_pending: true`, hoặc khi nghi ngờ lệch. Với mỗi work-item:

1. Nếu `id` còn là `L-<n>`: tạo Issue thật → đổi `id` thành `GH-<số>`, **đổi tên thư mục** thành `<YYMMDD>-<số>-<slug>`, xoá `sync_pending`.
2. Viết lại thân Issue từ frontmatter (chỉ trong marker).
3. Gán nhãn đúng theo `status`.
4. **Kiểm tra**: đọc lại Issue thấy khớp với `plan.md`.

### 5.10 `doctor` — kiểm tra lệch

Đây là **danh sách kiểm tra bạn tự chạy**. Lệnh trong bảng là mặc định GitHub; tracker khác thì thay bằng cách đọc tương ứng (4.2). Chạy khi người dùng hỏi "số liệu có đúng không", và trước khi báo cáo tổng hợp.

| # | kiểm | cách |
|---|---|---|
| 1 | `plan.md` parse được, có `id`/`title`/`status` | đọc file |
| 2 | tên thư mục khớp `id` (`260101-142-…` ↔ `GH-142`) | so chuỗi |
| 3 | `status` và `routing` thuộc enum | so enum |
| 4 | `env` đủ bốn khoá, `state` thuộc enum | đọc file |
| 5 | `status: in-progress` mà thiếu `claimed_by` | đọc file |
| 6 | `claimed_by` có mà không thấy nhánh | `git branch --list`, `git ls-remote --heads origin` |
| 7 | nhánh trong `plan.md` ≠ nhánh thật đang có | so |
| 8 | Issue có nhãn khớp `status`/`routing` | đọc Issue (4.2) |
| 9 | Issue có assignee khớp `claimed_by` | đọc Issue (4.2) |
| 10 | ba nhãn vòng đời có tồn tại trên tracker | `gh label list --repo <r> --json name` |
| 11 | tài khoản gh có quyền ghi | `gh api repos/<r> --jq .permissions.push` |
| 12 | plan cũ không theo schema | đếm, báo là **warn**, không chặn |

**File thắng.** Lệch thì sửa GitHub theo file, hoặc sửa file nếu file sai — nhưng phải **nói rõ bạn chọn bên nào và vì sao**.

### 5.11 `next` / `status` — trả lời câu hỏi

- `next`: đọc `plans/*/plan.md`, lọc `status: pending` + không có `claimed_by` + `routing: ready-for-agent` + mọi `blocked_by` đã `completed`. Xếp P1 trước, rồi theo `created`.
- `status`: đếm theo `status`, đếm theo bốn cờ `env`, liệt kê việc `in-progress`/`in-review`.

Với nhiều repo: đọc `~/.ledger/worlds.yml` để biết repo nào thuộc thế giới nào, rồi **giao subagent** (`playbooks.md` §11) — đừng tự quét hết trong context này.

---
