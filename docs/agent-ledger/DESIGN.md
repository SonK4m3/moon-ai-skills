# Ledger — thiết kế chốt

> **Tên gọi.** Tài liệu này ghi lại thiết kế qua các bước. §1–§18 viết khi skill còn tên `pm` và
> còn một CLI; chúng giữ nguyên tên cũ vì đó là lịch sử, không phải hướng dẫn hiện hành.
> §19 ghi việc bỏ CLI, và skill nay tên **`ledger`**. Hướng dẫn hiện hành nằm ở
> `skills/ledger/SKILL.md` + `references/`; CLI cũ nằm ở `archive/pm-cli/`.
> Trạng thái: **đã duyệt, đang triển khai**. Bước 1 (§13.1) xong — xem §15.
> Nguồn: phiên grilling (Q1–Q22) + 4 vòng điều tra môi trường thật.

Bộ skill/agent quản lý task cho **một FE lead**: quản việc của bản thân, việc của member, và chạy song song nhiều session AI trên nhiều task khác nhau. Nền là bộ skill của Matt Pocock, mở rộng thêm **lớp trạng thái** mà bộ đó còn thiếu.

---

## 1. Nguyên tắc kiến trúc

Bảy nguyên tắc, mọi quyết định sau đây suy ra từ chúng.

1. **State là sự thật, session là thứ vứt đi.** Mọi bước ngoặt của một task phải nằm trong artifact bền (GitHub Issue + file trong repo). Đổi phiên, đổi harness, đổi máy, tắt máy vài ngày → session mới đọc artifact là tiếp tục được. Không có registry session, không có daemon, không có server.
2. **Repo là đơn vị.** Mỗi repo dùng chính GitHub Issues của nó. Không có sổ cái trung tâm chứa sự thật.
3. **File là sự thật, Issue là mặt tiền.** Thứ AI cần để *làm việc* nằm trong file (đọc offline, grep được, đi cùng branch). Thứ người cần để *nhìn* nằm trên Issue (label, assignee, comment, link).
4. **Số Issue là ID của work-item.** `GH-142` ↔ `plans/260101-142-<slug>/` ↔ `feat/142-<slug>`. Không cần bảng map.
5. **Flow là dữ liệu, không phải code.** Mỗi repo khai báo flow của mình. Repo của bạn theo git-flow của bạn; repo của bên khác theo flow của họ.
6. **Luật phải được máy thi hành, không phải được agent nhớ.** Bằng chứng: `journals/`, `agent-memory`, `cherry-pick-tracking`, `plans/archive` đều đã được đặc tả đầy đủ và **chưa từng chạy một lần nào**. Đặc tả không cưỡng chế = đặc tả chết.
7. **Không MCP, không binary toàn cục.** Các harness có MCP khác nhau; DSH thậm chí không có MCP nào và không có tool browser. Thứ gì chỉ dùng được ở một harness thì không dùng được.

---

## 2. Mô hình dữ liệu

### 2.1 Work-item — hai trục trạng thái

Trục 1 — **vòng đời** (một giá trị):

```
intake → normalized → ready → claimed → in-progress → in-review → done
                                     ↘ blocked        ↘ cancelled
```

Trục 2 — **vị trí triển khai** (bốn cờ độc lập, mỗi cờ có PR + sha):

| cờ | ý nghĩa |
|---|---|
| `main` | đã vào nhánh nguồn sự thật |
| `develop` | đã cherry-pick sang môi trường dev |
| `staging` | đã cherry-pick sang pre-prod |
| `prod` | đã lên production (chỉ qua merge từ `main`) |

Mỗi cờ nhận một trong: `none · cherry-picked · merged · verified · failed`.

> **Vì sao hai trục:** flow của bạn là cherry-pick bốn môi trường, nên một việc có thể `done` ở `main` nhưng chưa lên `staging`. Với một cột status duy nhất, mọi báo cáo sẽ nói dối ở đúng chỗ bạn cần tin nhất.

### 2.2 Nhà của work-item: `plans/<YYMMDD>-<issue>-<slug>/`

Bám đúng convention đã có trong repo làm việc chính (`plans/` được track trong git, 83 file, `namingFormat: "{date}-{issue}-{slug}"`). Không phát minh thư mục mới.

```
plans/260101-142-note-detail-quota/
├── plan.md                    # frontmatter chuẩn + thân plan
├── phase-01-….md              # ticket tracer-bullet (sinh bởi /to-tickets)
├── handoff-260101-codex-a1b2.md   # bàn giao, một file mỗi lần bàn giao
├── evidence.md                # bằng chứng nghiệm thu (test, ảnh, log)
└── reports/                   # report của subagent (convention đã có)
```

### 2.3 Frontmatter `plan.md`

Giữ nguyên các trường đang dùng, thêm phần của Ledger:

```yaml
---
# --- đã có trong convention hiện tại ---
title: 'Note detail — quota'
description: '...'
status: pending              # pending | in-progress | in-review | completed | cancelled
priority: P1                 # P1 | P2 | P3
effort: 8h
branch: feat/142-note-detail-quota
tags: [frontend, quota]
created: 2026-01-01
# --- Ledger thêm ---
id: GH-142                   # = số Issue, ID duy nhất trong repo
repo: your-org/your-app
routing: ready-for-agent     # ready-for-agent | ready-for-human | needs-info | needs-triage | wontfix
owner: sonnh                 # GitHub login chịu trách nhiệm
source: https://chat.google.com/...   # nguồn intake
claimed_by: codex@SON-PC#a1b2
claimed_at: 2026-01-01T09:00:00+07:00
blocked_by: [GH-140]
env:
  main:    { state: merged,        pr: 87, sha: 1a2b3c4 }
  develop: { state: cherry-picked, pr: 91, sha: 5d6e7f8 }
  staging: { state: none }
  prod:    { state: none }
---
```

### 2.4 Format chung cho GitHub Issue

Mọi work-item do Ledger tạo đều có **khối đầu máy đọc được** + **log tiến độ append-only**. Đây là "format chung" đã chốt ở Q11.

```markdown
<!-- ledger:work-item v1 -->
- **Repo**: your-org/your-app
- **Nguồn**: <link Chat/Sheet | trực tiếp>
- **Người yêu cầu**: …
- **Ưu tiên**: P1
- **Kết quả mong đợi**: …            <!-- acceptance criteria -->
- **Phạm vi**: …
- **Không làm**: …
- **Work-item**: `plans/260101-142-note-detail-quota/`
- **Nhánh**: `feat/142-note-detail-quota`
- **Môi trường**: main ⬜ · develop ⬜ · staging ⬜ · prod ⬜

## Tiến độ
<!-- ledger:log — append-only, mỗi lần `pm note` ghi một dòng -->
- 2026-01-01 09:12 · claim bởi codex@SON-PC#a1b2
```

Quy tắc: `ledger` chỉ sửa **bên trong** các marker `<!-- ledger:… -->`. Comment của người và của member không bao giờ bị ghi đè.

### 2.5 Nhãn — tái dùng, không phát minh

| nhãn | nguồn | nghĩa |
|---|---|---|
| `needs-triage` | đã có | cần bạn phân loại |
| `needs-info` | đã có | chờ người báo thêm thông tin |
| `ready-for-agent` | đã có | **hàng đợi cho AI** |
| `ready-for-human` | đã có | việc của bạn |
| `wontfix` | đã có | không làm |
| `in-progress` | **mới** | đã có session nhặt |
| `in-review` | **mới** | PR đang mở, chờ bạn |
| `blocked` | **mới** | đang chờ việc khác |

Bộ nhãn bạn đã có **mã hoá đúng cái routing mà agent PM cần**: `ready-for-agent` là hàng đợi AI, `ready-for-human` là việc của bạn. Chỉ thêm 3 nhãn.

---

## 3. Ranh giới ba tầng

| tầng | chứa gì | ai ghi | bền không |
|---|---|---|---|
| **File trong repo** (`plans/…`) | spec, plan, ticket, handoff, evidence — thứ AI đọc để làm việc | agent | bền, versioned |
| **GitHub Issue** | intake thô, label, assignee, log tiến độ, link — thứ người đọc | `ledger` + member | bền, cả team thấy |
| **Google Chat webhook** | thông báo đẩy, một chiều | `ledger` | không lưu |

**Luật đồng bộ:** mỗi lần chuyển trạng thái, `ledger` ghi **file trước, GitHub sau**, trong cùng một lệnh. Nếu `gh` lỗi (chưa đăng nhập, mất mạng) → file vẫn đúng, một dòng `sync-pending` được ghi lại, và `pm sync` (hoặc `pm status`) hòa giải sau. File không bao giờ phụ thuộc mạng.

---

## 4. Luồng v1

```
1. INTAKE      bạn dán text từ Google Chat/Sheet vào:  ghi work-item      
                 → agent chuẩn hoá thành draft work-item
                 → bạn xem, sửa, xác nhận
                 → tạo Issue (gh) + thư mục plans/<...>/
                 → routing: ready-for-agent | ready-for-human

2. QUEUE       pm next        → việc kế tiếp nên làm (theo routing, priority, blocked_by)
               pm status      → bảng tổng hợp nhiều repo + cảnh báo lệch

3. CLAIM       nhặt việc             → bộ ba claim (xem §5)
                 → sinh nhánh feat/142-<slug>

4. BUILD       agent chạy chuỗi skill Matt:
                 /to-spec → /to-tickets → /implement (→ /tdd) → /code-review
               ghi một dòng log      → ghi tiến độ vào Issue + file

5. HANDOFF     viết handoff        → handoff-<date>-<session>.md trong thư mục plan
                 → bắt buộc nếu work-item chưa done (hook ép, xem §7)

6. PR          /pr → mở PR vào main → nhãn in-review → thông báo bạn (Chat)
                 → BẠN review. Đây là cổng nghiệm thu.

7. ENV         sau khi merge: cập nhật cờ main; cherry-pick develop/staging
                 → cập nhật cờ; prod chỉ merge từ main
                 → mọi thay đổi cờ đều ghi lại kèm PR + sha

8. DONE        đóng việc           → đóng work-item, đóng Issue
```

---

## 5. Claim — bộ ba, theo thứ tự cố định

Hai agent cùng nhặt một việc là kịch bản phải chặn ngay từ đầu:

1. **Nhãn `in-progress` + assignee trên Issue** — team nhìn thấy ngay trên GitHub.
2. **`claimed_by: <session-id>` trong `plan.md`** — AI đọc được offline, không cần mạng.
3. **Nhánh `feat/<issue>-<slug>`** — bằng chứng cuối cùng, không thể giả.

Luật:
- Claim xong **trước khi sửa một dòng code**.
- Thấy Issue đã có assignee khác ⇒ **coi như đã bị nhặt, không giành**. Chọn việc khác.
- `gh` lỗi ⇒ vẫn ghi file + tạo nhánh, ghi `sync-pending`.
- Mọi chuyển trạng thái đi qua **một đường duy nhất** là `ledger`. Sửa label bằng tay trên GitHub là hợp lệ, nhưng `pm doctor` sẽ phát hiện lệch và hòa giải.

---

## 6. Bộ skill

### 6.1 Nền: skill của Matt (dùng nguyên, không viết lại)

| khoảnh khắc | skill Matt |
|---|---|
| Ý tưởng còn mờ | `/grill-with-docs` |
| Hội thoại → spec | `/to-spec` |
| Spec → ticket tracer-bullet | `/to-tickets` |
| Ticket → code | `/implement` (tự chạy `/tdd`, kết bằng `/code-review`) |
| Cả spec một lượt | `/implement-spec` |
| Issue thô từ người khác | `/triage` |
| Bug khó | `/diagnosing-bugs` |
| Mở PR | `/pr` |
| Ranh giới phiên | `/handoff` |
| Nợ kỹ thuật / kiến trúc | `/improve-codebase-architecture`, `/codebase-design` |
| Từ vựng domain | `/domain-modeling` |
| Việc mờ cỡ lớn | `/wayfinder` |
| Bước chỉ con người làm được | `/wizard` |
| Đọc tài liệu hộ | `/research` |
| Sau khi xong | `/retro` |
| Điều hướng | `/ask-matt` |

### 6.2 Mới — 5 skill của Ledger

| skill | làm gì |
|---|---|
| **`/pm`** | đầu mối duy nhất. Subcommand: `setup · intake · next · claim · note · handoff · status · sync · report · doctor · archive` |
| **`/pm-intake`** | chuẩn hoá text thô (Chat/Sheet) → draft work-item có cấu trúc; hỏi bạn những gì còn thiếu |
| **`/pm-handoff`** | bản ghi đè skill `handoff` của Matt: skill gốc lưu vào **thư mục tạm của hệ điều hành** ⇒ mất; bản này ghi vào thư mục plan |
| **`/pm-setup`** | cài framework vào một repo (sinh file, merge hook, idempotent) |
| **`/pm-flow`** | khai báo/đọc flow của repo (`github-flow` đơn giản ↔ `cherry-pick-4-env`) |

### 6.3 Nối hai tầng

```
/pm intake ──► /grill-with-docs (nếu còn mờ) ──► /to-spec ──► /to-tickets
                                                                   │
                                          /nhặt việc           ◄──────────┘
                                                │
                                          /implement (→ /tdd → /code-review)
                                                │
                                          /pm handoff ──► /pr ──► bạn review
```

---

## 7. Logic & setup

### 7.1 `archive/pm-cli/pm.mjs`

Node, không phụ thuộc gì ngoài `git` + `gh`. Chạy được ở mọi harness vì mọi harness đều gọi được shell.

```
pm setup [--repo <path>]              cài vào repo, idempotent
ghi work-item       [--source <url>]   chuẩn hoá → draft → xác nhận → tạo Issue + plan dir
pm next [--repo <path>]               việc kế tiếp
pm claim <id>                         bộ ba claim
pm note <id> "<text>"                 ghi tiến độ (Issue + file)
pm handoff <id>                       sinh handoff theo template
pm env <id> <main|develop|staging|prod> <state> [--pr N] [--sha X]
pm status [--world work|personal|all] bảng tổng hợp + cảnh báo lệch
pm sync [--repo <path>]               đẩy state file → GitHub, hòa giải
pm doctor                             phát hiện: label≠file, plan mồ côi, handoff thiếu, nhánh lạc
pm archive <id>                       đóng work-item
```

### 7.2 Hook — chỗ luật được thi hành

Đây là phần trả lời trực tiếp cho bốn đặc tả đã chết. Framework **không** dựa vào việc agent nhớ gọi `ledger`; nó tự gọi:

| hook | hành vi |
|---|---|
| `SessionStart` | in `pm next` — phiên mới mở ra là biết ngay nên làm gì |
| `Stop` / `SessionEnd` | nếu work-item đang `in-progress` do phiên này claim mà **chưa có handoff** → chặn kết thúc, nhắc viết handoff |
| `PreToolUse` (git commit) | cảnh báo nếu nhánh hiện tại không map với work-item nào |
| `PreToolUse` (git push) | chạy `npm run ci:check` (giữ nguyên gate bạn đã có) |
| statusline | `GH-142 · in-progress · feat/142-note-detail-quota · main✅ develop⬜ staging⬜ prod⬜` |

### 7.3 `pm setup` sinh ra gì trong repo đích

```
.ledger/
  flow.yml          # flow của repo (dữ liệu, không phải code)
  config.json       # repo, issue prefix, paths, gates
AGENTS.md           # khối <!-- ledger:start -->…<!-- ledger:end --> (idempotent)
CLAUDE.md           # con trỏ tới AGENTS.md
.claude/rules/pm.md # SINH RA từ framework, một chiều
.claude/hooks/pm-*.cjs
.claude/settings.json  # merge hook entries (idempotent)
```

**Sinh ra, không copy tay.** Đây là cách chữa căn bệnh đã phát hiện: `.agent/rules` và `.claude/rules` là bản sao thật và **2/5 file đã trôi lệch nhau**; `.claude/skills` (115) chồng lấn `.agent/skills` (46) không manifest.

`pm setup` chỉ ghi **bên trong marker của nó**, không bao giờ đụng phần bạn tự viết.

### 7.4 `flow.yml`

```yaml
profile: cherry-pick-4-env        # hoặc: github-flow
source_branch: main               # PR luôn target nhánh này
env_branches: [develop, staging, prod]
prod_policy: merge-from-main      # prod chỉ nhận merge từ main
branch_format: "{type}/{issue}-{slug}"
branch_types: [feat, fix, chore, refactor, hotfix, docs]
pre_commit_gate: npm run ci:check
pr_target: main
commit_style: conventional
```

`profile: github-flow` dành cho repo của bên khác — PR thẳng vào `main`, không cherry-pick, không nhánh môi trường. **Flow là dữ liệu, nên đổi profile là đổi hành vi, không phải sửa code.**

---

## 8. `worlds.yml` — đa vùng, đa danh tính

Nằm ở **`~/.ledger/worlds.yml`** (cấp máy, không nằm trong repo public):

```yaml
worlds:
  work:
    root: D:/work
    gh_account: your-work-account
    ssh_alias: github-work-account
    repos: [your-org/your-app, your-org/your-other-app, …]
  personal:
    root: D:/projects
    gh_account: your-personal-account              # chưa đăng nhập gh
    ssh_alias: github-personal-account
    repos: [your-name/your-skills, your-org/…]
notify:
  google_chat_webhook: <secret>      # KHÔNG commit vào repo public
```

Chặn cứng đã biết: `gh` hiện **chỉ có tài khoản công việc**. Vùng `personal` sẽ báo "không có quyền truy cập" cho tới khi bạn `gh auth login` thêm account. `ledger` phải nói thẳng điều đó thay vì im lặng trả bảng rỗng.

---

## 9. Thông báo

| mức | kênh | ví dụ |
|---|---|---|
| bình thường | **comment vào Issue** | "đã xong phase 2, còn 1 phase" |
| cần bạn quyết | **Google Chat webhook** | "PR #87 chờ review · task #142" |
| theo yêu cầu | **terminal** (`pm status`) | bảng tổng hợp |

Hai kênh chứ không một, vì một kênh duy nhất sẽ hoặc ồn đến mức bạn tắt, hoặc chìm đến mức bạn bỏ sót.

Webhook là **gửi một chiều** — không cần API Google, không cần service account, không cần domain-wide delegation. (Điều tra đã xác nhận: agent **không đọc được** Google Chat/Sheets bằng công cụ hiện có; intake vì vậy là **bạn dán text vào**, và giá trị nằm ở bước chuẩn hoá.)

Việc tạo webhook URL là bước chỉ con người làm được → dùng **`/wizard`**.

---

## 10. Quyền của agent PM

Luật một câu: **trước PR là tự chủ, sau PR là của bạn.**

**Được làm, không cần hỏi:** tạo/normalize Issue · gán nhãn · chia ticket từ spec · gán việc cho agent · tự chạy `/code-review` · **mở PR** · ghi tiến độ · thông báo.

**Phải hỏi:** merge · cherry-pick sang `develop`/`staging`/`prod` · push lên nhánh môi trường · đóng Issue của người khác · đổi assignee của member · `push --force`.

**Luôn thông báo:** mọi hành động đều để lại vết — một dòng trong `## Tiến độ` của Issue, hoặc một tin Chat khi cần bạn quyết. Quyền lớn nhưng không im lặng.

---

## 11. Những gì **không** xây

- Không server, không daemon, không MCP, không binary toàn cục.
- Không **registry session** — bạn không cần biết session nào đang chạy, chỉ cần biết task nào đã có người nhặt và tiến độ ra sao.
- Không sổ cái trung tâm chứa sự thật — mỗi repo giữ Issue của nó.
- Không từ vựng trạng thái mới — tái dùng bộ nhãn triage đã có.
- Không viết lại framework agent đang có trong repo công việc — **kế thừa**: 5 rules, 16 persona, 14 workflow proxy, convention triage/issue-tracker/domain/cherry-pick, format plan.

---

## 12. Rủi ro & cách chống

| rủi ro | cách chống |
|---|---|
| **Trở thành "đặc tả chết" thứ năm** | Hook tự gọi `ledger` ở đầu/cuối phiên. Không dựa vào việc agent nhớ. |
| Framework lại nằm ngoài git | Framework sống trong `moon-ai-skills`; `pm setup` sinh file vào repo đích |
| Nhân bản rồi trôi lệch (như `.agent/rules` ↔ `.claude/rules`) | File sinh ra một chiều, chỉ ghi trong marker; `pm doctor` phát hiện lệch |
| `plans/` phình mãi (15 thư mục, chưa từng archive) | `pm archive` + `pm doctor` cảnh báo plan mồ côi |
| Repo public chứa dữ liệu nội bộ | `moon-ai-skills` chỉ chứa **quy ước + logic**; state, `worlds.yml`, webhook, tên member → ở `~/.ledger/` hoặc repo dự án |
| Vùng `personal` im lặng hỏng | `ledger` báo thẳng khi `gh` thiếu quyền, không trả bảng rỗng |

---

## 13. Thứ tự triển khai v1

| # | việc | nghiệm thu |
|---|---|---|
| 1 | `.ledger/` + `flow.yml` + `worlds.yml` + doc quy ước | `pm doctor` chạy được, báo đúng 0 work-item |
| 2 | `archive/pm-cli/pm.mjs`: `setup · intake · next · claim · note · handoff · status · sync` | chạy trọn một vòng trên repo thử |
| 3 | Skill `/pm` + `/pm-intake` + `/pm-handoff` + `/pm-setup` + `/pm-flow` | gọi được từ DSH **và** Claude Code |
| 4 | Hook: SessionStart in `pm next`, Stop ép handoff, statusline | tắt phiên giữa việc → bị nhắc handoff |
| 5 | Pilot thật ở một repo công việc | 3 work-item thật chạy hết vòng, không cần bạn nhắc |

**Tiêu chí thành công của v1:** bạn dán một task từ Google Chat vào, và **3 ngày sau** vẫn biết nó đang ở đâu — mà không phải nhớ gì, không phải mở session cũ.

---

## 14. Cần bạn xác nhận trước khi code

1. **Tên**: `ledger` (lệnh/skill) — hay bạn muốn tên khác?
2. **Nhà của work-item**: bám `plans/<YYMMDD>-<issue>-<slug>/` (convention đang dùng) — hay `docs/work/`?
3. **`docs/cherry-pick-tracking.md`**: giữ song song, hay để `ledger` thay thế nó? (Hiện file trống, và format cũ **thiếu `main`/`prod`**.)
4. **Ba nhãn mới** `in-progress`, `in-review`, `blocked`: đồng ý?
5. **Pilot**: một repo công việc là nơi thử đầu tiên — xác nhận?

Sau khi bạn duyệt 5 điểm này, tôi bắt đầu từ mục 13.1.

---

## 15. Bước 1 — đã triển khai

| đường dẫn | là gì |
|---|---|
| `skills/ledger/SKILL.md` | đầu mối skill `/pm` |
| `skills/ledger/references/conventions.md` | quy ước đầy đủ (chuẩn tắc) |
| `skills/ledger/references/work-item.md` | schema work-item |
| `skills/ledger/references/issue-format.md` | format chung của Issue + bảng nhãn |
| `skills/ledger/templates/` | `flow.yml`, `config.json`, `worlds.yml` |
| `archive/pm-cli/pm.mjs` | CLI: `init`, `setup`, `doctor` |
| `archive/pm-cli/selftest.ps1` | dựng fixture có lỗi cố ý, kiểm tra `doctor` bắt đúng |

```bash
node archive/pm-cli/pm.mjs init --world work=D:/work --world personal=D:/projects \
  --account work=your-work-account --account personal=your-personal-account
node archive/pm-cli/pm.mjs setup --repo <repo>
node archive/pm-cli/pm.mjs doctor [--repo <repo> | --all]
pwsh -File archive/pm-cli/selftest.ps1
```

Kết quả thật lúc triển khai: `~/.ledger/worlds.yml` sinh ra **33 repo / 2 world**; `doctor` xác nhận **33/33 remote khớp**, và cảnh báo đúng một việc — tài khoản cá nhân `your-personal-account` chưa đăng nhập `gh`, nên vùng `personal` chưa đọc được Issue.

### Hai ràng buộc phát hiện khi viết code

1. **DSH chặn `child_process` dùng stdio kiểu pipe** → gọi `git`/`gh` từ Node trả `EPERM`. `archive/pm-cli/pm.mjs` vì vậy thu output qua **file tạm** (`stdio: ['ignore', fd, fd]`). Đã kiểm chứng: pipe hỏng, file fd chạy được — kể cả với repo ngoài workspace.
2. **PowerShell ghi file kèm BOM** → frontmatter `---` không khớp nên work-item bị coi là plan cũ. `parseYaml` và `readFrontmatter` nay bỏ BOM trước khi đọc.

Cả hai đã nằm trong code, và `archive/pm-cli/selftest.ps1` khoá lại để không tái phát.

### Bước 1 **chưa** làm

`intake · next · claim · note · handoff · env · status · sync · archive` — đã làm ở bước 2.

---

## 16. Bước 2, 3, 4 — đã triển khai

### Engine (`archive/pm-cli/pm.mjs`, v0.2)

| lệnh | làm gì |
|---|---|
| `init` | quét thư mục gốc tìm git repo → `~/.ledger/worlds.yml` |
| `setup` | sinh `.ledger/flow.yml`, `.ledger/config.json`, khối pm trong `AGENTS.md`, hook `.claude/settings.json`, persona `.claude/agents/pm.md`, dòng `.gitignore` |
| `doctor` | kiểm tra framework, worlds, remote từng repo, tài khoản gh, flow, từng work-item; `--all`, `--json` |
| `intake` | chuẩn hoá text thô → draft; `--create` mới ghi; `--from-file` cho text dài |
| `next` | việc sẵn sàng nhặt: chưa ai giữ, không bị `blocked_by`, đúng routing |
| `claim` | bộ ba claim + tạo nhánh (chỉ checkout khi cây làm việc sạch) |
| `release` | nhả việc về hàng đợi |
| `note` | ghi `log.md` + comment lên Issue |
| `handoff` | sinh handoff vào thư mục work-item, tự điền file đã đổi và nhật ký gần nhất |
| `env` | cập nhật bốn cờ môi trường kèm PR + sha |
| `status` | bảng tổng hợp hai trục trên nhiều repo |
| `sync` | đẩy file → GitHub; tạo Issue thật cho work-item còn ID tạm `L-<n>` rồi đổi tên thư mục |
| `archive` | đóng work-item + Issue, chuyển vào `plans/archive/` |
| `hook` | `session-start` in việc đang chạy; `stop` chặn kết thúc phiên nếu thiếu handoff |

**Đường offline:** `gh` lỗi thì work-item vẫn được tạo với ID tạm `L-<n>` và `sync_pending: true`; `pm sync` tạo Issue thật, đổi `id` và đổi tên thư mục. Đã kiểm chứng bằng repo giả trỏ vào repo GitHub không tồn tại.

### Hook — chỗ luật được máy thi hành

`pm setup` gắn vào `.claude/settings.json`:

| hook | hành vi | đã kiểm chứng |
|---|---|---|
| `SessionStart` | in việc đang chạy + việc sẵn sàng nhặt | ✓ |
| `Stop` | chặn (exit 2) nếu có work-item `in-progress` chưa có handoff; nhắc tối đa một lần mỗi 30 phút để không lặp | ✓ chặn lần 1, im lần 2, im sau khi có handoff |

Codex và DSH không có hook — luật vẫn nguyên, chỉ là gọi tay. Đây là lý do thiết kế không dựa vào hook để *đúng*, chỉ dựa vào hook để *không bị quên*.

### Sai lệch so với §6.2, và lý do

Thiết kế chốt 5 skill mới (`/pm`, `/pm-intake`, `/pm-handoff`, `/pm-setup`, `/pm-flow`). **Thực tế làm 1 skill `/pm` + `references/` + `agents/project-manager.md`.** Lý do: catalog skill của bạn đã có **98 skill**; thêm 4 skill nữa trỏ vào cùng một CLI chỉ làm loãng khả năng trigger mà không thêm năng lực. Một skill với progressive disclosure (`SKILL.md` → `references/`) cho đúng kết quả với ít nhiễu hơn. Nếu bạn vẫn muốn tách, tách được bất cứ lúc nào — nội dung đã nằm sẵn trong `references/`.

### Còn lại

Bước 5 — pilot trên repo công việc chính: 3 work-item thật chạy hết vòng, không cần nhắc.

---

## 17. Bước 5 — pilot trên một repo công việc thật

`pm setup` đã chạy trên một repo công việc thật (branch `main`), để kiểm chứng trên dữ liệu thật chứ không chỉ trên fixture.

**Dấu chân trên file được git theo dõi — đúng 2 chỗ:**

| file | thay đổi |
|---|---|
| `.gitignore` | +1 dòng: `.ledger/.hook-state.json` |
| `AGENTS.md` | +13 dòng: khối `<!-- ledger:start -->…<!-- ledger:end -->` ở cuối file |

Phần còn lại nằm trong `.claude/` (repo đó đã ignore `.claude`) và `.ledger/` (2 file mới).

Hoàn tác: `git checkout AGENTS.md .gitignore && rm -rf .ledger`

`pm doctor` đọc được trạng thái thật của repo: **16 plan cũ** không theo schema pm, bỏ qua không chặn, **0 fail**. `pm status --world work` chạy được trên vùng `work`.

### Lệnh `pm adopt` — do pilot phát hiện

16 plan cũ nghĩa là `status` của repo đó hiện ra 0 work-item dù đã có 16 plan thật. Nên có thêm:

```bash
pm adopt --list                 # liệt kê plan cũ chưa theo schema
pm adopt --all --dry-run        # xem trước
pm adopt --all                  # thêm frontmatter, GIỮ NGUYÊN phần thân plan
```

`adopt` chỉ **thêm** frontmatter vào đầu file, không sửa phần nội dung cũ; work-item nhận ID tạm `L-<n>`, `pm sync` sẽ tạo Issue thật và đổi tên thư mục theo `<YYMMDD>-<số>-<slug>`.

### Việc còn lại của người dùng

1. `gh auth login` thêm tài khoản cá nhân — vùng `personal` chưa đọc được Issue nếu thiếu.
2. Tạo 3 nhãn còn thiếu trong repo đích (lệnh in ra ở cuối `pm setup`).
3. `pm intake` một việc thật đầu tiên.
4. Tuỳ chọn: `pm adopt --all` cho các plan cũ.

> Phần chi tiết môi trường cụ thể của máy người dùng — đường dẫn, tài khoản, quy trình nội bộ của repo công việc — **không nằm trong repo công khai này**. Bản đầy đủ để ở `~/.ledger/ENVIRONMENT.md` trên máy.

---

## 18. Đổi hình dạng: skill dẫn dắt, script thành tay

Người dùng đặt câu hỏi đúng: *"tôi làm việc với AI chat, sao phải dùng CLI?"* Đánh giá lại thì thấy **chỗ chia sai nằm ở `intake`**: script đang làm việc phán đoán, và làm dở — tiêu đề lấy từ dòng đầu tin nhắn, slug cắt 5 từ, không có tiêu chí nghiệm thu, không có phạm vi, không có quyết định routing. Đó đúng là phần người dùng cần nhất.

### Đã đổi

| thay đổi | nội dung |
|---|---|
| Thêm `references/intake.md` | toàn bộ phần phán đoán: phân loại yêu cầu, viết tiêu chí nghiệm thu đo được, thang P1–P3, quyết routing, khi nào chia ticket, hỏi gì vs tự quyết, 4 ví dụ |
| Thêm `references/playbooks.md` | 11 tình huống chat → việc làm, kèm prompt mẫu giao subagent |
| Viết lại `SKILL.md` | mở bằng **vai** và **phán đoán**; bảng lệnh xuống cuối và đổi nhãn thành "bộ tay, không phải giao diện" |
| Viết lại `agents/project-manager.md` | persona nói rõ phần nào là của agent, phần nào của script |
| Thêm `conventions.md` §11 | bảng phân chia phán đoán ↔ tay máy, và **ba lý do duy nhất** script tồn tại |

### Đã cân nhắc và **không** làm

Trong đề xuất ban đầu tôi nói sẽ gỡ 5 lệnh (`next`, `note`, `release`, `archive`, `status`) khỏi script. Khi làm thì thấy không nên:

- `next` phải cho **cùng câu trả lời** với `hook session-start`. Hai đường cài đặt cùng một luật là hai nguồn sự thật.
- `status` và `init` là vòng lặp qua 33 repo — đúng loại việc script giỏi hơn agent.
- `archive` là nhiều bước ghi (đổi status, đóng Issue, chuyển thư mục); làm tay dễ sai thứ tự.
- `note` và `release` chỉ 20 dòng, nhưng chúng ghi vào đúng những chỗ (`log.md`, nhãn, assignee) mà format phải khớp.

Thay vào đó chúng bị **hạ cấp trong tài liệu**: skill mô tả hành vi và format, lệnh chỉ là cách làm nhanh. Nếu agent tự làm, nó phải theo đúng format trong `references/` — không có format thứ hai.

> Bản chất: **sản phẩm thật là `references/conventions.md`** — tập quy ước. Script và skill chỉ là hai cách giao cùng tập quy ước đó cho máy. Vứt `archive/pm-cli/pm.mjs` đi thì quy ước vẫn còn nguyên giá trị.

---

## 19. Bỏ script khỏi đường làm việc

Sau khi thấy vòng đời chạy thật trên một repo thật, người dùng quyết định: **chỉ dùng skill và agent**, không dùng CLI.

### Đã làm để skill tự đủ

`archive/pm-cli/pm.mjs` không biến mất, nhưng nó **không còn là đường làm việc**. Để bỏ được nó, skill phải có thứ mà trước đó script giữ hộ:

| thêm | nội dung |
|---|---|
| `references/formats.md` | **hợp đồng định dạng**: định danh, frontmatter `plan.md` + 7 luật sửa, `log.md`, thân Issue + 3 marker, lệnh tạo Issue, 4 nhãn — cộng **11 thủ tục** viết dưới dạng "làm gì → kiểm tra gì" |
| `formats.md` §5.10 | `doctor` thành **12 điểm kiểm tra agent tự chạy**, thay vì một lệnh |
| `formats.md` §6 | nói thẳng ba việc script làm tốt hơn: quét nhiều repo, di trú hàng loạt, và **làm chương trình cho hook** |
| `SKILL.md` | bỏ bảng lệnh; thay bằng bảng "việc → thủ tục ở đâu" |
| `playbooks.md` | 13 chỗ "gọi `pm X`" đổi thành việc phải làm, trỏ về `formats.md` |
| `conventions.md` §11 | cột "script" đổi thành "tuỳ chọn"; chỉ còn ba việc script làm tốt hơn |

### Cái mất, nói thẳng

1. **Không còn lớp cưỡng chế.** Hook `Stop` cần một chương trình. Ở harness không có hook (Codex, DSH) thì trước đó cũng không có; nay Claude Code cũng mất. Đây là đánh đổi có ý thức, sau khi đã thấy bốn đặc tả cũ chết vì thiếu cưỡng chế.
2. **Chậm hơn và tốn token hơn** ở việc khối lượng lớn: quét 33 repo, thêm frontmatter cho 16 plan cũ.
3. **Trôi lệch định dạng có thể quay lại** nếu agent viết tay sai. Đối trọng duy nhất là `formats.md` — nên nếu sau này thấy lệch, việc cần làm là làm cho hợp đồng định dạng chặt hơn, không phải viết lại script.

### Trạng thái mã

`archive/pm-cli/pm.mjs` (v0.3) vẫn nằm trong repo, đã commit ở `150f43d`, kèm `archive/pm-cli/selftest.ps1` 24 điểm. Giữ lại vì: nó là bản tham chiếu cho các thủ tục trong `formats.md`, và là điểm khởi đầu nếu sau này muốn dựng lại hook check.