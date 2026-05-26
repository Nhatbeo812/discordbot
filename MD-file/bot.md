# HỆ THỐNG BOT DISCORD — LIÊN HIỆP QUIT

# MỤC TIÊU HỆ THỐNG

Tạo một hệ thống hồ sơ thành viên tự động dành cho Discord Server Liên Hiệp Quit.

Hệ thống có nhiệm vụ:

- Xác thực thành viên mới
- Tạo hồ sơ cá nhân
- Tự động phân loại ngành nghề
- Tự động cấp role
- Hỗ trợ admin duyệt hồ sơ
- Lưu lịch sử join server
- Tạo profile markdown có thể lưu trữ lâu dài

---

# LUỒNG HOẠT ĐỘNG TỔNG THỂ

User join server
→ Bot gửi tin nhắn chào mừng
→ Hiện nút "Bắt đầu xác thực"

Khi user nhấn:
→ Mở Form Hồ Sơ (1/3)

Sau khi hoàn tất:
→ Form Hồ Sơ (2/3)

Sau đó:
→ Form Hồ Sơ (3/3)

Sau khi submit:
→ Bot phân tích nội dung
→ Detect ngành nghề
→ Detect giới tính
→ Tự động cấp role
→ Hỏi có muốn nhận ping update server không
→ Tạo profile markdown
→ Gửi qua admin duyệt
→ Admin Accept hoặc Deny
→ Nếu Accept:
    - cấp role member
    - unlock channel
    - lưu database
→ Nếu Deny:
    - yêu cầu chỉnh sửa

---

# FORM HỒ SƠ (1/3) — BẢN THÂN

## Các trường nhập

### Giới thiệu bản thân *
> Bạn tên gì?
> Giới tính?
> Tính cách hoặc giới thiệu sơ lược về bản thân.

Ví dụ placeholder:

Tên: Khoa
Giới tính: Nam
Sinh viên ngành Quản trị mạng.
Thích công nghệ và hệ thống mạng.

---

### Bạn đang học tập / làm việc liên quan tới ngành nghề nào? *

> Ghi rõ lĩnh vực bạn đang theo học hoặc làm việc.

Ví dụ:

- 2D
- 3D
- Quản trị mạng
- Lập trình
- Editor
- Motion Graphic
- Linux Server
- Cisco Networking

⚠ Lưu ý:
Bot sẽ dùng phần này để tự động cấp role.

---

### Trạng thái hiện tại *

Ví dụ:

- Sinh viên
- Đi làm
- Freelancer
- Đang học nghề
- Đang tìm định hướng

---

### Khu vực sinh sống *

Ví dụ:

- TP.HCM
- Hà Nội
- Đồng Nai
- Cần Thơ

---

# FORM HỒ SƠ (2/3) — KỸ NĂNG & ĐỊNH HƯỚNG

## Kỹ năng & Tools

> Bạn biết hoặc từng sử dụng gì?

Ví dụ:

- Photoshop
- Blender
- Cisco Packet Tracer
- HTML/CSS
- Premiere
- Linux

---

## Đam mê / Hứng thú / Hope

> Bạn thích gì hoặc muốn học thêm gì?

Ví dụ:

- Hứng thú với hệ thống mạng
- Muốn học thêm ngoại ngữ
- Muốn tìm người làm project cùng
- Muốn học 3D Environment

---

## Sơ lược định hướng

> Bạn muốn phát triển theo hướng nào trong tương lai?

Ví dụ:

- CCNA → CCNP
- Game Design
- Fullstack
- Security
- VFX

---

# FORM HỒ SƠ (3/3) — PROFILE / LIÊN LẠC

## Facebook

Ví dụ:

https://facebook.com/username

---

## Portfolio

Ví dụ:

https://github.com/username
https://behance.net/username

---

## Liên lạc

Ví dụ:

Discord: fortunate169
Gmail: abc@gmail.com

---

# UI / TRẢI NGHIỆM FORM

Mỗi phần form sẽ có:

- Tiêu đề rõ ràng
- Mô tả nhỏ phía dưới
- Placeholder ví dụ
- Cảnh báo nhập sai
- Thanh tiến trình

Ví dụ:

📘 TIẾN ĐỘ THIẾT LẬP HỒ SƠ (1/3)

⚠ Lưu ý:
Thông tin cần chính xác để được duyệt.
Không spam hoặc troll form.

[ HỦY ]
[ TIẾP TỤC ]

---

# CƠ CHẾ HỦY / TIẾP TỤC

Nếu user nhấn Hủy:
→ reset form hiện tại

Ví dụ:
Đang ở form (2/3)
→ Hủy
→ làm lại form (2/3)

Không reset toàn bộ trừ khi user chọn reset profile.

---

# AUTO DETECT ROLE

Bot chỉ đọc phần:

"Bạn đang học tập / làm việc liên quan tới ngành nghề nào?"

Sau đó detect keyword.

Ví dụ:

Input:
"Em đang học 2D Environment và Photoshop"

Bot detect:
- 2D

→ Add role:
@2D Artist

---

# DANH SÁCH ROLE MẪU

| Keyword | Role |
|----------|------|
| 2d | @2D Artist |
| 3d | @3D Artist |
| network | @Network |
| quản trị mạng | @Network |
| dev | @Developer |
| editor | @Editor |
| video | @Video Editor |
| linux | @Linux |
| security | @Security |

---

# DETECT GIỚI TÍNH

Bot chỉ detect phần giới thiệu bản thân.

Ví dụ detect:

- giới tính nam
- em là nam
- con trai
- boy
- man

→ Male

Hoặc:

- giới tính nữ
- em là nữ
- con gái
- girl
- phụ nữ

→ Female

---

# HỆ THỐNG ĐIỂM TIN CẬY

Nếu có:
"Giới tính: Nam"
→ +50%

Nếu có:
"Em là nam"
→ +40%

Nếu có:
"boy/man"
→ +20%

Nhiều keyword sẽ cộng dồn độ tin cậy.

---

# POPUP PING UPDATE SERVER

Sau khi submit form:

Bot hiện popup:

🔔 Bạn có muốn được ping khi server có update,
event hoặc thông báo mới không?

[ Có ]
[ Không ]

Nếu chọn:
Có
→ Add role @UpdatePing

Không
→ bỏ qua

---

# PROFILE MARKDOWN TỰ ĐỘNG

Bot tạo profile như sau:

# HỒ SƠ THÀNH VIÊN

## Thông tin cơ bản
- Tên: Khoa
- Giới tính: Nam
- Khu vực: TP.HCM

## Ngành nghề
- Quản trị mạng
- Network

## Kỹ năng
- Cisco
- VLAN
- OSPF

## Định hướng
- Linux Server
- CCNP

## Liên lạc
- Discord: fortunate169
- GitHub: github.com/xxx

---

# LỊCH SỬ JOIN SERVER

Bot lưu:

- Ngày join
- Ngày leave
- Số lần join lại

Nếu join từ lần thứ 2:
→ hiện thông tin lịch sử

Ví dụ:

📅 Đã tham gia server 3 lần
🕓 Join gần nhất: 05/05/2026

---

# HỆ THỐNG ADMIN

Kênh:
#duyet-ho-so

Admin xem profile.

Có nút:

[ ACCEPT ]
[ DENY ]
[ EDIT ]

---

# ACCEPT

Nếu duyệt:

- cấp role member
- mở channel
- lưu database
- tạo hồ sơ chính thức

---

# DENY

Nếu từ chối:

- gửi lý do
- yêu cầu sửa form
- cho submit lại

---

# KHO LƯU TRỮ PROFILE

Kênh:
#tai-lieu-tuyet-mat

Mọi member đều có thể:

- xem hồ sơ
- tải xuống
- đọc file md/txt

---

# FILE EXPORT

Bot hỗ trợ export:

- TXT
- MD
- JSON

---

# DATABASE ĐỀ XUẤT

MongoDB hoặc MySQL.

Bảng cần có:

- users
- profiles
- join_history
- roles_detected
- profile_status

---

# CÔNG NGHỆ ĐỀ XUẤT

| Thành phần | Công nghệ |
|------------|-----------|
| Discord Bot | discord.js |
| Database | MongoDB |
| API | Express.js |
| Detect keyword | Regex |
| Markdown Export | markdown generator |

---

# TÍNH NĂNG NÂNG CẤP TƯƠNG LAI

- AI phân tích hồ sơ
- Match co-working
- Tìm người cùng ngành
- Hệ thống reputation
- Badge kỹ năng
- Portfolio viewer
- Website profile sync
- Dashboard admin
- OAuth2 Discord login

---

# NOTE BỔ SUNG — KIỂM DUYỆT FORM & HỆ THỐNG CẢNH BÁO

## Hệ thống phát hiện form rác / thông tin không hợp lệ

Bot sẽ tự động phân tích nội dung hồ sơ sau khi user submit.

Nếu phát hiện:

- Spam ký tự
- Nội dung troll
- Điền quá sơ sài
- Không liên quan tới câu hỏi
- Copy/paste vô nghĩa
- Chứa từ ngữ toxic
- Link đáng ngờ
- Nội dung AI spam hoặc random text

→ Bot sẽ KHÔNG duyệt trực tiếp.

Thay vào đó:

→ Hồ sơ sẽ được gửi vào channel:

#hội-đồng-quýt

để moderator hoặc admin xem xét thủ công.

---

# HỒ SƠ CẦN KIỂM DUYỆT THỦ CÔNG

Bot sẽ tạo một embed riêng:

## Ví dụ

⚠ HỒ SƠ CẦN KIỂM TRA

User:
@username

Lý do:
- Nội dung quá ngắn
- Không đúng format
- Có dấu hiệu spam
- Thiếu thông tin quan trọng

Trạng thái:
🔴 Chưa duyệt

---

# BUTTON KIỂM DUYỆT

| Button | Chức năng |
|--------|------------|
| ACCEPT | Duyệt hồ sơ |
| DENY | Từ chối |
| CẢNH BÁO | Gửi yêu cầu sửa hồ sơ |

---

# HỆ THỐNG CẢNH BÁO USER

Khi admin nhấn:

[ CẢNH BÁO ]

→ Bot mở một popup/modal nhập nội dung.

Ví dụ admin nhập:

"Hãy ghi rõ ngành nghề của bạn hơn.
Phần giới thiệu hiện quá sơ sài."

Sau khi submit:

→ Bot gửi thông báo EPHEMERAL
(chỉ riêng user đó thấy)

Ví dụ:

⚠ Hồ sơ của bạn cần chỉnh sửa

Yêu cầu từ quản trị viên:

"Hãy ghi rõ ngành nghề của bạn hơn.
Phần giới thiệu hiện quá sơ sài."

Vui lòng chỉnh sửa và submit lại hồ sơ.

---

# SO KHỚP KEYWORD THÔNG MINH

Bot sẽ sử dụng hệ thống fuzzy matching
để so sánh keyword gần đúng.

Ví dụ:

Input user:
"2d enviroment"

Keyword database:
"2D"

→ Match thành công.

---

# QUY TẮC MATCH

- Không phân biệt in hoa / in thường
- Cho phép sai chính tả nhẹ
- So khớp gần đúng >90%
- Bỏ khoảng trắng dư
- Bỏ ký tự đặc biệt

---

# VÍ DỤ MATCH

| User Input | Detect |
|------------|--------|
| 2d enviroment | 2D |
| 3D artist | 3D |
| network engineer | Network |
| quản trị mạng | Network |
| linux server | Linux |
| cisco networking | Network |

---

# CƠ CHẾ PHÂN TÍCH

Bot sẽ:

1. Convert lowercase
2. Remove special characters
3. Split keyword
4. Compare similarity score
5. Nếu >90% → nhận diện thành công

---

# ƯU ĐIỂM

- User không cần nhập đúng tuyệt đối
- Hỗ trợ typo nhẹ
- Tự nhiên hơn khi điền form
- Tăng độ chính xác detect role
- Hạn chế false negative

---

# ĐỊNH HƯỚNG NÂNG CẤP SAU NÀY

- AI detect toxic content
- AI chấm độ nghiêm túc profile
- AI detect spam profile
- Suggest role tự động
- Phân loại user theo độ hoạt động
- Match teammate cùng lĩnh vực
- Reputation system
- Auto profile scoring