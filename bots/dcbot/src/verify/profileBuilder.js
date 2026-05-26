// src/verify/profileBuilder.js
// Tạo profile dưới dạng Markdown (box đẹp), TXT, JSON

function vn() {
  return new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Markdown (code block box — hiển thị đẹp trong Discord) ───────
export function buildMarkdown(user, profile) {
  const manualRole = profile?.manual_role ?? 'Chưa xác định';

  const fb   = profile?.facebook  || 'Hiện chưa cập nhật';
  const port = profile?.portfolio || 'Hiện chưa cập nhật';
  const ct   = profile?.contact   || 'Hiện chưa cập nhật';

  return [
    '```',
    '┌─────────────────────────────────────┐',
    '│    📂  HỒ SƠ THÀNH VIÊN             │',
    '│         LIÊN HIỆP QUIT              │',
    '└─────────────────────────────────────┘',
    '',
    '──────────── 📜 THÔNG TIN CƠ BẢN ────────────',
    `• Discord    : ${user.username}`,
    `• Giới tính  : ${profile?.gender         ?? 'Không xác định'}`,
    `• Khu vực    : ${profile?.location        ?? 'Hiện chưa cập nhật'}`,
    `• Trạng thái : ${profile?.current_status  ?? 'Hiện chưa cập nhật'}`,
    '',
    '──────────── 👤 GIỚI THIỆU BẢN THÂN ─────────',
    `• Tên        : ${profile?.bio             ?? 'Hiện chưa cập nhật'}`,
    '',
    '──────────────── 💼 NGÀNH NGHỀ ───────────────',
    `• Chuyên ngành : ${profile?.job_field     ?? 'Hiện chưa cập nhật'}`,
    '',
    '──────────── ⚙️  KỸ NĂNG & TOOLS ────────────',
    `• ${profile?.skills                       || 'Hiện chưa cập nhật'}`,
    '',
    '──────────── 🎮 ĐAM MÊ & HỨNG THÚ ──────────',
    `• ${profile?.interests                    || 'Hiện chưa cập nhật'}`,
    '',
    '────────── 🚀 ĐỊNH HƯỚNG TƯƠNG LAI ──────────',
    `• ${profile?.direction                    || 'Hiện chưa cập nhật'}`,
    '',
    '──────────────── 🌐 LIÊN LẠC ────────────────',
    `• Facebook   : ${fb}`,
    `• Portfolio  : ${port}`,
    `• Liên lạc   : ${ct}`,
    '',
    '────────────────── 🎴 ROLE ───────────────────',
    `• ${manualRole}`,
    '```',
  ].join('\n');
}

// ── Plain text (dùng cho /hosoxuat .txt) ─────────────────────────
export function buildTXT(user, profile) {
  const manualRole = profile?.manual_role ?? 'Chưa xác định';
  const lines = [
    'HỒ SƠ THÀNH VIÊN — LIÊN HIỆP QUIT',
    '====================================',
    `Discord       : ${user.username}`,
    `Giới tính     : ${profile?.gender         ?? 'Không xác định'}`,
    `Khu vực       : ${profile?.location        ?? 'N/A'}`,
    `Trạng thái    : ${profile?.current_status  ?? 'N/A'}`,
    '',
    '[ GIỚI THIỆU ]',
    profile?.bio ?? 'N/A',
    '',
    '[ NGÀNH NGHỀ ]',
    profile?.job_field ?? 'N/A',
    '',
    '[ KỸ NĂNG ]',
    profile?.skills ?? 'N/A',
    '',
    '[ ĐỊNH HƯỚNG ]',
    profile?.direction ?? 'N/A',
    '',
    '[ LIÊN LẠC ]',
    `Facebook  : ${profile?.facebook  || 'Không có'}`,
    `Portfolio : ${profile?.portfolio || 'Không có'}`,
    `Khác      : ${profile?.contact   || 'Không có'}`,
    '',
    `Role : ${manualRole}`,
    `Ngày : ${vn()}`,
  ];
  return lines.join('\n');
}

// ── JSON (dùng cho /hosoxuat .json) ──────────────────────────────
export function buildJSON(userId, user, profile) {
  return JSON.stringify({
    userId,
    username:       user.username,
    gender:         profile?.gender,
    location:       profile?.location,
    current_status: profile?.current_status,
    bio:            profile?.bio,
    job_field:      profile?.job_field,
    skills:         profile?.skills,
    interests:      profile?.interests,
    direction:      profile?.direction,
    facebook:       profile?.facebook,
    portfolio:      profile?.portfolio,
    contact:        profile?.contact,
    manual_role:    profile?.manual_role,
    created_at:     new Date().toISOString(),
  }, null, 2);
}
