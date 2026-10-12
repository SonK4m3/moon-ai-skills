---
id: L-1
title: "Gộp bốn bảng điều hướng của SKILL.md thành một"
project: "Dọn dẹp bộ skill ledger"
repo: SonK4m3/moon-ai-skills
branch: feat/L-1-skill-md-route-table
status: in-progress
priority: P2
created: 2026-10-12
routing: ready-for-human
source: "trực tiếp — đề xuất từ lượt review SKILL.md, chưa được người xác nhận"
requester: "chính mình"
claimed_by: "dsh@DESKTOP-SEC48UO#d1a7"
claimed_at: "2026-10-12T15:40:00+07:00"
acceptance:
  - text: "SKILL.md có ĐÚNG MỘT bảng điều hướng, thay cho bốn chỗ chỉ đường cũ"
    verify: "grep -c '^|.*|.*`.*\\.md' skills/ledger/SKILL.md  → mong đợi 1 bảng; và mắt thường đếm số bảng trong file"
  - text: "File ngắn hơn: từ 102 dòng xuống dưới 80"
    verify: "wc -l skills/ledger/SKILL.md  → mong đợi < 80"
  - text: "Không mất thông tin: cả 6 file references/ + agents/ledger.md đều còn được trỏ tới"
    verify: "cho từng tên file trong references/ và agents/, grep thấy nó xuất hiện trong SKILL.md"
  - text: "Sáu luật, ranh giới ba tầng, và nguyên tắc chịu lực giữ nguyên nội dung"
    verify: "git diff skills/ledger/SKILL.md  → không dòng nào thuộc 3 mục đó bị sửa"
scope: "skills/ledger/SKILL.md"
out_of_scope: "không sửa references/ · không đổi description trong frontmatter (đó là bề mặt trigger) · không đổi luật nào"
sync_pending: true
env:
  main: { state: none }
  develop: { state: none }
  staging: { state: none }
  prod: { state: none }
---

# Gộp bốn bảng điều hướng của SKILL.md thành một

## Yêu cầu gốc

Từ lượt review `SKILL.md`: file 102 dòng nhưng có **bốn chỗ chỉ đường**, và chúng chồng nhau.

| | dòng cũ | trỏ tới |
|---|---|---|
| bảng "Phán đoán" | 19–27 | `intake.md` §0/§2/§4/§5 · `playbooks.md` §2/§5/§6 |
| danh sách "Tình huống" | 33 | `playbooks.md` |
| bảng "Cách làm" | 62–73 | `formats.md` §5.1–§5.11 |
| mục "Đọc thêm" | 96–102 | cả 6 file |

Cộng hai con trỏ nằm rải trong văn xuôi (dòng 51, 92). `writing-for-agents` gọi đây là **sprawl**: agent phải tự phân xử bảng nào thắng.

## Việc cần làm

1. Một bảng **"Đọc gì, khi nào"** khoá theo tình huống, thay cả bốn.
2. Giữ nguyên dạng **văn xuôi** cho hai khẳng định: phán đoán không ai làm hộ, và state là sự thật.
3. Dùng `sổ` như từ xuyên suốt — cái tên `ledger` chưa được dùng như một từ suy nghĩ.

## Nghiệm thu

Bốn tiêu chí trong frontmatter. Tiêu chí 3 là chống mất mát: gộp bảng mà bỏ rơi một file references thì hỏng hơn là để sprawl.

## Ghi chú

- `routing: ready-for-human` vì đây là thay đổi vào **bề mặt agent đọc** — người nên xem lại trước khi merge, không phải agent tự quyết.
- `sync_pending: true` vì chưa tạo được Issue: `gh` chỉ có tài khoản work, tài khoản `SonK4m3` chỉ có SSH. Xem `log.md`.
