# Handoff — L-2 · dsh@DESKTOP-SEC48UO#7f29 · 2026-10-13

## Đã làm

- Claim `L-2`: `status: in-progress` + `claimed_by` + `claimed_at` trong `plan.md`, một dòng trong `log.md`, nhánh `feat/L-2-design-md-trang-thai-hien-tai` (có sẵn từ trước). Commit `81aab6a`.
- Viết lại `docs/agent-ledger/DESIGN.md`: **606 → 220 dòng**, 5355 → 2137 từ.
  - Trạng thái hiện hành lên đầu: bảng "cần gì → ở đâu" trỏ vào `skills/ledger/**` (đọc 1 phút là vào việc).
  - 120 dòng đầu **không còn một chữ nào** về thứ đã gỡ (`pm`, `CLI`, `worlds.yml`, `archive/`).
  - Lịch sử CLI gom vào **đúng một mục §9**, kèm ba lệnh `git show` lấy lại file đã xoá (đã chạy thật, lấy lại được).
  - §10 giữ lại phần *vì sao*: 6 mốc quyết định + 4 ràng buộc môi trường (cherry-pick 4 tầng, DSH chặn stdio pipe, PowerShell ghi BOM, `gh` thiếu tài khoản).
- Sửa **hai lỗi sự thật có sẵn trong tài liệu cũ**, đã đối chiếu git:
  1. Câu "cùng nội dung" cho `150f43d:skills/pm/scripts/pm.mjs` và `e9c4a75:archive/pm-cli/pm.mjs` là **sai** — hai blob khác nhau (85496 vs 85539 byte; 4 dòng đổi đường dẫn khi chuyển chỗ). Đã sửa chú thích.
  2. `.gitignore` mất **ba** dòng (`.pm-tmp`, `.ledger/.hook-state.json`, một dòng comment), không phải hai.

## Còn lại

- [ ] **Bốn tiêu chí nghiệm thu trong `plan.md` bị hỏng thành ký tự đơn** — xem §Cản trở. Cần người viết lại thành lệnh `verify` chạy được. Bốn phép đo tôi tự đặt và đã chạy nằm ở `log.md`; chúng **không** phải tiêu chí gốc.
- [ ] Mở PR cho nhánh này (luật 4: mở PR là tự chủ, nhưng phiên này dừng ở commit — người quyết).
- [ ] `sync_pending: true` vẫn còn: chưa có Issue thật cho `L-2`.

## File và đường dẫn chính xác

- `docs/agent-ledger/DESIGN.md` — **viết lại**, 220 dòng, đã commit `0f19b7d`.
- `plans/261012-L-2-design-md-trang-thai-hien-tai/plan.md` — `status: in-progress`, `claimed_by: dsh@DESKTOP-SEC48UO#7f29`, `claimed_at: 2026-10-13T00:16:39+07:00`. **Không** sửa khối `acceptance`.
- `plans/261012-L-2-design-md-trang-thai-hien-tai/log.md` — 2 dòng mới (claim + kết quả verify).
- Không đụng file nào khác. `skills/ledger/**` nguyên vẹn (ràng buộc cứng của `out_of_scope`).

## Quyết định đã chốt

- **Giữ toàn bộ lịch sử, chỉ nén lại** — theo `out_of_scope: "không xoá lịch sử"`. Không xoá mốc nào; §1–§18 cũ trở thành bảng 6 dòng ở §10, giữ nguyên phần *vì sao* đằng sau từng quyết định.
- **Tài liệu này là lịch sử thiết kế, không phải hướng dẫn hiện hành.** Nó trỏ vào `skills/ledger/**` chứ không chép lại quy ước — chép lại là nguồn sự thật thứ hai, đúng căn bệnh `formats.md` §19 đã ghi.
- **Không sửa `acceptance` trong `plan.md`.** `scope` chỉ có `docs/agent-ledger/DESIGN.md`; sửa tiêu chí nghiệm thu là đổi định nghĩa "xong" của work-item, phải do người quyết. Tôi ghi lại phép đo thay thế và nói rõ nó là của tôi.
- **Sửa hai lỗi sự thật trong tài liệu cũ** thay vì bê nguyên: tài liệu này là nguồn tham chiếu cho `conventions.md`, một câu sai ở đây sẽ được phiên sau tin.

## Cản trở

**Bốn tiêu chí nghiệm thu của `L-2` không đọc được — và không lấy lại được từ git.** Frontmatter hiện ra:

```yaml
acceptance:
  - text: "M"
    verify: "ở"
  - text: "g"
    verify: "r"
  - text: "C"
    verify: "ó"
  - text: "g"
    verify: "r"
  - text: "K"
    verify: "h"
  - text: "g"
    verify: "i"
```

Đây là chuỗi ký tự đơn, không phải tiêu chí. Dấu vết còn lại (`M…`, `Cli`, `grep -rn`) cho thấy ý định gốc là bốn tiêu chí có `verify` chạy được, trong đó có một phép đếm/grep. **Không có bản đúng trong git**: `git show 4eb42d4:…/plan.md` (commit intake) và commit trước đó `f86e395` đều đã hỏng y như vậy — lỗi xảy ra lúc soạn, trước khi commit. `L-3` và `L-4` hỏng cùng một kiểu, nên nhiều khả năng cả ba work-item đều vậy. **Người cần viết lại sáu dòng này cho mỗi work-item.**

Bốn phép đo tôi dùng thay thế (tất cả đã chạy, kết quả thô ở `log.md`):

1. 120 dòng đầu không còn `pm|CLI|worlds\.yml|archive/` → **0 dòng khớp**.
2. Độ dài ≤ 250 dòng → **220**.
3. Lịch sử CLI ở một chỗ + ba lệnh `git show` chạy được → **5 dòng khớp, cả ba lệnh lấy lại được file**.
4. Mọi link tương đối trong bảng đầu trỏ tới file có thật → **8/8 ok**.

Việc còn lại cần người: tạo Issue thật (`sync_pending: true`), quyết mở PR, và viết lại tiêu chí nghiệm thu.

## Skill nên gọi tiếp

`/pr` cho nhánh `feat/L-2-design-md-trang-thai-hien-tai` — sau khi người viết lại tiêu chí nghiệm thu. Nếu muốn chuẩn hoá luôn cả ba work-item: `/ledger` (mục `intake` để soạn lại tiêu chí, `sync` để tạo Issue thật).

## Lệnh chạy tiếp theo

```bash
# kiểm lại bốn phép đo của phiên này
Get-Content docs/agent-ledger/DESIGN.md -TotalCount 120 | Select-String -Pattern 'pm|CLI|worlds\.yml|archive/'
(Get-Content docs/agent-ledger/DESIGN.md).Count
Select-String docs/agent-ledger/DESIGN.md -Pattern 'archive/|pm\.mjs|selftest|git show'

# lịch sử CLI vẫn lấy lại được
git show 150f43d:skills/pm/scripts/pm.mjs > pm.mjs
```
