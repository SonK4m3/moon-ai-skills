# Bằng chứng nghiệm thu — L-4

Phiên `dsh@DESKTOP-SEC48UO#4b1f` · nhánh `feat/L-4-hai-work-item-cu` · 2026-10-13
Worktree `D:\Web\moon-L-4` (checkout chính `D:\Web\moon-ai-skills`, nhánh `main`)

---

## 1. Khối `acceptance` bị hỏng, và bản sửa trên `main`

### 1.1 Bản gốc trong blob của `4eb42d4` — 6 mục, mỗi mục một ký tự

```
$ git show 4eb42d4:plans/261012-L-4-hai-work-item-cu/plan.md
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
```

Không mục nào là lệnh chạy được, và phần thân file lại nói "bốn tiêu chí". Hỏng nằm trong blob đã commit, không phải lỗi checkout: `git status` trên nhánh này sạch trước khi phiên sửa gì. **Cả ba plan L-2/L-3/L-4 đều bị** (cùng commit `4eb42d4`).

### 1.2 Dấu vết của bộ sinh: ký tự bị nuốt, để lại U+000B

Dòng "Việc cần làm" mất chữ `v` của `verify` và để lại một **vertical tab** (U+000B) ở chỗ cũ. Đổ mã điểm từng ký tự:

```
Xem b[U+1ED1]n ti[U+00EA]u ch[U+00ED] trong frontmatter. Ch[U+1EA1]y [U+0111][U+00FA]ng l[U+1EC7]nh [U+000B]erify c[U+1EE7]a t[U+1EEB]ng ti[U+00EA]u ch[U+00ED] **tr[U+01B0][U+1EDB]c khi** n[U+00F3]i xong.
```

Chuỗi gốc là ``lệnh `verify` ``. Phiên này đã sửa lại dòng đó (`ba tiêu chí` cho khớp danh sách 3 mục, trả lại `` `verify` ``) và quét lại toàn bộ 7 file trong hai thư mục + thư mục L-4: **không còn ký tự điều khiển nào** ngoài CR/LF/TAB.

### 1.3 `main` đã sửa khối này — nhưng bản sửa không parse được bằng YAML

`main` có commit `1e80d3e "fix(plans): repair acceptance criteria flattened by the generator"` (sửa cả ba plan). Ba tiêu chí thật nằm ở đó. Nhưng bản trên `main` **lồng nháy kép bên trong nháy kép**, nên YAML thật không đọc được:

```
$ python -c "import yaml; yaml.safe_load(open('plan.md').read().split('---')[1])"
PARSE FAIL: ParserError
yaml.parser.ParserError: while parsing a block mapping
  in "<unicode string>", line 14, column 5:
      - text: "Cả hai plan.md có status ...
        ^
expected <block end>, but found '<scalar>'
  in "<unicode string>", line 15, column 20:
        verify: "grep "^status:" plans/261012-1-quickst ...
                       ^
```

Nhánh này lấy **nguyên văn tiêu chí** từ `1e80d3e` (không đổi một chữ nào), chỉ đổi nháy kép bao ngoài thành nháy đơn. Sau khi đổi, cả ba frontmatter parse được (mục 4). Đây là việc còn lại cho `main`: hai plan L-2/L-3 vẫn đang ở dạng nháy kép lồng nhau.

### 1.4 `check-fm.mjs` (checker frontmatter ở checkout chính) bị treo vô hạn

Định dùng nó làm cổng phụ, nhưng nó **lặp vô hạn** trên mọi plan:

```
== plans/261012-L-4-hai-work-item-cu/plan.md
  FAIL plans/261012-L-4-hai-work-item-cu/plan.md:2 key trung lap: id
  FAIL plans/261012-L-4-hai-work-item-cu/plan.md:2 key trung lap: id
  ... (lặp mãi, ~200 KB output, phải kill tiến trình)
```

Nguyên nhân: nhánh xử lý scalar trong `check-fm.mjs` không tăng chỉ số dòng (`i++`), nên `while (i < fm.length)` đứng yên ở dòng `id:` đầu tiên. File này **không được track** (nằm ở gốc checkout chính) và **không thuộc scope L-4** — báo lại, không sửa.

---

## 2. Số phận hai work-item — bằng chứng của quyết định

Hai work-item "cũ" là hai thư mục trong `scope`, tạo 2026-10-12 buổi sáng theo thời `pm` (số Issue thật: GH-1, GH-2), **chưa từng được commit** ở checkout chính.

### 2.1 GH-1 `plans/261012-1-quickstart-pm/` → **huỷ**

| kiểm | kết quả thô |
|---|---|
| thư mục đích còn không? | `Test-Path skills\pm` → `False`; `skills/ledger/` tồn tại (11 file) |
| nhánh có gì không? | `git log --oneline main..feat/1-quickstart-pm` → rỗng; `git diff --name-only main...feat/1-quickstart-pm` → rỗng (0 commit) |
| tiêu chí có cổng không? | `acceptance:` là **một chuỗi**, không phải danh sách `text`/`verify` ⇒ `formats.md` §2 luật 8: không được `ready-for-agent` |
| bàn giao cũ xong chưa? | `handoff-261012-2e80.md`: 4 mục `<!-- điền -->` chưa điền (`Đã làm` · `Còn lại` · `Quyết định đã chốt` · `Cản trở`), mục `Skill nên gọi tiếp` bỏ trống |
| tracker | Issue #1 `OPEN`, **không nhãn, không assignee**, body còn marker `<!-- pm:work-item v1 -->` |
| yêu cầu gốc đã đáp chưa? | **Chưa**: `grep -rn quickstart skills/ledger` → không có mục Quickstart nào trong skill `ledger` |

⇒ Bản ghi chết (phạm vi đã bị xoá, không cổng, 0 commit) nên đặt `status: cancelled`; **yêu cầu gốc vẫn sống** (Quickstart cho `ledger` + câu hỏi Codex/Claude) và phải intake lại thành work-item mới.

### 2.2 GH-2 `plans/261012-2-quyet-dinh-hai-thu-muc/` → **huỷ bản ghi, giữ vấn đề**

| kiểm | kết quả thô |
|---|---|
| hai thư mục đã quyết chưa? | **Chưa** — `git status` checkout chính vẫn `?? react-component-preview/` và `?? skills/astra-luna-orchestrator/` |
| bản ghi có dùng được không? | `acceptance:` là **một chuỗi**; Issue #2 mang marker thời `pm`; thư mục chưa từng được commit |
| tracker | Issue #2 `OPEN`, không nhãn, không assignee |
| routing gốc | `ready-for-human` — quyết định commit/ignore/xoá là của người, không phải của agent |

⇒ Bản ghi bị huỷ như một artifact thời `pm`, **không phải** vì vấn đề đã xong. Việc thật (quyết định cho hai thư mục) vẫn nguyên và phải intake lại hoặc người quyết trực tiếp. Tiêu chí 1 của L-4 đòi **cả hai** `plan.md` ở trạng thái kết thúc, nên dòng log đầu tiên của phiên này (nói "giữ") đã được **đính chính bằng một dòng mới** — log là append-only, không sửa dòng cũ.

### 2.3 Quyền trên tracker

```
$ gh api repos/SonK4m3/moon-ai-skills --jq .permissions
{"admin":false,"maintain":false,"pull":true,"push":false}
```

Tài khoản `gh` (Sotatek-SonNguyen16) **chỉ có `pull`**: không gán nhãn, không assignee, không đóng Issue, không comment. Vì vậy `sync_pending: true` giữ nguyên và mọi thứ nằm ở file.

---

## 3. Ba lệnh verify — chạy thật, dán nguyên văn

`grep` của Git for Windows (`C:\Program Files\Git\usr\bin\grep.exe`, GNU grep 3.0), chạy tại gốc worktree.

### Tiêu chí 1 — cả hai `plan.md` ở trạng thái kết thúc

```
$ grep "^status:" plans/261012-1-quickstart-pm/plan.md plans/261012-2-quyet-dinh-hai-thu-muc/plan.md
plans/261012-1-quickstart-pm/plan.md:status: cancelled
plans/261012-2-quyet-dinh-hai-thu-muc/plan.md:status: cancelled
grep exit=0
```

**PASS** — cả hai thuộc `{completed, cancelled}`.

### Tiêu chí 2 — mỗi `log.md` có dòng mới nói rõ vì sao kết thúc

```
$ grep -n "L-4" plans/261012-1-quickstart-pm/log.md plans/261012-2-quyet-dinh-hai-thu-muc/log.md
plans/261012-1-quickstart-pm/log.md:10:- 2026-10-13 00:19 · L-4 chốt số phận: **huỷ** work-item — phạm vi `skills/pm/SKILL.md` đã bị xoá sau khi pm → ledger, nhánh `feat/1-quickstart-pm` 0 commit, `acceptance` là chuỗi nên không có cổng chạy được; yêu cầu gốc (Quickstart cho người mới) chưa được đáp cho `ledger` ⇒ muốn làm thì intake lại thành work-item mới. Thư mục giữ nguyên tại chỗ.
plans/261012-2-quyet-dinh-hai-thu-muc/log.md:3:- 2026-10-13 00:19 · L-4 chốt số phận: **giữ** — `react-component-preview/` và `skills/astra-luna-orchestrator/` vẫn chưa commit (git status checkout chính), quyết định commit/ignore/xoá là của người ⇒ giữ `pending` + `routing: ready-for-human`. Nội dung hai thư mục đó L-4 không đụng tới.
plans/261012-2-quyet-dinh-hai-thu-muc/log.md:4:- 2026-10-13 00:19 · **đính chính dòng ngay trên** (log append-only, không sửa dòng cũ): sau khi `main` sửa khối `acceptance` bị hỏng ở commit `1e80d3e`, tiêu chí 1 của L-4 đòi **cả hai** `plan.md` phải ở trạng thái kết thúc ⇒ work-item này chuyển từ `pending` sang **`cancelled`**: bản ghi là vật thời `pm` (`acceptance` dạng chuỗi nên không có cổng chạy được, chưa từng được commit) nên không dùng lại được. **Vấn đề thì không huỷ:** hai thư mục vẫn chưa commit ⇒ phải intake lại thành work-item mới hoặc người quyết trực tiếp; Issue #2 vẫn OPEN.
grep exit=0
```

**PASS** — mỗi log có ≥ 1 dòng mới nói rõ lý do (GH-2 có thêm dòng đính chính vì quyết định đổi sau khi tiêu chí 1 được đọc đúng).

### Tiêu chí 3 — mọi lần nhắc `pm` đều nằm trong ngữ cảnh lịch sử

```
$ grep -rn "pm" plans/261012-1-quickstart-pm plans/261012-2-quyet-dinh-hai-thu-muc
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:3:> **L-4 ghi thêm 2026-10-13 — mọi đường dẫn `pm` trong file này là LỊCH SỬ:** skill `pm` nay là `ledger`, `skills/pm/**` và `pm.mjs` không còn tồn tại; work-item GH-1 đã bị huỷ (xem `plan.md` §"Số phận"). Nội dung gốc của phiên `2e80` giữ nguyên, không sửa.
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:5:- **Tiêu đề**: Quickstart pm: tu tin nhan Chat toi work-item trong 5 phut
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:7:- **Nhánh**: feat/1-quickstart-pm
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:24:- `M docs/agent-pm/DESIGN.md`
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:25:- `M skills/pm/SKILL.md`
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:26:- `M skills/pm/agents/project-manager.md`
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:27:- `M skills/pm/references/conventions.md`
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:28:- `M skills/pm/scripts/pm.mjs`
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:29:- `?? .pm/`
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:34:- `?? skills/pm/references/intake.md`
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:35:- `?? skills/pm/references/playbooks.md`
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:41:- - 2026-10-12 10:40 · claim bởi dsh@DESKTOP-SEC48UO#2e80 · nhánh feat/1-quickstart-pm
plans/261012-1-quickstart-pm/handoff-261012-2e80.md:59:npm run ci:check
plans/261012-1-quickstart-pm/log.md:3:- 2026-10-12 10:40 · claim bởi dsh@DESKTOP-SEC48UO#2e80 · nhánh feat/1-quickstart-pm
plans/261012-1-quickstart-pm/log.md:7:- 2026-10-12 10:42 · claim bởi dsh@DESKTOP-SEC48UO#7728 · nhánh feat/1-quickstart-pm
plans/261012-1-quickstart-pm/log.md:8:- 2026-10-12 10:42 · claim bởi dsh@DESKTOP-SEC48UO#5c3c · nhánh feat/1-quickstart-pm
plans/261012-1-quickstart-pm/log.md:10:- 2026-10-13 00:19 · L-4 chốt số phận: **huỷ** work-item — phạm vi `skills/pm/SKILL.md` đã bị xoá sau khi pm → ledger, nhánh `feat/1-quickstart-pm` 0 commit, `acceptance` là chuỗi nên không có cổng chạy được; yêu cầu gốc (Quickstart cho người mới) chưa được đáp cho `ledger` ⇒ muốn làm thì intake lại thành work-item mới. Thư mục giữ nguyên tại chỗ.
plans/261012-1-quickstart-pm/plan.md:3:title: "Quickstart pm: tu tin nhan Chat toi work-item trong 5 phut"
plans/261012-1-quickstart-pm/plan.md:14:scope: "skills/pm/SKILL.md (them muc Quickstart o dau) va README.md (muc pm)"
plans/261012-1-quickstart-pm/plan.md:15:out_of_scope: "khong viet lai references/, khong them skill moi, khong sua pm.mjs"
plans/261012-1-quickstart-pm/plan.md:24:# Quickstart pm: tu tin nhan Chat toi work-item trong 5 phut
plans/261012-1-quickstart-pm/plan.md:26:> **Tên gọi `pm` trong thư mục này là LỊCH SỬ, không phải thứ còn dùng được.** Skill `pm` đã đổi tên thành `ledger`; `skills/pm/**`, `pm.mjs` và `.pm/` **không còn tồn tại** trong repo. Mọi đường dẫn `skills/pm/…`, `docs/agent-pm/…` trong file này và trong `handoff-261012-2e80.md` chỉ để đối chiếu quá khứ. Work-item này đã bị **huỷ** — xem mục "Số phận" ở cuối file.
plans/261012-1-quickstart-pm/plan.md:30:anh Son oi, em xem bo skill pm anh moi them thi thay tai lieu hoi roi, doc khong biet bat dau tu dau.
plans/261012-1-quickstart-pm/plan.md:32:A anh cho em hoi luon: cai pm nay co dung duoc tren Codex khong hay chi Claude?
plans/261012-1-quickstart-pm/plan.md:44:**Huỷ (`status: cancelled`).** Work-item này thuộc thời `pm` — Issue #1 vẫn mang marker `<!-- pm:work-item v1 -->` — và đã thành vật chết:
plans/261012-1-quickstart-pm/plan.md:46:- phạm vi ghi `skills/pm/SKILL.md`, nhưng `skills/pm/` **không còn tồn tại** (đã đổi tên thành `skills/ledger/`); phần `README.md` mục pm là việc của L-3.
plans/261012-1-quickstart-pm/plan.md:48:- nhánh `feat/1-quickstart-pm` **0 commit** so với `main` — chưa từng có dòng code nào.
plans/261012-2-quyet-dinh-hai-thu-muc/log.md:4:- 2026-10-13 00:19 · **đính chính dòng ngay trên** (log append-only, không sửa dòng cũ): sau khi `main` sửa khối `acceptance` bị hỏng ở commit `1e80d3e`, tiêu chí 1 của L-4 đòi **cả hai** `plan.md` phải ở trạng thái kết thúc ⇒ work-item này chuyển từ `pending` sang **`cancelled`**: bản ghi là vật thời `pm` (`acceptance` dạng chuỗi nên không có cổng chạy được, chưa từng được commit) nên không dùng lại được. **Vấn đề thì không huỷ:** hai thư mục vẫn chưa commit ⇒ phải intake lại thành work-item mới hoặc người quyết trực tiếp; Issue #2 vẫn OPEN.
plans/261012-2-quyet-dinh-hai-thu-muc/plan.md:40:- **Cái bị huỷ:** bản ghi này, vì nó là vật thời `pm` không còn dùng được — Issue #2 mang marker `<!-- pm:work-item v1 -->`, `acceptance` là **một chuỗi** chứ không phải danh sách `text`/`verify` (nên theo `formats.md` §2 luật 8 nó không bao giờ được `ready-for-agent`), và nó chưa từng được commit vào git.
grep exit=0
```

Từng nhóm hit, và vì sao nó là lịch sử:

| nhóm | hit | ngữ cảnh |
|---|---|---|
| bảng lịch sử do L-4 thêm | handoff:3 · plan.md:26 (GH-1) · plan.md:44,46,48 (GH-1) · plan.md:40 (GH-2) · log.md:10 (GH-1) · log.md:4 (GH-2) | nói thẳng `pm` → `ledger`, `skills/pm/**` không còn, work-item đã huỷ |
| tên gọi / đường dẫn của bản ghi cũ | handoff:5,7,24-29,34,35,41 · plan.md:3,14,15,24 (GH-1) · log.md:3,7,8 (GH-1) | tên thư mục, tên nhánh, danh sách file của phiên 2026-10-12 — giữ nguyên làm bản ghi, banner ngay trong cùng file nói rõ là lịch sử |
| nguyên văn yêu cầu của người | plan.md:30,32 (GH-1) | trích nguyên văn tin nhắn Chat gốc — không được sửa lời người khác |
| **hit giả** | handoff:59 `npm run ci:check` | chữ `npm`, **không phải** skill `pm`. (Lệnh này cũng đã cũ: `package.json` chỉ có `cv:validate` và `cv:render`) |

**PASS** — không hit nào trình bày `pm` như thứ còn dùng được.

---

## 4. Kiểm tra cộng thêm

Frontmatter của cả ba file parse được bằng YAML thật (pyyaml 6.0.3), không BOM, không ký tự điều khiển lạ:

```
PARSE-OK   261012-L-4-hai-work-item-cu        status=in-progress acceptance=list keys=18
PARSE-OK   261012-1-quickstart-pm             status=cancelled  acceptance=str keys=16
PARSE-OK   261012-2-quyet-dinh-hai-thu-muc    status=cancelled  acceptance=str keys=14
```

```
plans/261012-L-4-hai-work-item-cu/plan.md   CRLF=62 loneLF=0 BOM=False
plans/261012-L-4-hai-work-item-cu/log.md    CRLF=6  loneLF=0 BOM=False
plans/261012-1-quickstart-pm/plan.md        CRLF=0  loneLF=53 BOM=False
plans/261012-1-quickstart-pm/log.md         CRLF=0  loneLF=10 BOM=False
plans/261012-1-quickstart-pm/handoff-*.md   CRLF=0  loneLF=60 BOM=False
plans/261012-2-quyet-dinh-hai-thu-muc/plan.md  CRLF=0 loneLF=45 BOM=False
plans/261012-2-quyet-dinh-hai-thu-muc/log.md   CRLF=0 loneLF=4  BOM=False
```

(Không dùng `check-fm.mjs` làm cổng: nó treo vô hạn — mục 1.4.)

---

## 5. File đã đổi, và hai điều phải biết trước khi merge

Đổi trong nhánh này:

- `plans/261012-1-quickstart-pm/` — `plan.md` (cancelled + §Số phận + banner lịch sử), `log.md` (+1 dòng), `handoff-261012-2e80.md` (chỉ thêm 1 dòng chú thích lịch sử, nội dung gốc giữ nguyên). **Thư mục được đưa vào git lần đầu** (trước đó untracked ở checkout chính).
- `plans/261012-2-quyet-dinh-hai-thu-muc/` — `plan.md` (cancelled + §Số phận), `log.md` (+2 dòng, dòng thứ hai đính chính dòng thứ nhất). **Cũng được đưa vào git lần đầu.**
- `plans/261012-L-4-hai-work-item-cu/` — `plan.md` (claim + tiêu chí thật + kết quả), `log.md`, `evidence.md` (file này).

Ba điều cần người biết:

1. **Checkout chính vẫn giữ bản untracked của hai thư mục đó.** Nhánh này thêm chúng vào git với nội dung đã sửa; `git checkout`/merge sau này sẽ **báo lỗi "untracked working tree files would be overwritten"** cho tới khi người xoá hoặc dọn hai bản cũ trong `D:\Web\moon-ai-skills\plans\`. Phiên này **không** sửa gì trong checkout chính (đã đối chiếu `git status` + mtime + sha của 5 file ở đó).
2. **Issue #1 và #2 vẫn OPEN, không nhãn, không assignee.** Tài khoản `gh` chỉ có quyền `pull`; đóng Issue #1 (đề xuất: huỷ) và Issue #2 (đề xuất: giữ, hoặc thay bằng work-item mới) là việc của người.
3. **Việc thật còn lại, đừng để mất:** (a) Quickstart cho skill `ledger` + câu trả lời Codex/Claude — chưa ai làm; (b) quyết định commit/ignore/xoá cho `react-component-preview/` và `skills/astra-luna-orchestrator/` — chưa ai làm.

---

## 6. Commit

- `d3eda989f2a2d8eaec0b25db08e7324d2ed70eca` (ngắn `d3eda98`) — `docs(plans): settle the fate of the two old pm-era work items` · 8 file, +425/−15 · nhánh `feat/L-4-hai-work-item-cu`, hơn `main` đúng 1 commit.
- **Chưa push, chưa merge** — luật 4: merge là việc phải hỏi người.
- Nhánh này dựa trên `4eb42d4`, **không** chứa `main` (đang ở `1e80d3e` trở lên); ba tiêu chí được chép tay từ `1e80d3e`, không merge `main`.

