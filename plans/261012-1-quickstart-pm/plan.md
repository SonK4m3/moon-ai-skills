---
id: GH-1
title: "Quickstart pm: tu tin nhan Chat toi work-item trong 5 phut"
status: cancelled
cancelled_at: 2026-10-13T00:19:21+07:00
cancelled_by: dsh@DESKTOP-SEC48UO#4b1f
priority: P2
created: 2026-10-12
routing: ready-for-agent
repo: SonK4m3/moon-ai-skills
source: "Google Chat - tin nhan truc tiep"
requester: "Thanh vien team"
acceptance: "Nguoi chua doc gi, doc muc Quickstart va lam duoc mot vong that (tao work-item, claim, handoff) trong 5 phut; quickstart co dung 5 buoc, moi buoc mot hanh dong; khong dung khai niem nao chua dinh nghia trong chinh no"
scope: "skills/pm/SKILL.md (them muc Quickstart o dau) va README.md (muc pm)"
out_of_scope: "khong viet lai references/, khong them skill moi, khong sua pm.mjs"
env:
  main: { state: none }
  develop: { state: none }
  staging: { state: none }
  prod: { state: none }
sync_pending: true
---

# Quickstart pm: tu tin nhan Chat toi work-item trong 5 phut

> **Tên gọi `pm` trong thư mục này là LỊCH SỬ, không phải thứ còn dùng được.** Skill `pm` đã đổi tên thành `ledger`; `skills/pm/**`, `pm.mjs` và `.pm/` **không còn tồn tại** trong repo. Mọi đường dẫn `skills/pm/…`, `docs/agent-pm/…` trong file này và trong `handoff-261012-2e80.md` chỉ để đối chiếu quá khứ. Work-item này đã bị **huỷ** — xem mục "Số phận" ở cuối file.

## Yêu cầu gốc

anh Son oi, em xem bo skill pm anh moi them thi thay tai lieu hoi roi, doc khong biet bat dau tu dau.
Voi lai trong repo con cai react-component-preview voi skills/astra-luna-orchestrator chua commit, de lau em so quen.
A anh cho em hoi luon: cai pm nay co dung duoc tren Codex khong hay chi Claude?

## Việc cần làm

- [ ] (chia ticket bằng /to-tickets)

## Nghiệm thu

- Nguoi chua doc gi, doc muc Quickstart va lam duoc mot vong that (tao work-item, claim, handoff) trong 5 phut; quickstart co dung 5 buoc, moi buoc mot hanh dong; khong dung khai niem nao chua dinh nghia trong chinh no

## Số phận (chốt bởi L-4 · 2026-10-13)

**Huỷ (`status: cancelled`).** Work-item này thuộc thời `pm` — Issue #1 vẫn mang marker `<!-- pm:work-item v1 -->` — và đã thành vật chết:

- phạm vi ghi `skills/pm/SKILL.md`, nhưng `skills/pm/` **không còn tồn tại** (đã đổi tên thành `skills/ledger/`); phần `README.md` mục pm là việc của L-3.
- `acceptance` là **một chuỗi**, không phải danh sách `text`/`verify` ⇒ theo `formats.md` §2 luật 8, không có cổng pass/fail thì **không được `ready-for-agent`**.
- nhánh `feat/1-quickstart-pm` **0 commit** so với `main` — chưa từng có dòng code nào.
- `handoff-261012-2e80.md` còn **4 mục `<!-- điền -->`** chưa điền (`Đã làm` · `Còn lại` · `Quyết định đã chốt` · `Cản trở`) và mục `Skill nên gọi tiếp` bỏ trống — bàn giao cũ chưa hoàn tất (giữ nguyên làm bằng chứng, không tự điền hộ phiên khác).

**Cái còn thật:** yêu cầu gốc — một mục Quickstart cho người mới, và câu hỏi "skill này chạy trên Codex hay chỉ Claude?" — **chưa được đáp cho `ledger`**: `skills/ledger/SKILL.md` không có mục Quickstart nào. Muốn làm thì phải intake lại thành work-item **mới**, trỏ vào `skills/ledger/**`, với tiêu chí đo được; work-item này không tự nhận lại.

Thư mục giữ nguyên tại chỗ (L-4 `out_of_scope`: không xoá thư mục). **Issue #1 vẫn OPEN** — tài khoản `gh` chỉ có quyền `pull` nên không đóng được, và đóng Issue của người yêu cầu là việc phải hỏi người (luật 4).
