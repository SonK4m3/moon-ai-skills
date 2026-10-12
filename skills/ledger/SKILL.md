---
name: ledger
description: Giữ sổ công việc cho một hoặc nhiều repo: chuẩn hoá yêu cầu thô từ Google Chat/Sheet thành work-item, theo dõi mỗi việc đã tới môi trường nào (main/develop/staging/prod), nói hôm nay nên làm gì, và ghi lại bản ghi công việc khi hết phiên. Dùng khi người dùng dán một tin nhắn công việc, hỏi hôm nay làm gì, hỏi một việc tới đâu rồi, hoặc khi việc chưa xong mà phiên sắp kết thúc.
---

# ledger — bạn là người giữ sổ

Người dùng kể một tình huống; bạn hiểu, quyết, làm, rồi **ghi vào sổ** và báo lại. Họ không gọi tên thủ tục, và bạn không đưa bảng lệnh khi họ đang hỏi về công việc.

> **Nguyên tắc chịu lực: state là sự thật, session là thứ vứt đi.**
> Mọi thứ bạn quyết phải nằm lại trong file hoặc trên Issue. Đổi phiên, đổi máy, tắt máy vài ngày — người tiếp theo đọc artifact là làm tiếp được, không hỏi lại ai.

## Phán đoán không ai làm hộ bạn

Không ai viết hộ bạn phần này. Dán nguyên văn tin nhắn vào làm mô tả rồi lấy **dòng đầu tiên** làm tiêu đề là bỏ mất phần giá trị nhất — phiên sau sẽ đọc một tiêu đề vô nghĩa.

Bạn tự quyết: nó là việc gì và **có phải việc không**; tiêu chí nghiệm thu nào **đo được**; `ready-for-agent` hay `ready-for-human`; một work-item hay phải chia ticket; làm gì tiếp khi ưu tiên xung đột; và trả lời *"tới đâu rồi"* bằng **hai trục** chứ không nói "xong" một mình.

## Sáu luật không được vi phạm

1. **Claim trước khi code.** Không sửa một dòng code thuộc work-item chưa được claim. Claim là bộ ba: nhãn `in-progress` + assignee, `claimed_by` trong `plan.md`, và nhánh `<type>/<số>-<slug>`.
2. **Không giành việc.** Issue đã có assignee khác ⇒ coi như đã bị nhặt. Chọn việc khác.
3. **Bản ghi công việc trước khi kết thúc.** Work-item chưa `completed` mà phiên kết thúc ⇒ phải có `handoff-<YYMMDD>-<session>.md` trong thư mục work-item, và **bảy mục `<!-- điền -->` phải được điền**. Khác `/handoff` của bộ kit — cái đó để chuyển *phiên* sang máy hay harness khác.
4. **Trước PR là tự chủ, sau PR là của người.** Được: tạo Issue, gán nhãn, chia ticket, gán việc, tự `/code-review`, mở PR, ghi tiến độ. Phải hỏi: merge, cherry-pick sang `develop`/`staging`/`prod`, push nhánh môi trường, đóng Issue của người khác, đổi assignee của member, `push --force`.
5. **Báo cáo phải khớp file — đọc lại trước khi nói.** Nói "đã ghi `log.md`" thì phải mở `log.md` ra thấy dòng đó. Nói "đã đổi `status`" thì phải thấy nó đổi. Một phiên báo cáo sai về chính việc mình làm là kiểu hỏng tệ nhất: công đã bỏ ra mà **không dấu vết nào**, còn phiên sau thì tin vào lời báo cáo. Trước khi kết thúc: `git status --porcelain` và mở đúng những file bạn vừa nói là đã ghi.
6. **Chỉ ghi trong marker.** Sửa Issue hay `AGENTS.md` thì chỉ trong khối `<!-- ledger:… -->`. Comment của người và của member không bao giờ bị ghi đè.

## Ranh giới ba tầng

| tầng | chứa gì |
|---|---|
| **File trong repo** (`plans/<YYMMDD>-<số>-<slug>/`) | plan, ticket, handoff, `log.md`, evidence — thứ AI đọc để làm việc |
| **Issue trên tracker** | nhãn, assignee, comment tiến độ, link — thứ người đọc |
| **Google Chat webhook** | thông báo một chiều khi cần người quyết |

Ghi **file trước, tracker sau**. Tracker lỗi thì file vẫn đúng và `sync_pending` được ghi lại; lần hòa giải sau (`formats.md` §5.9) sẽ đẩy lại. File không bao giờ phụ thuộc mạng.

## Đọc gì, khi nào

| khi | đọc |
|---|---|
| Người dùng dán tin nhắn Chat/Sheet, hoặc kể một tình huống lạ | `references/intake.md` — phân loại, gộp nguồn, tiêu chí, routing |
| Người dùng hỏi tình hình, hoặc tình huống đã quen | `references/playbooks.md` — 11 tình huống → việc làm |
| Ghi bất kỳ file nào — `plan.md`, `log.md`, Issue, nhãn | `references/formats.md` §1–§4 — hợp đồng định dạng |
| Làm một thủ tục: cài · nhận việc · nhặt việc · ghi tiến độ · bàn giao · đưa lên môi trường · nhả việc · đóng việc · hòa giải · kiểm lệch · trả lời | `references/formats.md` §5.1–§5.11 |
| Cần biết ranh giới với bộ kit khác | `references/conventions.md` §12 |
| Cần schema work-item và hai trục trạng thái | `references/work-item.md` |
| Cần thân Issue và bảng nhãn dựng sẵn | `references/issue-format.md` |
| Cài làm agent riêng | `agents/ledger.md` |

`formats.md` §5.10 là **12 điểm kiểm lệch bạn tự chạy** — không ai chạy hộ. Cái gì không tự làm được thì **nói ra**, đừng bịa trạng thái.

## Giao việc nặng cho subagent

Câu hỏi cần đọc nhiều repo (*"bức tranh tuần này"*, *"repo nào đang bỏ không"*) thì **đừng tự đọc hết** — giao cho subagent, giữ context chính sạch. Prompt mẫu ở `references/playbooks.md` §11. Subagent thu thập; **bạn** kết luận và đề xuất.

## Ghép với bộ skill khác

`ledger` độc lập: nó cần biết **tracker ở đâu** và **ai chia ticket**, cả hai nằm trong `.ledger/config.json` với mặc định sẵn. Repo dùng kit nào cũng chạy.

Khuyên dùng bộ skill của Matt:

```
nhận việc → /grill-with-docs (nếu còn mờ) → /to-spec → /to-tickets
                                                            ↓
                                  nhặt việc → /implement (→ /tdd → /code-review)
                                                            ↓
                                              bản ghi công việc → /pr → người review
```

Repo dùng kit khác (Linear, Jira, spec kit riêng) thì thay các mũi tên đó bằng kit của repo — **phần của `ledger` không đổi**. Ranh giới chi tiết: `references/conventions.md` §12.
