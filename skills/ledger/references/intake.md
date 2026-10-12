# Chuẩn hoá yêu cầu thô thành work-item

Đây là **việc phán đoán của agent**. Không ai làm hộ bạn phần này. Nếu bạn dán nguyên văn tin nhắn vào làm mô tả rồi lấy dòng đầu làm tiêu đề, bạn đã bỏ mất phần giá trị nhất.

Mục tiêu: một agent **khác** đọc work-item này vào ngày mai, không hỏi lại câu nào, và làm được.

---

## 0. Trước khi tạo gì cả — phân loại

| loại | dấu hiệu | làm gì |
|---|---|---|
| **Câu hỏi** | "cái này chạy thế nào", "có ai biết…" | **Trả lời luôn. Không tạo work-item.** Work-item là việc, không phải hội thoại. |
| **Việc thật** | có kết quả mong đợi quan sát được | đi tiếp bước 1 |
| **Ý tưởng chưa chín** | "hay là mình nên…", chưa rõ muốn gì | chưa tạo. Đề nghị người dùng `/grill-with-docs` trước. |
| **Việc của người khác** | không thuộc repo nào bạn quản | nói rõ, đừng nhận. |

Nếu không xác định được nó thuộc repo nào — **hỏi**, đừng đoán. Work-item nằm sai repo thì mọi thứ sau đó đều sai.

---

## Nguồn vào — đọc hết trước khi viết một chữ nào

Một yêu cầu thật hiếm khi đến dưới dạng một đoạn văn. Nó đến thành **nhiều nguồn khác loại**, và bạn phải đọc hết trước khi tạo bất cứ thứ gì.

| loại nguồn | thường có gì | cẩn thận |
|---|---|---|
| Thread Chat | mô tả vấn đề → cải thiện, người liên quan, link tới mọi thứ khác | đây thường là **nguồn cha** |
| Bảng log (bug / feature) | mỗi dòng một mục, nhiều ô trộn lẫn | xem ba mục dưới |
| Tài liệu nghiệp vụ | định nghĩa đúng của khái niệm | dùng từ của nó, đừng tự đặt |
| Bàn giao BE→FE (.docx, .md) | hợp đồng API, kiểu dữ liệu, lỗi trả về | đây là **ràng buộc cứng**, không phải gợi ý |
| Figma / ảnh / video | giao diện, luồng | **bạn không đọc được** — xem dưới |
| Issue/ticket cũ | có thể đã có người làm | quét trước khi tạo mới |

**Nguồn bạn không đọc được thì phải nói ra.** Link Figma, ảnh chụp, video, file nhị phân — bạn không mở được. Đừng suy ra nội dung từ tiêu đề link rồi viết như thể đã xem. Nói thẳng: *"Em chưa xem được Figma, anh mô tả giúp phần giao diện hoặc em sẽ để trống mục đó."* File `.docx` thì đọc được.

### Một dòng bảng KHÔNG phải một work-item

Bảng là **triệu chứng**; work-item là **vấn đề**. Bốn dòng bug cùng một luồng người dùng không phải bốn việc — chúng là một việc hỏng ở bốn nhánh.

Dấu hiệu phải gộp:
- cùng màn hình, cùng luồng người dùng
- ô ghi chú nhắc tới dòng khác (*"conflict với bug 184"*) — dấu hiệu mạnh nhất
- các dòng chỉ khác nhau ở bước thứ 2 hoặc 3 của cùng một kịch bản

Dấu hiệu phải tách: khác màn hình, khác loại người dùng, hoặc sửa cái này không ảnh hưởng cái kia.

### Một việc có thể nằm ở nhiều nguồn — gộp, đừng nhân đôi

Thread Chat và bảng log thường nói về **cùng một việc**: thread có đủ ngữ cảnh, bảng có một dòng rút gọn. Lấy **thread làm thân**, bảng làm xác nhận. Trước khi tạo, quét `plans/` và issue đang mở xem đã có chưa.

### Bóc ô, đừng copy ô

Một ô bảng thường trộn: bước tái hiện, kết quả thực tế, yêu cầu thật, link, và ghi chú tiến độ. Tách ra:

| thấy trong ô | đưa vào đâu |
|---|---|
| các bước đánh số | thân work-item, mục *Yêu cầu gốc* |
| *"Actual: …"* | đó là **triệu chứng**, không phải tiêu chí |
| *"Expected"* / cột kỳ vọng | mầm của **tiêu chí nghiệm thu** — viết lại cho đo được |
| link | giữ nguyên, ghi vào `source` |
| ghi chú kiểu *"đã xong 90%"* | một dòng vào `log.md`, không phải trạng thái |

### Trạng thái người viết → hai trục

Bảng của bạn dùng chữ tự do. Đừng đoán — ánh xạ, và **không chắc thì hỏi**:

| người viết | đọc thành |
|---|---|
| `In Progress` + có tên người | lifecycle `in-progress`, `claimed_by` = người đó |
| `Pending (BE)`, `Đợi bàn giao UIUX` | `pending` **+ lý do chặn**; nhãn `blocked` — đây là *chờ*, không phải một trạng thái mới |
| `cancel` | `cancelled` |
| ô trống | `pending`. Đừng suy diễn thêm |
| `Done Stg`, `Done Dev`… | **hỏi.** Gần như chắc chắn là đã lên một môi trường và verify — ghi vào trục thứ hai (`env.staging: verified`), còn lifecycle phụ thuộc đã merge vào nhánh nguồn chưa. Đây đúng là lý do có hai trục: một chữ không đủ |
### Tính năng trải nhiều nền tảng

Thread ghi `[App/Web]`, có hai Figma riêng, hai nhóm người riêng — đó là **hai việc**, không phải một. Mỗi repo tự quản việc của nó; không có repo trung tâm nào để bịa ra.

Luật: tạo work-item **ở từng repo**, mỗi cái ghi đủ **`project` · `repo` · `branch`**, và cả hai dùng **cùng một `project`**. Ba trường đó là cách hai phiên ở hai repo tìm thấy nhau.

## 1. Trích sáu thứ

Đọc tin nhắn thô, rút ra đúng sáu thứ này. Cái nào không có trong tin nhắn thì **đi tìm** (đọc code, đọc Issue cũ, hỏi người dùng) chứ đừng bịa và cũng đừng bỏ trống.

| thứ | câu hỏi để rút ra | nếu tin nhắn không nói |
|---|---|---|
| **Kết quả mong đợi** | Làm xong thì *thấy được* cái gì khác đi? | bắt buộc phải có — hỏi |
| **Phạm vi** | Đụng vào màn hình / module / API nào? | tự tìm trong code, ghi cái bạn tìm được |
| **Không làm** | Việc gì *trông giống* nhưng nằm ngoài? | tự suy ra từ phạm vi, ghi rõ |
| **Nguồn** | Link Chat/Sheet, hoặc "trực tiếp" | ghi "trực tiếp" |
| **Người yêu cầu** | Ai sẽ nghiệm thu? | để trống, hỏi nếu cần |
| **Thời điểm** | Có mốc nào không? | không suy diễn deadline |

---

## 2. Viết tiêu chí nghiệm thu

Đây là phần quyết định work-item sống hay chết. Ba luật:

1. **Quan sát được từ ngoài.** "Nút Lưu bật khi tiêu đề không rỗng" — được. "Code sạch hơn" — không.
2. **Kiểm tra được bằng một lệnh, một cú click, hoặc một con số.** Nếu không ai kiểm tra được thì nó không phải tiêu chí.
3. **Không mô tả giải pháp.** "Dùng Zustand selector thay vì object mới" là cách làm, không phải kết quả. Kết quả là "gõ vào ô tiêu đề không làm re-render cả trang".

| viết thế này | vì sao sai |
|---|---|
| "Cải thiện hiệu năng trang note" | không đo được, không biết lúc nào xong |
| "Sửa lỗi lưu note" | lỗi nào, sửa xong thì thấy gì |
| "Thêm tính năng quản lý session" | quá lớn, phải chia ticket trước |
| "Trang note mở dưới 1.5s với 500 note, đo bằng Lighthouse ở chế độ Fast 3G" | ✅ |

Nếu người dùng đưa tiêu chí mơ hồ, **đề xuất bản cụ thể của bạn và hỏi xác nhận** — đừng hỏi mở "anh muốn tiêu chí gì".

---

## 3. Ưu tiên

| mức | nghĩa | kiểm tra nhanh |
|---|---|---|
| **P1** | chặn người khác, hoặc lỗi đang ảnh hưởng người dùng thật | "nếu để sang tuần sau có ai bị chặn không?" — có |
| **P2** | trong sprint này, không chặn ai | mặc định |
| **P3** | khi rảnh, hoặc việc đẹp-hoá | không ai nhớ nếu không làm |

Đừng mặc định P2 một cách máy móc. Nếu tin nhắn có "gấp", "khách đang chờ", "chặn deploy" — đó là P1, và nên nói ra để người dùng xác nhận.

---

## 4. Routing — quyết định quan trọng nhất

| nhãn | khi nào |
|---|---|
| `ready-for-agent` | đủ rõ để một agent làm mà **không phải hỏi lại**, tiêu chí kiểm tra được, không cần quyết định sản phẩm, không đụng vùng cấm |
| `ready-for-human` | cần quyết định thẩm mỹ/UX, cần quyền truy cập agent không có, hoặc hậu quả khó lùi |
| `needs-info` | thiếu thông tin chỉ người báo mới có |
| `needs-triage` | bạn chưa phân loại được — đừng để lâu ở đây |

**Ba câu tự vấn trước khi dán `ready-for-agent`:**

1. Một agent làm sai hướng, có mất nhiều hơn 1 ngày không? Nếu có → `ready-for-human` cho phần quyết định, tách phần thi hành thành ticket `ready-for-agent`.
2. Có phải **chọn giữa hai thứ đều hợp lý** không? Nếu có → đó là quyết định sản phẩm, cần người.
3. Có đụng `prod`, dữ liệu thật, hay tiền không? Nếu có → luôn cần người ở bước cuối.

---

## 5. Việc lớn thì chia ticket — nhưng không tự chia

`ledger` tạo **một** work-item. Chia nó thành ticket là việc của bộ kit đang dùng trong repo — mặc định `/to-tickets`, và bộ đó lo cả blocking edges.

Dấu hiệu phải chia: hơn một ngày công, nhiều tầng (API + UI + migration), hoặc hai người làm song song được.

Quy tắc: **work-item là cái để báo cáo; ticket là cái để máy làm.** Đừng nhồi 12 phase vào một work-item rồi báo "đang làm".
## 6. Hỏi gì, tự quyết gì

Tự quyết: cách diễn đạt tiêu đề, slug, mô tả, phạm vi suy ra từ code, thứ tự ticket.

Phải hỏi — **tối đa ba câu, một lượt**:
- Kết quả mong đợi là gì (nếu tin nhắn không có)
- Việc này thuộc repo nào (nếu không rõ)
- Routing: giao cho agent hay bạn tự làm (nếu ở ranh giới)

Nguyên tắc: **chỉ hỏi khi câu trả lời đổi việc bạn làm tiếp.** Câu hỏi mà dù trả lời thế nào bạn cũng làm giống nhau thì đừng hỏi.

---

## 7. Tạo thật

Sau khi soạn xong: ghi work-item theo `formats.md` §5.2 — tạo Issue với **nội dung bạn đã viết**, rồi tạo thư mục `plans/<YYMMDD>-<số>-<slug>/` với frontmatter đầy đủ sáu trường. Cách nói chuyện với tracker nằm ở `formats.md` §4.2, không phải ở đây.

Rồi **trình người dùng đúng những gì sẽ được ghi** trước khi tạo thật. Người dùng là người đối chiếu với thực tế — đó là lý do bước này tồn tại.
## 8. Bốn ví dụ

**Ví dụ 1 — tin nhắn thô**
> "em ơi cái note detail load chậm quá, nhiều note là đứng luôn"

→ Work-item: *Trang note detail đứng khi có nhiều note*
- Phạm vi: `src/features/note-detail`
- Không làm: không đổi cấu trúc dữ liệu, không phân trang ở API
- Nghiệm thu: mở trang với 500 note, cuộn hết danh sách không khựng quá 100ms; đo bằng Performance profile
- Ưu tiên: P2 · Routing: `ready-for-human` — "chậm" chưa nói rõ ngưỡng nào là đủ, và cách sửa là quyết định kiến trúc

**Ví dụ 2**
> "bên QA bảo nút Lưu bị mờ khi để trống tiêu đề, khó hiểu"

→ *Nút Lưu disable khi tiêu đề rỗng gây khó hiểu — thêm lý do*
- Nghiệm thu: khi tiêu đề rỗng, có chữ giải thích cạnh nút; khi gõ ký tự đầu, nút bật ngay
- Ưu tiên: P3 · Routing: `ready-for-agent` — rõ, nhỏ, kiểm tra được

**Ví dụ 3**
> "làm cái xuất báo cáo ra excel đi"

→ Chưa đủ để tạo. Thiếu: xuất cái gì, cho ai, bao nhiêu dòng, định dạng nào. **Hỏi một lượt ba câu**, rồi mới tạo. Routing dự kiến `ready-for-human` vì cần quyết định sản phẩm.

**Ví dụ 4**
> "từ giờ mọi PR phải có mô tả theo template"

→ Đây là **quy ước**, không phải work-item. Việc thật nằm sau nó: "thêm kiểm tra mô tả PR vào CI". Tạo work-item cho *việc*, và ghi quy ước vào `conventions.md`.

---

## 9. Sai thường gặp

- Lấy dòng đầu của tin nhắn làm tiêu đề rồi coi như xong.
- Tạo work-item cho một câu hỏi.
- Để trống "không làm" — rồi agent làm lan sang thứ bạn không muốn.
- Dán `ready-for-agent` cho việc cần quyết định sản phẩm, để rồi agent tự chọn một hướng và bạn phải sửa lại.
- Nhồi nhiều ngày việc vào một work-item rồi báo cáo "đang làm 60%".
