# Quy ước — Agent PM

Tài liệu này là **chuẩn tắc**. Agent đọc trước khi làm bất cứ việc gì. Lý do đằng sau các quy tắc: `docs/agent-pm/DESIGN.md`.

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

## 3. Routing — tái dùng nhãn triage

| nhãn | nghĩa | ai làm |
|---|---|---|
| `needs-triage` | chưa phân loại | bạn |
| `needs-info` | chờ người báo thêm | người báo |
| `ready-for-agent` | đủ rõ, **hàng đợi cho AI** | agent |
| `ready-for-human` | cần người | bạn / member |
| `wontfix` | không làm | — |
| `in-progress` | đã có session nhặt | agent |
| `in-review` | PR đang mở, chờ review | bạn |
| `blocked` | đang chờ việc khác | — |

Ba nhãn cuối là phần thêm của `pm`. Bảy nhãn đầu đã tồn tại trong repo — không tạo bản sao.

---

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

Repo khai báo flow trong `.pm/flow.yml`. Không hard-code flow vào skill.

| profile | dùng cho |
|---|---|
| `cherry-pick-4-env` | repo của bạn: PR → `main`, rồi cherry-pick sang `develop`/`staging` để test, `prod` merge từ `main` |
| `github-flow` | repo của bên khác: PR thẳng vào `main`, không nhánh môi trường |

Khi làm việc trong repo của bên khác: **đọc `.pm/flow.yml` của họ trước**, và nếu họ chưa có thì hỏi — không áp flow của bạn lên repo người khác.

---

## 10. Nơi ở của các file

| file | ở đâu | commit? |
|---|---|---|
| Skill, template, script, DESIGN.md | `moon-ai-skills` (public) | có |
| `.pm/flow.yml`, `.pm/config.json` | repo đích | có |
| Work-item, handoff, evidence | `plans/<…>/` trong repo đích | có |
| `worlds.yml`, webhook URL | `~/.pm/` (cấp máy) | **không** |
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
