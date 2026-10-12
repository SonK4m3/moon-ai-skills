---
id: GH-2
title: "Quyet dinh so phan hai thu muc chua commit"
status: cancelled
cancelled_at: 2026-10-13T00:19:21+07:00
cancelled_by: dsh@DESKTOP-SEC48UO#4b1f
priority: P3
created: 2026-10-12
routing: ready-for-human
repo: SonK4m3/moon-ai-skills
source: "Google Chat - tin nhan truc tiep"
acceptance: "Hai thu muc hoac duoc commit, hoac duoc them vao .gitignore, hoac bi xoa - va git status sach"
scope: "git status cua repo moon-ai-skills"
out_of_scope: "khong sua noi dung hai thu muc do"
env:
  main: { state: none }
  develop: { state: none }
  staging: { state: none }
  prod: { state: none }
---

# Quyet dinh so phan hai thu muc chua commit

## Yêu cầu gốc

Hai thu muc react-component-preview/ va skills/astra-luna-orchestrator/ chua duoc commit tu truoc, de lau se quen mat. Can quyet: commit, ignore, hay xoa.

## Việc cần làm

- [ ] (chia ticket bằng /to-tickets)

## Nghiệm thu

- Hai thu muc hoac duoc commit, hoac duoc them vao .gitignore, hoac bi xoa - va git status sach

## Số phận (chốt bởi L-4 · 2026-10-13)

**Huỷ bản ghi (`status: cancelled`) — nhưng vấn đề thì KHÔNG huỷ.** Hai thứ khác nhau, đừng đọc nhầm:

- **Cái bị huỷ:** bản ghi này, vì nó là vật thời `pm` không còn dùng được — Issue #2 mang marker `<!-- pm:work-item v1 -->`, `acceptance` là **một chuỗi** chứ không phải danh sách `text`/`verify` (nên theo `formats.md` §2 luật 8 nó không bao giờ được `ready-for-agent`), và nó chưa từng được commit vào git.
- **Cái còn nguyên:** `react-component-preview/` và `skills/astra-luna-orchestrator/` **vẫn chưa commit** tại thời điểm chốt — `git status` của checkout chính `D:\Web\moon-ai-skills` vẫn thấy `?? react-component-preview/` và `?? skills/astra-luna-orchestrator/`. Quyết định commit / ignore / xoá vẫn **chưa ai làm**, và vẫn là việc của người.

⇒ Việc thật phải được **intake lại thành work-item mới** (đúng schema `ledger`: `acceptance` dạng danh sách có `verify` chạy được) hoặc người quyết trực tiếp. **Issue #2 vẫn OPEN** — L-4 không đóng được (tài khoản `gh` chỉ có quyền `pull`) và cũng không được tự quyết thay người.

Nội dung hai thư mục đó **không bị L-4 đụng tới** (`out_of_scope` của chính work-item này).
