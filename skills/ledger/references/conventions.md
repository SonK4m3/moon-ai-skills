# Quy ước — Ledger

Tài liệu này là **chuẩn tắc**. Agent đọc trước khi làm bất cứ việc gì. Lý do đằng sau các quy tắc: `docs/agent-ledger/DESIGN.md`.

---

## 1. Định danh

| thứ | dạng | ví dụ |
|---|---|---|
| Work-item | `GH-<số Issue>` | `GH-142` |
| Thư mục work-item | `plans/<YYMMDD>-<số>-<slug>/` | `plans/260101-142-note-detail-quota/` |
| Nhánh | `<type>/<số>-<slug>` | `feat/142-note-detail-quota` |
| Nhánh agent dùng riêng | `codex/*`, `opencode/*` | `codex/scratch-quota` |
| Handoff | `handoff-<YYMMDD>-<session>.md` | `handoff-260101-codex-a1b2.md` |

Số Issue **là** ID của work-item. Không có bảng map, không có ID thứ hai. Slug: kebab-case, không dấu, tối đa 5 từ.

---

## 2. Hai trục trạng thái

**Trục 1 — vòng đời** (một giá trị, trong `status` của `plan.md`):

```
pending → in-progress → in-review → completed
              ↘ cancelled
```

`blocked` không phải một `status` — nó là `blocked_by: [GH-140]` cộng với nhãn `blocked` trên Issue.

**Trục 2 — vị trí triển khai** (bốn cờ độc lập, trong `env` của `plan.md`):

| cờ | giá trị hợp lệ |
|---|---|
| `main` `develop` `staging` `prod` | `none` · `cherry-picked` · `merged` · `verified` · `failed` |

Mỗi cờ ghi kèm `pr` và `sha` khi đã có.

> Một việc có thể `completed` ở `main` nhưng chưa lên `staging`. Vì vậy **không bao giờ** báo cáo trạng thái chỉ bằng một chữ.

---

## 3. Routing — nhãn không phải của `ledger`

Năm nhãn định tuyến (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) do bộ kit trong repo sở hữu. Có `docs/agents/triage-labels.md` thì **đó là nguồn sự thật**; không có thì đọc `labels` trong `.ledger/config.json`.

`ledger` chỉ thêm ba nhãn **vòng đời**, vì không kit nào có khái niệm này:

| nhãn | nghĩa |
|---|---|
| `in-progress` | đã có phiên nhặt |
| `in-review` | PR đang mở, chờ người |
| `blocked` | đang chờ việc khác |

Định tuyến là "việc này đi đâu"; ba nhãn này là "việc này đang ở đâu". Không phát minh thêm.

## 4. Claim — bộ ba, theo thứ tự cố định

1. Nhãn `in-progress` + assignee trên Issue → **team nhìn thấy trên GitHub**
2. `claimed_by: <session-id>` + `claimed_at` trong `plan.md` → **AI đọc được offline**
3. Nhánh `<type>/<số>-<slug>` → **bằng chứng không thể giả**

Session-id có dạng `<harness>@<host>#<4 ký tự>`, ví dụ `codex@SON-PC#a1b2`.

Luật:
- Claim **trước** khi sửa code.
- Issue đã có assignee khác ⇒ **không giành**.
- `gh` lỗi ⇒ vẫn ghi file + tạo nhánh, ghi `sync_pending: true`; lần hòa giải sau (`formats.md` §5.9) sẽ đẩy lại.
- Nhả việc (`formats.md` §5.7) khi bỏ ngang: xóa `claimed_by`, gỡ assignee, đổi nhãn về `ready-for-agent`.

---

## 5. Handoff — bắt buộc khi nào

Bắt buộc khi **một trong ba** điều đúng:
1. Phiên kết thúc mà work-item chưa `completed`.
2. Bàn giao agent → agent.
3. Bàn giao agent → người review PR.

Ghi vào `<thư mục work-item>/handoff-<YYMMDD>-<session>.md`, commit cùng nhánh. **Không** ghi vào thư mục tạm của hệ điều hành — đó là lỗi của skill `handoff` gốc, và là lý do handoff hiện bị mất.

Template bắt buộc:

```markdown
# Handoff — GH-142 · <session> · <ngày>

## Đã làm
- …

## Còn lại
- [ ] …

## File và đường dẫn chính xác
- `src/features/note-detail/quota.ts` — đã sửa, chưa test

## Quyết định đã chốt
- Dùng X thay vì Y, vì …

## Cản trở
- …

## Skill nên gọi tiếp
`/implement` cho phase 3, rồi `/code-review`

## Lệnh chạy tiếp theo
```bash
npm run ci:check
```
```

---

## 6. Ranh giới file ↔ Issue

- Thứ AI cần để **làm việc** → file. Không bao giờ để nó nằm **chỉ** trong Issue: agent phải gọi mạng, `gh`, và đúng tài khoản mới đọc được.
- Thứ người cần để **nhìn** → Issue.
- File **không** phải nơi người ngoài vào comment.
- Issue **không** phải nơi chứa spec dài.

---

## 7. Đồng bộ

Mỗi lần chuyển trạng thái: **ghi file trước, ghi GitHub sau, trong cùng một lệnh**.

- `gh` thành công → xóa `sync_pending`.
- `gh` lỗi → `sync_pending: true`, không chặn công việc. lần hòa giải sau (`formats.md` §5.9) sẽ đẩy lại.
- Sửa nhãn bằng tay trên GitHub là hợp lệ. danh sách kiểm tra (`formats.md` §5.10) sẽ phát hiện lệch và nói rõ bên nào đúng: **file thắng**.

---

## 8. Quyền

**Tự chủ (không hỏi):** tạo/normalize Issue · gán nhãn · chia ticket từ spec · gán việc cho agent · tự chạy `/code-review` · **mở PR** · ghi tiến độ · thông báo.

**Phải hỏi:** merge · cherry-pick sang `develop`/`staging`/`prod` · push nhánh môi trường · đóng Issue của người khác · đổi assignee của member · `push --force`.

**Luôn thông báo:** mọi hành động để lại vết — một dòng trong `## Tiến độ` của Issue, hoặc một tin Google Chat khi cần bạn quyết. Quyền lớn nhưng không im lặng.

---

## 9. Flow là dữ liệu

Repo khai báo flow trong `.ledger/flow.yml`. Không hard-code flow vào skill.

| profile | dùng cho |
|---|---|
| `cherry-pick-4-env` | repo của bạn: PR → `main`, rồi cherry-pick sang `develop`/`staging` để test, `prod` merge từ `main` |
| `github-flow` | repo của bên khác: PR thẳng vào `main`, không nhánh môi trường |

Khi làm việc trong repo của bên khác: **đọc `.ledger/flow.yml` của họ trước**, và nếu họ chưa có thì hỏi — không áp flow của bạn lên repo người khác.

---

## 10. Nơi ở của các file

| file | ở đâu | commit? |
|---|---|---|
| Skill, template, script, DESIGN.md | `moon-ai-skills` (public) | có |
| `.ledger/flow.yml`, `.ledger/config.json` | repo đích | có |
| Work-item, handoff, evidence | `plans/<…>/` trong repo đích | có |
| Session state | `%TEMP%` — không ai đọc, không ai cần | không |

> `moon-ai-skills` là **repo công khai**. Không bao giờ đặt vào đó: quy trình nội bộ, tên member, state của task, hay bất kỳ secret nào.

---

## 11. Phán đoán và tay máy — ai làm gì

Người dùng nói chuyện với agent, không nói chuyện với lệnh. Phân chia cố định:

| bạn tự làm (phán đoán) | script làm nhanh hơn — tuỳ chọn |
|---|---|
| Đọc tin nhắn thô → quyết đó là việc gì | Ghi frontmatter, không làm hỏng file |
| Viết tiêu chí nghiệm thu | Tạo/sửa Issue, nhãn, assignee |
| Quyết `ready-for-agent` hay `ready-for-human` | Bộ ba claim và tạo nhánh |
| Chia work-item thành ticket | Quét nhiều repo, đối chiếu chéo |
| Xếp thứ tự khi ưu tiên xung đột | Phát hiện lệch (`doctor`) |
| Viết nửa còn lại của handoff | Sinh khung handoff từ dữ liệu git |
| Kết luận và đề xuất với người dùng | `Stop` hook — **bắt buộc phải là chương trình** |

Ba việc mà script làm tốt hơn bạn, và chỉ ba. Ngoài ba việc này, **bạn tự làm theo `formats.md`**:

1. **Hook không gọi được skill.** `Stop` chạy một lệnh và đọc exit code. Đây là cơ chế duy nhất cưỡng chế được luật — bốn đặc tả cũ (`journals/`, `agent-memory`, `cherry-pick-tracking`, `plans/archive`) chết vì không có nó.
2. **Ghi file có cấu trúc phải giống nhau mọi lần.** Để model tự sửa YAML qua nhiều phiên thì trôi lệch — bằng chứng: `.agent/rules` và `.claude/rules` là bản sao mà 2/5 file đã lệch nhau.
3. **Việc lặp qua nhiều repo.** Quét 33 repo, đối chiếu file ↔ Issue ↔ nhánh là vòng lặp so sánh, không phải phán đoán.

Làm tay thì **phải theo đúng `formats.md`** — không có format thứ hai.

Nếu bạn thấy mình đang gọi lệnh cho một việc thuộc cột trái, dừng lại: đó là chỗ bạn đang bỏ mất giá trị.

---

## 12. `ledger` độc lập với bộ skill ghép cùng

`ledger` **không phụ thuộc** bộ skill nào. Nó cần đúng hai thứ: biết **tracker ở đâu**, và biết **ai chia ticket**. Cả hai đến từ `.ledger/config.json`, cả hai đều có mặc định.

**Khuyên dùng: bộ skill của Matt** (`/to-spec`, `/to-tickets`, `/implement`, `/code-review`, `/pr`, `/triage`, `/handoff`). Repo đã chạy `/setup-matt-pocock-skills` thì `ledger` **đọc** `docs/agents/` và để nó thắng ở đúng một chỗ: **chuỗi nhãn** — vì nhãn thật trên tracker là thứ cả hai bên phải dùng chung.

| việc | ai sở hữu | `ledger` làm gì |
|---|---|---|
| Nói chuyện với tracker | `docs/agents/issue-tracker.md`, hoặc kit của repo | đọc, không định nghĩa lại |
| Nhãn định tuyến | `docs/agents/triage-labels.md`, hoặc `.ledger/config.json` | đọc, chỉ thêm ba nhãn vòng đời |
| Từ vựng domain + ADR | kit của repo (`GLOSSARY.md`, `docs/adr/`) | dùng từ đúng |
| Chia spec thành ticket | kit của repo (`/to-tickets`) | không chia ticket |
| Việc thô từ người ngoài | kit của repo (`/triage`) | không triage |
| Triển khai song song nhiều ticket | kit của repo (`/implement-spec`, worktree) | không dựng cơ chế song song |
| Bàn giao giữa **phiên** | kit của repo (`/handoff`) | ghi **bản ghi công việc** trong repo, không thay `/handoff` |
| Thân PR · chẩn đoán bug | kit của repo (`/pr`, `/diagnosing-bugs`) | không viết lại |

**Ba việc chỉ `ledger` làm, và đó là toàn bộ lý do nó tồn tại:**

1. **Trục môi trường** — `main/develop/staging/prod` kèm PR + sha. Không kit nào có khái niệm "việc này đã lên môi trường nào"; flow cherry-pick bốn môi trường cần nó, và thiếu nó thì chữ "xong" là câu trả lời sai.
2. **Chuẩn hoá yêu cầu từ Chat** — `/triage` xử lý issue **đã tồn tại**; không ai xử lý một tin nhắn Chat vừa dán vào.
3. **Nhìn ngang nhiều repo** — "hôm nay làm gì" trên hàng chục repo. Kit của Matt chạy trong **một** repo.

Ngoài ba mục trên, **việc đó không thuộc về `ledger`** — gọi kit của repo.