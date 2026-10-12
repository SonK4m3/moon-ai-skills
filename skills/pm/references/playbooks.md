# Playbook — tình huống thường gặp

Bạn làm việc với người dùng qua chat. Họ sẽ không gõ lệnh. Họ sẽ **kể một tình huống**. Đây là các tình huống đó, và việc bạn làm.

---

## 1. "Em ơi, khách vừa nhắn thế này…" (dán một tin nhắn Chat)

1. Đọc và **phân loại**: câu hỏi, việc thật, hay ý tưởng chưa chín (xem `intake.md` §0).
2. Nếu là việc: chuẩn hoá theo `intake.md` — soạn tiêu chí nghiệm thu, phạm vi, không-làm, ưu tiên, routing.
3. **Trình bản nháp** cho người dùng bằng bảng, không phải bằng văn xuôi.
4. Người dùng xác nhận → tạo thật. Hỏi lại → sửa → trình lại.
5. Nói rõ bước tiếp: *"Việc này `ready-for-agent`, tôi nhặt luôn không?"* — hoặc *"cái này cần anh quyết, tôi để `ready-for-human`."*

Không bao giờ tạo thẳng rồi báo sau. Người dùng là người đối chiếu thực tế.

---

## 2. "Hôm nay làm gì?"

1. `pm next` — việc sẵn sàng nhặt.
2. `pm status` — cái gì đang chạy, đang ở môi trường nào.
3. Trả lời bằng **hai tầng**, đừng trộn:
   - **Đang chạy**: `ID · phiên giữ · nhánh · môi trường · tiêu đề`
   - **Sẵn sàng nhặt**: `ID · ưu tiên · tiêu đề`, xếp P1 trước
4. Nếu có việc `in-progress` mà **không ai giữ** (claim cũ, phiên đã chết) → nói ra và đề nghị `pm release` hoặc tiếp quản.
5. Kết bằng một câu đề xuất: *"Tôi nghĩ nên làm GH-142 trước, vì nó chặn GH-151."*

---

## 3. "Làm GH-142 đi"

1. `pm claim GH-142` — **trước khi sửa một dòng code**.
2. Nếu claim báo đã có người giữ → **không giành**. Báo người dùng và hỏi.
3. Chuyển sang chuỗi skill của Matt, đúng thứ tự:
   - chưa rõ → `/grill-with-docs` hoặc `/grilling`
   - cần spec → `/to-spec` → `/to-tickets`
   - làm → `/implement` (tự chạy `/tdd`, kết bằng `/code-review`)
4. Ghi tiến độ ở **mốc**, không phải mỗi lệnh: bắt đầu, xong một phase, gặp cản trở, mở PR.

---

## 4. "Xong rồi, mở PR đi"

1. `/code-review` trước khi mở PR — bạn tự chạy, không cần ai nhắc.
2. `/pr` để viết thân PR.
3. Mở PR vào `main` (hoặc nhánh nguồn trong `.pm/flow.yml`).
4. `pm note GH-142 "PR #87 đang mở"` — một dòng là đủ.
5. Nói rõ với người dùng: **việc này từ đây là của bạn** — review, merge, rồi cherry-pick.

Từ PR trở đi bạn **không tự quyết** nữa: merge, cherry-pick sang `develop`/`staging`/`prod`, push nhánh môi trường — đều phải hỏi.

---

## 5. "Anh có việc gấp, dừng đây đã"

1. `pm handoff GH-142` — sinh file vào thư mục work-item.
2. **Điền sáu mục `<!-- điền -->`**, không để nguyên khung. Mục quan trọng nhất là *File và đường dẫn chính xác* và *Skill nên gọi tiếp* — đó là thứ phiên sau cần.
3. `pm note GH-142 "dừng giữa phase 2, xem handoff"`.
4. Nếu người dùng không nói gì mà phiên sắp hết: hook `Stop` sẽ chặn và nhắc bạn. Đừng để nó phải nhắc.

---

## 6. "GH-142 tới đâu rồi?"

Trả lời bằng **hai trục tách hẳn**, không bao giờ nói "xong" một mình:

```
GH-142 · Note detail — quota
Vòng đời   : in-review (PR #87, chờ anh review)
Môi trường : main ✅ · develop ⬜ · staging ⬜ · prod ⬜
Phiên giữ  : codex@MAY#a1b2 · nhánh feat/142-note-detail-quota
Gần nhất   : 2026-01-01 09:12 · đã xong phần đọc quota
```

Nếu người dùng hỏi *"xong chưa"* → câu trả lời đúng là **"xong ở đâu"**, vì `main` xong không có nghĩa `staging` xong.

---

## 7. "Đẩy lên staging đi"

1. Đây là việc **phải hỏi** — cherry-pick sang nhánh môi trường không phải quyền tự chủ của bạn.
2. Đọc `.pm/flow.yml` trước: repo này có `profile: cherry-pick-4-env` không, `env_branches` gồm gì, `prod_policy` là gì. **Repo của bên khác thì theo flow của họ** — không áp flow của bạn lên.
3. Nếu người dùng đồng ý và bạn thực hiện: ghi lại bằng `pm env GH-142 staging cherry-picked --pr <số> --sha <sha>`.
4. Cảnh báo nếu thiếu `--sha` — cờ môi trường không có sha thì không đối chiếu được.

---

## 8. "Thành viên X đang làm gì?"

1. `pm status` để lấy bức tranh, rồi lọc theo assignee trên Issue: `gh issue list --assignee <login> --json number,title,labels`.
2. Trả lời gọn theo người, đừng đổ cả bảng ra.
3. Nếu thấy việc `ready-for-human` gán cho người đã nghỉ/đổi việc → nói ra.

---

## 9. "Repo mới, cài vào đi"

1. `pm setup --repo <đường-dẫn>`.
2. Nói rõ nó vừa thêm gì vào repo — **nhất là file nào được git theo dõi** (`AGENTS.md`, `.gitignore`) để người dùng biết mà commit hoặc hoàn tác.
3. Nếu repo thuộc bên khác: **hỏi trước**, và dùng `profile: github-flow` trong `.pm/flow.yml`, không áp flow cherry-pick của bạn.
4. Repo đã có `plans/` cũ → đề nghị `pm adopt --list` rồi `--dry-run` trước khi adopt thật.

---

## 10. "Sao tôi thấy số liệu không khớp?"

1. `pm doctor` — nó đối chiếu file ↔ Issue ↔ nhãn ↔ nhánh.
2. Đọc các dòng `[fail]` trước, `[warn]` sau.
3. Nói rõ **bên nào đúng**: theo quy ước, **file thắng**. Sửa GitHub theo file, hoặc sửa file nếu file sai — nhưng phải nói ra bạn chọn bên nào và vì sao.
4. Nếu lệch do người sửa tay trên GitHub: ghi lại một dòng vào `log.md` để lần sau không ai phải đoán.

---

## 11. Việc tổng hợp nặng — giao cho subagent

Khi người dùng hỏi những câu cần **đọc nhiều repo/plan** ("cho tôi bức tranh toàn bộ tuần này", "repo nào đang bỏ không"), đừng tự đọc hết trong context chính. Giao cho subagent với prompt:

```
Bạn là agent PM. Đọc trạng thái work-item và trả về báo cáo, KHÔNG sửa gì.

Phạm vi: <danh sách repo hoặc "chạy pm status --world work">
Cần trả về:
1. Bảng: ID · repo · vòng đời · môi trường · phiên giữ · tiêu đề
2. Việc in-progress quá <N> ngày không có handoff
3. Việc pending bị blocked_by mà blocker đã completed (có thể gỡ chặn)
4. Việc ready-for-human đang chờ người
Quy ước đọc: skills/pm/references/conventions.md
Chỉ báo cáo, không tạo/sửa Issue, không claim.
```

Nhận báo cáo rồi **bạn** mới là người kết luận và đề xuất với người dùng. Subagent thu thập, bạn ra quyết định.
