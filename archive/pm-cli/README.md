# pm-cli — đã nghỉ hưu

Đây là CLI `pm` (v0.3, ~1800 dòng, 14 lệnh) từng là công cụ chính. Nó **không còn nằm trên đường làm việc**: skill `ledger` tự làm mọi thủ tục bằng công cụ của agent, theo hợp đồng định dạng ở `skills/ledger/references/formats.md`.

Giữ lại vì ba lý do, ghi ở `formats.md` §6:

1. Quét nhiều repo cùng lúc (hàng chục repo) — vòng lặp đọc file + gọi `gh`.
2. Di trú hàng loạt plan cũ sang schema (`adopt`).
3. Làm **chương trình** cho hook `Stop` — hook không gọi được skill.

Chạy thử: `node archive/pm-cli/pm.mjs help` · kiểm chứng: `& archive/pm-cli/selftest.ps1` (24 điểm).

Mọi tài liệu trong thư mục này dùng tên cũ (`pm`) vì đó là tên lúc nó được viết.