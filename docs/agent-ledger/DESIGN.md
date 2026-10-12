# Ledger — thiết kế chốt

`ledger` là bộ skill giữ sổ công việc cho **một FE lead**: việc của bản thân, việc của member, và nhiều phiên AI chạy song song trên nhiều task. Nền là bộ skill của Matt Pocock; phần `ledger` thêm vào là **lớp trạng thái** mà bộ đó còn thiếu. Tài liệu này là **lịch sử thiết kế** — vì sao hệ thống có hình dạng hiện tại; thứ để *làm việc* nằm ở skill:

| cần gì | ở đâu |
|---|---|
| Vào việc, biết mình phải làm gì | [`skills/ledger/SKILL.md`](../../skills/ledger/SKILL.md) |
| Quy ước chuẩn tắc và định dạng file | [`skills/ledger/references/`](../../skills/ledger/references/) — `conventions.md`, `formats.md` |
| Schema work-item và format Issue | `references/work-item.md`, `references/issue-format.md` |
| Chuẩn hoá yêu cầu thô, và tình huống chat → việc làm | `references/intake.md`, `references/playbooks.md` |
| File sinh vào repo đích | [`skills/ledger/templates/`](../../skills/ledger/templates/) |

---

## 0. Trạng thái hiện tại

**Skill làm gì bây giờ.** Giữ sổ công việc bằng **file + Issue** thay vì một chương trình: chuẩn hoá yêu cầu thô thành work-item có tiêu chí nghiệm thu đo được, chốt routing, theo dõi mỗi việc đã tới môi trường nào, nói hôm nay nên làm gì. Chạy được ở mọi harness vì mọi việc làm bằng công cụ của agent — không hook, không daemon, không MCP, không binary. **State là sự thật, session là thứ vứt đi:** đổi phiên, đổi máy, tắt máy vài ngày — người tiếp theo đọc artifact là làm tiếp được.

**Ba việc chỉ `ledger` làm** — phần không kit nào có: **(1)** ghi trạng thái vào `plan.md` + `log.md` (`status`, `claimed_by`, bốn cờ môi trường, nhật ký append-only) để AI đọc được offline; **(2)** giữ **file là sự thật, Issue là mặt tiền** — ghi file trước, GitHub sau, `gh` lỗi thì work-item vẫn sống với `sync_pending: true`; **(3)** bắt buộc `handoff-<YYMMDD>-<session>.md` trong thư mục work-item khi phiên kết thúc giữa việc, **không** ghi vào thư mục tạm của hệ điều hành.

| mục | còn hiệu lực hay lịch sử |
|---|---|
| §0–§8, §10, §12 — trạng thái, nguyên tắc, mô hình dữ liệu, claim, cờ môi trường, thông báo, quyền, worlds, rủi ro | **còn hiệu lực** (trừ §9 nằm giữa) |
| §9 "Đã gỡ" và §13 "lịch sử thiết kế" — chỉ để tra cứu, không mô tả đường làm việc | lịch sử |
| §11 "không xây" — chốt rồi, dùng để từ chối đề xuất cũ | **còn hiệu lực** |

---

## 1. Nguyên tắc chốt

1. **State là sự thật, session là thứ vứt đi.** Mọi bước ngoặt nằm trong artifact bền (Issue + file trong repo). Không registry session, không daemon, không server.
2. **Repo là đơn vị.** Mỗi repo dùng chính GitHub Issues của nó. Không có sổ cái trung tâm chứa sự thật.
3. **File là sự thật, Issue là mặt tiền.** Thứ AI cần để *làm việc* nằm trong file (đọc offline, grep được, đi cùng branch). Thứ người cần để *nhìn* nằm trên Issue.
4. **Số Issue là ID của work-item.** `GH-142` ↔ `plans/260101-142-<slug>/` ↔ `feat/142-<slug>`. Không cần bảng map.
5. **Flow là dữ liệu, không phải code.** Mỗi repo khai báo flow của mình trong `.ledger/flow.yml`. Đổi profile là đổi hành vi.
6. **Không MCP, không binary toàn cục.** Harness nào cũng gọi được shell; thứ chỉ chạy ở một harness thì không dùng được.
7. **Luật phải được máy thi hành, không phải được agent nhớ.** Bằng chứng: `journals/`, `agent-memory`, `cherry-pick-tracking`, `plans/archive` đều đã được đặc tả đầy đủ và **chưa từng chạy một lần nào**.
8. **Handoff ghi vào thư mục work-item, không ghi vào thư mục tạm của hệ điều hành.** Đó là lỗi của skill `handoff` gốc, và là lý do handoff hay bị mất.

> **Chỗ hở đã biết.** Không còn lớp cưỡng chế nào (§9): ở harness không có hook thì luật chỉ còn là luật viết ra. Mọi quy ước ở đây là **chuẩn tắc**, không phải gợi ý — nhưng không có gì tự chặn bạn vi phạm. Đối trọng duy nhất là `formats.md`.

---

## 2. Mô hình dữ liệu

### 2.1 Work-item — hai trục trạng thái

Trục 1 — **vòng đời** (một giá trị): `pending · in-progress · in-review · completed · cancelled`.

Trục 2 — **vị trí triển khai** (bốn cờ độc lập): `main · develop · staging · prod`, mỗi cờ nhận `none · cherry-picked · merged · verified · failed` kèm `pr` + `sha`.

Vì sao hai trục: một việc có thể đã vào `main` nhưng chưa lên `staging`. Với một cột status duy nhất, mọi báo cáo sẽ nói dối ở đúng chỗ cần tin nhất.

### 2.2 Nhà của work-item

`plans/<YYMMDD>-<số>-<slug>/` — theo đúng convention repo này đã dùng, không phát minh thư mục mới. Trong đó: `plan.md` (frontmatter + thân plan) · `handoff-<YYMMDD>-<session>.md` (một file mỗi lần bàn giao) · `evidence.md` · `reports/` (report của subagent).

Chưa tạo được Issue thì dùng `L-<n>` + `sync_pending: true`; lần hòa giải sau tạo Issue thật rồi đổi tên thư mục.

### 2.3 Frontmatter `plan.md` — bản tối thiểu

```yaml
---
id: GH-142                                 # = số Issue, ID duy nhất trong repo
status: in-progress                        # pending | in-progress | in-review | completed | cancelled
routing: ready-for-agent                   # 5 giá trị, xem conventions.md §3
project: "Tab Action items"                # ba trường định vị luôn phải đủ
repo: your-org/your-app
branch: feat/142-note-detail-quota
acceptance:                                # mỗi mục có verify = MỘT lệnh chạy được
  - text: "…"
    verify: "…"
claimed_by: codex@SON-PC#a1b2
claimed_at: 2026-01-01T09:00:00+07:00
env:                                       # luôn đủ bốn khoá
  main: { state: merged, pr: 87, sha: 1a2b3c4 }
  develop: { state: none }
  staging: { state: none }
  prod: { state: none }
---
```

Trường đầy đủ (kể cả `priority`, `scope`, `out_of_scope`, `source`, `blocked_by`): `work-item.md`. Bảy luật sửa file và phần thân Issue: `formats.md` §2. Khoá nào không dùng thì **xoá cả dòng**, đừng để trống.

---

## 3. Ranh giới ba tầng

| tầng | chứa gì | ai ghi | bền không |
|---|---|---|---|
| **File trong repo** (`plans/…`) | plan, ticket, handoff, evidence — thứ AI đọc để làm việc | agent | bền, versioned |
| **GitHub Issue** | intake thô, nhãn, assignee, log tiến độ, link — thứ người đọc | `ledger` + member | bền, cả team thấy |
| **Google Chat webhook** | thông báo đẩy, một chiều | `ledger` | không lưu |

**Luật đồng bộ:** ghi **file trước, GitHub sau**. `gh` lỗi (chưa đăng nhập, mất mạng) ⇒ file vẫn đúng, ghi `sync_pending: true`, lần hòa giải sau đẩy lại. **File không bao giờ phụ thuộc mạng.**

---

## 4. Vòng đời một việc

```
1. INTAKE   text thô (Chat/Sheet) → draft → người xác nhận → Issue + plans/<…>/ + routing
2. QUEUE    chọn việc kế tiếp theo routing, priority, blocked_by
3. CLAIM    bộ ba claim (§5) + nhánh <type>/<số>-<slug>
4. BUILD    /to-spec → /to-tickets → /implement (→ /tdd → /code-review), mỗi bước ngoặt một dòng log
5. HANDOFF  handoff-<YYMMDD>-<session>.md trong thư mục work-item, bắt buộc nếu chưa xong
6. PR       /pr vào main → nhãn in-review → NGƯỜI review. Đây là cổng nghiệm thu.
7. ENV      merge xong: cập nhật cờ main; cherry-pick develop/staging; prod chỉ merge từ main
8. DONE     đóng work-item + đóng Issue
```

---

## 5. Claim — bộ ba, theo thứ tự cố định

Hai agent cùng nhặt một việc là kịch bản phải chặn từ đầu:

1. **Nhãn `in-progress` + assignee trên Issue** — team nhìn thấy ngay trên GitHub.
2. **`claimed_by` + `claimed_at` trong `plan.md`** — AI đọc được offline, không cần mạng.
3. **Nhánh `<type>/<số>-<slug>`** — bằng chứng cuối cùng, không thể giả.

Session-id có dạng `<harness>@<HOST>#<4 ký tự>`, ví dụ `codex@SON-PC#a1b2`. Luật: claim **trước khi sửa một dòng code** · Issue đã có assignee khác ⇒ **không giành** · `gh` lỗi ⇒ vẫn ghi file + tạo nhánh, ghi `sync_pending`.

---

## 6. Bốn cờ môi trường

| cờ | là gì | cờ nhận `merged` khi |
|---|---|---|
| `main` | nhánh nguồn sự thật, PR luôn target vào đây | đã merge |
| `develop` | môi trường dev | — (chỉ cherry-pick) |
| `staging` | pre-prod | — (chỉ cherry-pick) |
| `prod` | production | phần còn lại của một lần merge từ `main` |

Mọi thay đổi cờ ghi kèm PR + sha. **Thứ tự không được đảo:** cherry-pick để test *trước*, merge PR *sau*. Chi tiết: `formats.md` §5.6.

---

## 7. Thông báo

| mức | kênh |
|---|---|
| bình thường | **comment vào Issue** — "xong phase 2, còn 1 phase" |
| cần người quyết | **Google Chat webhook** — một chiều, URL lấy từ `LEDGER_CHAT_WEBHOOK` |
| theo yêu cầu | **terminal** — bảng tổng hợp |

Hai kênh chứ không một, vì một kênh duy nhất sẽ hoặc ồn đến mức người tắt, hoặc chìm đến mức người bỏ sót. Tạo webhook URL là bước chỉ con người làm được → dùng `/wizard`.

Điều tra đã xác nhận: agent **không đọc được** Google Chat/Sheets bằng công cụ hiện có. Intake vì vậy là **người dán text vào**, và giá trị nằm ở bước chuẩn hoá.

---

## 8. Quyền của agent

Luật một câu: **trước PR là tự chủ, sau PR là của người.**

| | |
|---|---|
| **Được làm, không hỏi** | tạo/normalize Issue · gán nhãn · chia ticket từ spec · nhận việc · tự chạy `/code-review` · **mở PR** · ghi tiến độ · thông báo |
| **Phải hỏi người** | merge · cherry-pick sang `develop`/`staging`/`prod` · push nhánh môi trường · đóng Issue của người khác · đổi assignee của member · `push --force` |

**Luôn để lại vết:** một dòng trong `## Tiến độ` của Issue, hoặc một tin Chat khi cần người quyết. Quyền lớn nhưng không im lặng.

---

## 9. Đã gỡ: skill `pm`, và CLI

Đây là **chỗ duy nhất** trong tài liệu này nói về phần đã gỡ.

| gỡ gì | khi nào | thay bằng |
|---|---|---|
| tên skill `pm` | commit `e9c4a75` | `ledger` |
| CLI `pm.mjs` + `selftest.ps1` khỏi đường làm việc | commit `150f43d` (mốc 5, §13) | `references/formats.md` — 11 thủ tục, `doctor` thành 12 điểm agent tự chạy |
| thư mục `archive/pm-cli/` (79 KB, ~1800 dòng) và `README.md` của nó | commit `041ec76` | không cần — không tài liệu nào trỏ tới nó |
| hook sinh bởi `pm setup` (`.claude/settings.json`, `.claude/agents/pm.md`) | cùng lúc | **không còn lớp cưỡng chế**; luật gọi tay |
| ba dòng `.gitignore` cho `.pm-tmp/` và `.ledger/.hook-state.json` | commit `041ec76` | không còn gì tạo ra chúng |

```bash
git show 150f43d:skills/pm/scripts/pm.mjs       > pm.mjs       # v0.3, đường dẫn cũ
git show e9c4a75:archive/pm-cli/pm.mjs          > pm.mjs       # v0.3, sửa đường dẫn sau khi chuyển chỗ
git show 150f43d:skills/pm/scripts/selftest.ps1 > selftest.ps1
```

Cái mất, nói thẳng: hook `Stop` cần một chương trình, nên Claude Code cũng mất lớp cưỡng chế như Codex và DSH; việc khối lượng lớn nay chậm hơn và tốn token hơn. Đánh đổi có ý thức, sau khi đã thấy bốn đặc tả cũ chết vì thiếu cưỡng chế.

---

## 10. `worlds.yml` — đa vùng, đa danh tính

`~/.ledger/worlds.yml` gom **thế giới** (thư mục gốc, tài khoản GitHub, SSH alias) và **repo nào thuộc thế giới nào** — cấp máy, **không commit**. Cần khi nhìn ngang nhiều repo ("hôm nay làm gì" trên hàng chục repo), hoặc khi một máy có nhiều danh tính GitHub. Template nằm ở [`skills/ledger/templates/worlds.yml`](../../skills/ledger/templates/worlds.yml); `conventions.md` §10 nói file nào commit, file nào không.

Chặn cứng đã biết: `gh` chỉ có tài khoản công việc. Repo thuộc vùng chưa `gh auth login` thì `ledger` phải **nói thẳng là thiếu quyền**, không trả bảng rỗng.

---

## 11. Những gì **không** xây

Chốt rồi — người sau đề xuất lại thì câu trả lời đã có sẵn ở đây:

- Không server, không daemon, không MCP, không binary toàn cục.
- Không **registry session** và không sổ cái trung tâm: chỉ cần biết task nào đã có người nhặt, tiến độ ra sao, và mỗi repo giữ Issue của nó.
- Không từ vựng trạng thái mới — tái dùng bộ nhãn triage đã có, chỉ thêm ba nhãn vòng đời.
- Không viết lại framework agent đang có trong repo công việc — **kế thừa**: rules, persona, workflow proxy, convention triage/issue-tracker/domain/cherry-pick, format plan.

---

## 12. Rủi ro & cách chống

| rủi ro | cách chống |
|---|---|
| **Trở thành "đặc tả chết" thứ năm** | Lý do §1.7 ra đời. Bỏ lớp cưỡng chế rồi (§9) thì rủi ro này **đang mở**, không phải đã đóng. |
| Framework nằm ngoài git của repo công việc | Framework sống trong `moon-ai-skills`; file sinh vào repo đích từ `templates/` |
| Nhân bản rồi trôi lệch (như `.agent/rules` ↔ `.claude/rules`); `plans/` phình mãi | File sinh một chiều, chỉ ghi trong marker; `formats.md` §5.10 là 12 điểm agent tự chạy, gồm cả plan mồ côi; §5.8 archive |
| Repo **công khai** chứa dữ liệu nội bộ | Chỉ chứa **quy ước + logic**; state, `worlds.yml`, webhook, tên member → `~/.ledger/` hoặc repo dự án |
| Vùng repo im lặng hỏng | `ledger` báo thẳng khi `gh` thiếu quyền (§10), không trả bảng rỗng |

---

## 13. Lịch sử thiết kế

Ghi lại **cái gì đã đổi suy nghĩ**, không phải cái gì đã được xác nhận.

| # | mốc | chốt lại |
|---|---|---|
| 1 | Nguyên tắc & mô hình dữ liệu | Work-item = file + Issue; hai trục trạng thái; số Issue làm ID; flow là dữ liệu |
| 2 | Chia việc cho script hay cho agent | Phán đoán (intake, tiêu chí nghiệm thu, routing) là của agent; script chỉ giữ việc máy làm tốt hơn |
| 3 | Dựng thật (bước 1–4) | Bốn ràng buộc môi trường (§13.1); một skill + `references/` thay vì 5 skill |
| 4 | Pilot trên repo công việc thật | 16 plan cũ không theo schema ⇒ nhu cầu `adopt`; `doctor` đọc được trạng thái thật |
| 5 | Bỏ CLI khỏi đường làm việc | Skill phải tự đủ ⇒ sinh `formats.md` |
| 6 | Xoá CLI | Không ai gọi thì nó là trầm tích |

### 13.1 Bốn ràng buộc môi trường, phát hiện khi dựng thật

1. **Flow của môi trường là cherry-pick 4 tầng, không phải GitHub Flow.** PR luôn target `main`; `develop`/`staging` nhận cherry-pick; `prod` chỉ nhận merge từ `main`. Đây là lý do trục 2 có bốn cờ chứ không một.
2. **DSH chặn `child_process` dùng stdio kiểu pipe** → gọi `git`/`gh` từ Node trả `EPERM`; phải thu output qua file tạm. Còn nguyên giá trị cho bất cứ script nào sau này.
3. **PowerShell ghi file kèm BOM** → `---` của frontmatter không khớp nên work-item bị đọc thành plan cũ. Ai parse frontmatter thì **bỏ BOM trước khi đọc**.
4. **`gh` chỉ có tài khoản công việc** — cùng chặn cứng đã ghi ở §10.

### 13.2 Lấy lại bản đầy đủ

Bản trước khi rút gọn: **606 dòng**, ở commit `4eb42d4` (commit cuối còn bản đầy đủ; trước `e9c4a75` đường dẫn là `docs/agent-pm/DESIGN.md`). Lấy cả file rồi cắt mục nào cần — chỉ số mảng 0-based của `Get-Content`, tương đương `sed -n 'A,Bp'` ở macOS/Linux:

```powershell
git show 4eb42d4:docs/agent-ledger/DESIGN.md > design-cu.md   # cả file, 606 dòng
(Get-Content design-cu.md)[313..336]   # §8  worlds.yml, bản gốc dài hơn §10
(Get-Content design-cu.md)[365..387]   # §11 Những gì KHÔNG xây      (dòng 366–388)
(Get-Content design-cu.md)[375..387]   # §12 Rủi ro & cách chống     (dòng 376–388)
```
