# Handoff — L-2 · dsh@DESKTOP-SEC48UO#7f29 · 2026-10-13

> **Bản sửa 01:05 cùng ngày** — sau khi người sửa khối `acceptance` (commit `bece5cf`, tiêu chí 3 yêu cầu "không mất thông tin"). Ba chủ đề từng mất đã được khôi phục và tiêu chí 1–2 đã được đáp. Mục nào lật ngược so với bản 00:31 thì ghi rõ dưới đây.

## Đã làm

**Vòng 1 (00:31)**
- Claim `L-2`: `status: in-progress` + `claimed_by` + `claimed_at` trong `plan.md`, một dòng trong `log.md`, nhánh `feat/L-2-design-md-trang-thai-hien-tai` (có sẵn từ trước). Commit `81aab6a`.
- Viết lại `docs/agent-ledger/DESIGN.md`: **606 → 220 dòng**, 5355 → 2137 từ.
  - Trạng thái hiện hành lên đầu: bảng "cần gì → ở đâu" trỏ vào `skills/ledger/**`.
  - Lịch sử CLI gom vào **đúng một mục §9**, kèm ba lệnh `git show` lấy lại file đã xoá (đã chạy thật).
- Sửa **hai lỗi sự thật có sẵn trong tài liệu cũ**, đã đối chiếu git:
  1. Câu "cùng nội dung" cho `150f43d:skills/pm/scripts/pm.mjs` và `e9c4a75:archive/pm-cli/pm.mjs` là **sai** — hai blob khác nhau (85496 vs 85539 byte; 4 dòng đổi đường dẫn khi chuyển chỗ). Đã sửa chú thích.
  2. `.gitignore` mất **ba** dòng (`.pm-tmp`, `.ledger/.hook-state.json`, một dòng comment), không phải hai.

**Vòng 2 (01:05) — ba chủ đề từng mất, giờ đã trở lại tài liệu**
- §11 **"Những gì không xây"** khôi phục (quyết định phạm vi; người sau không biết là đã cố ý từ chối thì sẽ đề xuất lại).
- §12 **"Rủi ro & cách chống"** khôi phục, cập nhật theo hiện trạng: rủi ro "đặc tả chết" nay **đang mở** vì đã bỏ lớp cưỡng chế.
- §10 **`worlds.yml`** khôi phục — file còn sống (`templates/worlds.yml` · `conventions.md` §10 · `formats.md` §5.11 · `playbooks.md` §11 đều trỏ tới), và phân loại là **còn hiệu lực**, không phải lịch sử.
- Thêm **§0 "Trạng thái hiện tại"** (tiêu chí 1) + **bảng còn-hiệu-lực/lịch-sử** (tiêu chí 2).
- Thêm **§13.2** với lệnh lấy lại từng mục của bản 606 dòng.
- **Lỗi tự phát hiện rồi sửa:** năm lệnh lấy lại đầu tiên dùng `awk` — **không chạy được trên Windows**, tức chúng là lời hứa suông. Đã thay bằng `git show` + `Get-Content` cắt theo dòng và **chạy thật**: cả file 606 dòng · §8 24 dòng · §11 23 dòng · §12 13 dòng.
- Tài liệu: **248 dòng** (ngân sách tự đặt 250), 2720 từ.

## Còn lại

- [ ] Mở PR cho nhánh này (luật 4: mở PR là tự chủ, nhưng phiên này dừng ở commit — người quyết).
- [ ] `sync_pending: true` vẫn còn: chưa có Issue thật cho `L-2`.
- [ ] `L-3` và `L-4` vẫn còn khối `acceptance` hỏng (xem §Cản trở).

## File và đường dẫn chính xác

- `docs/agent-ledger/DESIGN.md` — viết lại hai vòng, **248 dòng**: vòng 1 commit `0f19b7d`, vòng 2 commit `57fce11`.
- `plans/261012-L-2-design-md-trang-thai-hien-tai/plan.md` — `status: in-progress`, `claimed_by`, `claimed_at`. **Không** sửa khối `acceptance` (người đã sửa ở `bece5cf`).
- `plans/261012-L-2-design-md-trang-thai-hien-tai/log.md` — 5 dòng (claim + hai vòng verify).
- `plans/261012-L-2-design-md-trang-thai-hien-tai/handoff-261013-dsh-7f29.md` — file này.
- Không đụng file nào khác. `skills/ledger/**` nguyên vẹn (ràng buộc cứng của `out_of_scope`).

## Quyết định đã chốt

- **Giữ toàn bộ lịch sử, chỉ nén lại** — theo `out_of_scope: "không xoá lịch sử"`. §1–§18 cũ trở thành bảng 6 dòng ở §13; phần *vì sao* giữ nguyên, và bản đầy đủ vẫn lấy lại được bằng lệnh ở §13.2.
- **Khôi phục thay vì chỉ trỏ** cho ba chủ đề từng mất: chúng ngắn, và một dòng trỏ tới lịch sử thì người đọc phải chạy git mới biết mình vừa bị từ chối cái gì. §13.2 vẫn để đường lấy bản gốc.
- **Tài liệu là lịch sử thiết kế, không phải hướng dẫn hiện hành.** Nó trỏ vào `skills/ledger/**` chứ không chép lại quy ước — chép lại là nguồn sự thật thứ hai.
- **Không sửa `acceptance`.** `scope` chỉ có `docs/agent-ledger/DESIGN.md`; tiêu chí nghiệm thu là định nghĩa "xong", không phải việc của người thực thi.
- **Mọi lệnh ghi trong tài liệu phải chạy được trên máy này.** Sau lỗi `awk`, nguyên tắc là: ghi lệnh nào thì chạy lệnh đó trước.

## Cản trở

- **`L-3` và `L-4` vẫn có khối `acceptance` hỏng** (chuỗi ký tự đơn). `L-2` đã được người sửa ở `bece5cf`; hai work-item kia chưa. **Cần người viết lại** — chúng không lấy lại được từ git (`4eb42d4` và `f86e395` đều hỏng y vậy vì lỗi phát sinh lúc soạn).
- **Ba tiêu chí của `L-2` đều đã đạt**, kết quả thô ở `log.md`:
  1. `grep -n "^## 0\."` → `15:## 0. Trạng thái hiện tại`; 20 dòng đầu trả lời được "skill này giờ làm gì" (đoạn mở §0 nêu ba việc chỉ `ledger` làm).
  2. `grep -n "lịch sử"` → 4 chỗ, trong đó dòng 21–24 là **bảng phân loại** còn-hiệu-lực/lịch-sử.
  3. Đếm `^##` = **14**; mọi mục lịch sử nằm trong mục có nhãn rõ (§9, §13); mỗi mục bị gộp có lệnh lấy lại ở §13.2 và đã chạy thật.
- **Một chỗ tôi tự đặt, không phải tiêu chí:** ngân sách 250 dòng. Hiện 248. Nếu người thấy không cần, bỏ được.
- **Chưa mở PR** và **chưa có Issue thật** (`sync_pending: true`) — việc của người.

## Skill nên gọi tiếp

`/pr` cho nhánh `feat/L-2-design-md-trang-thai-hien-tai` (ba tiêu chí đã đạt). Muốn dọn nốt hai work-item còn lại: `/ledger` mục `intake` để soạn lại tiêu chí cho `L-3`/`L-4`, rồi `sync` để tạo Issue thật.

## Lệnh chạy tiếp theo

```powershell
# ba tiêu chí của L-2
Select-String docs/agent-ledger/DESIGN.md -Pattern '^## 0\.'
Select-String docs/agent-ledger/DESIGN.md -Pattern 'lịch sử'
(Select-String docs/agent-ledger/DESIGN.md -Pattern '^## ').Count

# lấy lại nội dung cũ (đã chạy thật)
git show 4eb42d4:docs/agent-ledger/DESIGN.md > design-cu.md
(Get-Content design-cu.md)[365..387]   # §11
(Get-Content design-cu.md)[375..387]   # §12
(Get-Content design-cu.md)[313..336]   # §8 worlds.yml

# lịch sử CLI vẫn lấy lại được
git show 150f43d:skills/pm/scripts/pm.mjs > pm.mjs
```
