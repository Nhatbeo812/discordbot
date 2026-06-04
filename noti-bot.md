# BOT_FORUM_MONITOR_SPEC.md

# 1. Tổng quan

Bot Discord Node.js dùng để theo dõi các Forum Channel trong một Discord Server.

Khi bot hoạt động:

* Kết nối vào Discord bằng Bot Token.
* Truy cập Server thông qua `guild_id`.
* Theo dõi các Forum Channel được cấu hình.
* Phát hiện:

  * Bài viết mới.
  * Bài viết được chỉnh sửa.
* Ghi log toàn bộ hoạt động.
* Gửi thông báo vào kênh chat được chỉ định.

---

# 2. File .env

```env
BOT_TOKEN=xxxxxxxxxxxx
CLIENT_ID=xxxxxxxxxxxx
GUILD_ID=xxxxxxxxxxxx

CHAT_CHANNEL_ID=xxxxxxxxxxxx

FORUM_1_ID=xxxxxxxxxxxx
FORUM_2_ID=xxxxxxxxxxxx
```

---

# 3. Các thành phần hệ thống

## Guild

```txt
guild_id
```

Là Discord Server cần theo dõi.

---

## Forum Channel

Ví dụ:

```txt
Quýt Giải Đáp
Quýt WIP
```

Bot sẽ chỉ theo dõi các forum được khai báo.

---

## Chat Channel

Ví dụ:

```txt
#forum-update-log
```

Nơi bot gửi thông báo khi có bài viết mới hoặc bài viết được cập nhật.

---

# 4. Luồng khởi động

## Bước 1

Bot login Discord

```js
client.login(BOT_TOKEN)
```

---

## Bước 2

Bot lấy guild

```js
guild = client.guilds.cache.get(GUILD_ID)
```

---

## Bước 3

Kiểm tra tồn tại

Nếu không tồn tại:

```txt
[ERROR]
Guild không tồn tại
```

Bot dừng.

---

## Bước 4

Nạp danh sách forum

```txt
FORUM_1_ID
FORUM_2_ID
```

---

## Bước 5

Tải cache bài viết hiện tại

```txt
cache/threads.json
```

---

## Bước 6

Bot ghi log

```txt
[INFO]
Bot đã kết nối thành công
Guild: Quýt Community
Forum đang theo dõi: 2
```

---

# 5. Theo dõi bài viết mới

Discord Forum thực chất tạo ra Thread.

Bot sử dụng:

```js
threadCreate
```

---

## Khi phát hiện thread mới

Bot lấy:

```txt
Thread ID
Thread Name
Forum Name
Author
Created Time
```

---

## Lấy nội dung đầu tiên

```js
thread.messages.fetch()
```

Lấy message đầu tiên.

---

## Tạo summary

Ví dụ:

Nội dung:

Xin chào mọi người
Mình cần hỗ trợ về Packet Tracer

Summary:

```txt
Xin chào mọi người...
```

Giới hạn:

```txt
200 ký tự
```

---

## Lưu cache

```json
{
  "threadId": "123456",
  "messageId": "999999",
  "contentHash": "abc123"
}
```

---

## Ghi log

```txt
[NEW_THREAD]

Forum:
Quýt Giải Đáp

Thread:
Lỗi Packet Tracer

Thread ID:
123456789

Author:
Béo

Summary:
Xin chào mọi người...
```

---

## Gửi thông báo

```txt
📢 BÀI VIẾT MỚI

Diễn đàn:
Quýt Giải Đáp

Người tạo:
Béo

Tiêu đề:
Lỗi Packet Tracer

Tóm tắt:
Xin chào mọi người...
```

---

# 6. Theo dõi cập nhật bài viết

Discord không có event riêng cho Forum Post Update.

Do đó cần theo dõi:

```js
messageUpdate
```

---

## Khi message được sửa

Bot kiểm tra:

```txt
Message thuộc thread nào
```

Nếu thread thuộc forum đang theo dõi:

Tiếp tục xử lý.

---

## So sánh dữ liệu cũ

Ví dụ:

Cache:

```txt
Xin chào mọi người
```

Nội dung mới:

```txt
Xin chào mọi người
Mình cần hỗ trợ OSPF
```

Hash thay đổi.

Bot xác định:

```txt
Đây là cập nhật mới
```

---

## Cập nhật cache

```json
{
  "threadId": "123456",
  "messageId": "999999",
  "contentHash": "xyz999"
}
```

---

## Ghi log

```txt
[THREAD_UPDATED]

Forum:
Quýt Giải Đáp

Thread:
Lỗi Packet Tracer

Author:
Béo

Old Summary:
Xin chào mọi người...

New Summary:
Xin chào mọi người
Mình cần hỗ trợ OSPF...
```

---

## Gửi thông báo

```txt
📝 BÀI VIẾT ĐƯỢC CẬP NHẬT

Diễn đàn:
Quýt Giải Đáp

Người tạo:
Béo

Tiêu đề:
Lỗi Packet Tracer

Nội dung mới:
Xin chào mọi người
Mình cần hỗ trợ OSPF...
```

---

# 7. Cache System

## Mục tiêu

Tránh:

```txt
Spam log
Spam thông báo
Gửi trùng dữ liệu
```

---

## File

```txt
cache/threads.json
```

---

## Cấu trúc

```json
{
  "123456789": {
    "threadName": "Lỗi Packet Tracer",
    "messageId": "999999",
    "lastHash": "abcxyz",
    "lastUpdate": "2026-06-04T15:30:00Z"
  }
}
```

---

# 8. Logging System

## Thư mục

```txt
logs/
```

---

## File

```txt
logs/app.log
```

---

## INFO

```txt
[INFO]
Bot Started
```

```txt
[INFO]
Guild Loaded
```

```txt
[INFO]
Forum Loaded
```

---

## NEW THREAD

```txt
[NEW_THREAD]
Forum=Quýt Giải Đáp
Thread=123456
Author=Béo
```

---

## THREAD UPDATED

```txt
[THREAD_UPDATED]
Forum=Quýt Giải Đáp
Thread=123456
```

---

## WARNING

```txt
[WARNING]
Thread không tìm thấy nội dung đầu tiên
```

---

## ERROR

```txt
[ERROR]
Discord API Error
```

```txt
[ERROR]
Forum ID không tồn tại
```

```txt
[ERROR]
Không ghi được cache
```

---

# 9. Log Rotation

Mỗi ngày:

```txt
logs/2026-06-04.log
logs/2026-06-05.log
logs/2026-06-06.log
```

---

# 10. Xử lý lỗi

## Discord API lỗi

```txt
Retry sau 5 giây
```

---

## Mất kết nối Discord

```txt
Tự động reconnect
```

---

## Không đọc được forum

```txt
Ghi log ERROR
Bỏ qua forum đó
```

---

## Cache lỗi

```txt
Tạo lại cache mới
```

---

# 11. Quyền Bot

Bot cần:

```txt
View Channels
Read Message History
Send Messages
Manage Threads
Create Public Threads
```

---

# 12. Cấu trúc thư mục

```txt
project/
│
├── src/
│   ├── index.js
│   ├── config.js
│   ├── logger.js
│   ├── cacheManager.js
│   ├── forumWatcher.js
│   └── notifier.js
│
├── cache/
│   └── threads.json
│
├── logs/
│   └── app.log
│
├── .env
├── package.json
└── README.md
```

---

# 13. Luồng hoạt động tổng thể

```txt
Bot Start
    │
    ▼
Login Discord
    │
    ▼
Load Guild
    │
    ▼
Load Forum List
    │
    ▼
Load Cache
    │
    ▼
Listening Event
    │
    ├─ threadCreate
    │      │
    │      ▼
    │   Log New Thread
    │      │
    │      ▼
    │   Send Notification
    │
    └─ messageUpdate
           │
           ▼
      Compare Hash
           │
           ├─ No Change
           │      ▼
           │     Ignore
           │
           └─ Changed
                  ▼
             Update Cache
                  ▼
             Log Update
                  ▼
             Send Notification
```
