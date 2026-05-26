# update_code.md

## Những bản cập nhật code Discord Bot gần nhất
# Discord Verification Bot — Latest Update Notes

# ✅ ĐÃ FIX HOÀN TOÀN (theo thứ tự làm)

* [Main] Panel cố định bị ghi đè bởi `interaction.update()`
* [#8] `threadCreate.js` export null gây loader warn mỗi boot
* [#10] Admin panel buttons còn hiển thị sau khi xử lý xong
* [#11] Double-accept / double-deny race condition
* [#6] `handleOpenForm2/3` dùng `interaction.update()` sai context
* [#7] `handleWarnSubmit` thiếu error boundary
* [#5] `_cooldown` Map reset — chấp nhận, không sửa
* [#4] Interaction timeout khi Render cold start
* [#2] HTTP alive nhưng Discord gateway đã drop
* [#3] JSON corrupt khi process bị kill (→ thay bằng Firestore)
* [#1] `verify.json` mất khi Render redeploy → migrate Firestore
* [~] Toàn bộ `dbHelpers` thiếu `await` sau khi migrate async
* [~] Circular import `interactionCreate` ← `index.js`
* [#9] `join_history` tăng vô hạn → trim giữ 50 doc/user

# ❌ KHÔNG CÒN LỖI NÀO CẦN FIX

---

# Quy trình hoạt động

## User bấm "Bắt đầu xác thực"

→ Bot đọc `form_temp` từ Firestore (`getTempForm`)
→ Nếu đang làm dở step 1/2/3 → tiếp tục từ chỗ đó
→ Nếu step 0 → mở Form 1 mới

---

## User submit Form 1

→ Ghi vào Firestore:

```js
form_temp/{userId}
{
  step: 1,
  form1: "..."
}
```

---

## User submit Form 2

→ Ghi vào Firestore:

```js
form_temp/{userId}
{
  step: 2,
  form2: "..."
}
```

---

## User submit Form 3 + chọn role + chọn giới tính

→ Đọc lại `form1` + `form2` từ Firestore
→ Gộp tất cả → ghi vào `profiles/{userId}`
→ Gửi embed lên kênh `#duyet-ho-so` (admin channel)

---

## Admin bấm ACCEPT

→ Đọc `profiles/{userId}` từ Firestore
→ Cấp role Discord
→ Gửi embed + `profileMD` vào kênh `#tai-lieu-tuyet-mat` (storage channel)
→ Cập nhật Firestore:

```js
{
  approved_at: timestamp,
  status: 'approved'
}
```

→ Xóa `form_temp/{userId}`

---

# Chức năng mới

# ✅ Kiểm tra từng chức năng — PASS

## Verify flow (`formFlow.js`)

* Panel cố định → bấm → mở Form 1/2/3 đúng thứ tự ✅
* Làm dở → bot nhớ step → tiếp tục đúng chỗ ✅
* Chọn role ngành nghề → cấp role Discord ngay ✅
* Chọn giới tính → cấp role + gửi admin channel ✅
* Hủy/làm lại → quay về step trước ✅

---

## Admin panel (`adminPanel.js`)

### Accept

* Remove unverified role
* Add member role
* Add job/gender role
* Lưu `approved_profiles`
* Gửi storage channel
* DM user

✅ PASS

---

### Deny

* Xóa profile + `approved_profiles`
* DM user

✅ PASS

---

### Double-accept guard

* Check `approved_at` từ `profiles`

✅ PASS

---

### Double-deny guard

* Check `status` từ `users collection`

✅ PASS

---

### Warn

* Reply ephemeral
* Gửi DM

✅ PASS

---

# Database (`db.js + firebaseClient.js`)

* Firestore connection ✅
* Auto-increment `member_code` atomic ✅
* Cache layer hoạt động ✅
* `searchApprovedProfiles` query đúng theo từng case index ✅
* Trim `join_history` 50 entries ✅

---

# Read panel (`readPanelFlow.js`)

* Ephemeral — chỉ admin/mod thấy, không cố định vào channel ✅
* Filter job + gender + mã số + tên hoạt động đúng ✅
* Phân trang `rp_page:{page}:{searchKey}` parse đúng ✅
* `SelectMenu` 0 options không crash ✅

---

# Sync role (`syncrole.js`)

* Scan toàn bộ `approved_profiles` ✅
* Cấp đúng role theo `job_role` và `gender` từ DB ✅
* Báo cáo chi tiết:

  * synced
  * ok
  * left
  * error

✅ PASS

---

# Reset user (`resetuser.js`)

* Xóa cả:

  * profile
  * tempForm
  * approved_profiles

✅ PASS

---

# Các command phụ

* `/hosoinfo`
* `/hosoxuat`
* `/stats`
* `/log`
* `/verifypanel`

→ sạch ✅

---

# Vấn đề khác

## Vấn đề 2

`hosoinfo.js` import `buildJSON` nhưng không dùng
→ ✅ bỏ import thừa

---

## syncrole.js — fallback hardcode

### 2D

```txt
1499842304205127690
→
1504166919513833613
```

### Other

```txt
1503634300585775176
→
1508337785386303499
```

---

# Tổng kết 6 bug đã fix

| # | Bug                                                                                            | File                                      | Fix                                                                                                               |   |                               |
| - | ---------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | - | ----------------------------- |
| 1 | `searchApprovedProfiles` — `orderBy + where` thiếu composite index → crash Firestore           | `db.js`                                   | Restructure query theo từng case, dùng đúng index có sẵn                                                          |   |                               |
| 2 | `buildResultComponents` — `StringSelectMenu` với 0 options crash Discord                       | `readPanelFlow.js`                        | Guard `if (pageItems.length > 0)` trước khi build SelectMenu                                                      |   |                               |
| 3 | `GENDER_OPTIONS` value `"Nữ"` — đã verify khớp DB, không cần sửa                               | —                                         | ✅ OK                                                                                                              |   |                               |
| 4 | `setValue()` với `??` có thể pass undefined nếu key không tồn tại                              | `readPanelFlow.js`                        | Đổi `??` → `                                                                                                      |   | `để fallback về`''` chắc chắn |
| 5 | `rp_page:` customId parse sai khi `searchKey` chứa `_` hoặc ký tự đặc biệt                     | `readPanelFlow.js + interactionCreate.js` | Đổi format thành `rp_page:{page}:{searchKey}`, parse bằng `indexOf` thay vì `split`                               |   |                               |
| 6 | `handleDeny` double-deny guard check `getProfile()` — bị xóa sau deny đầu tiên → guard vô hiệu | `adminPanel.js + db.js`                   | Đổi sang check `getUser().status` từ `users collection` (không bao giờ bị xóa) + thêm `getUser()` vào `dbHelpers` |   |                               |
