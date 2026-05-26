// src/verify/detector.js

// ── Role keyword mapping ──────────────────────────────────────────
const ROLE_KEYWORDS = [
  { keywords: ['2d', '2d artist', 'vẽ 2d', 'minh họa', 'illustration', 'vẽ tranh'], role: '2D' },
  { keywords: ['3d', '3d artist', '3d modeling', 'blender', 'maya', 'cinema 4d', 'zbrush', 'sculpt'], role: '3D' },
  { keywords: ['dev', 'developer', 'lập trình', 'code', 'coding', 'programmer', 'software', 'backend', 'frontend', 'fullstack', 'web dev', 'javascript', 'python', 'java', 'c++', 'c#'], role: 'Code' },
  { keywords: ['editor', 'video editor', 'dựng phim', 'dựng video', 'chỉnh video', 'cut video', 'premiere', 'davinci'], role: 'Editor' },
  { keywords: ['vfx', 'visual effect', 'hiệu ứng hình ảnh', 'compositing', 'nuke', 'after effects'], role: 'VFX' },
  { keywords: ['photo', 'photographer', 'nhiếp ảnh', 'lightroom', 'chụp ảnh', 'photography'], role: 'Photography' },
  { keywords: ['network', 'networking', 'quản trị mạng', 'cisco', 'ccna', 'ccnp', 'hạ tầng mạng', 'network engineer', 'mạng máy tính'], role: 'Network' },
  { keywords: ['other', 'khác', 'khác đi', 'không có chuyên ngành', 'general', 'misc'], role: 'Other' },
];

// ── Levenshtein similarity ────────────────────────────────────────
function similarity(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const dp = [];
  for (let i = 0; i <= la; i++) {
    dp[i] = [i];
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = i === 0 ? j
        : Math.min(
            dp[i-1][j] + 1,
            dp[i][j-1] + 1,
            dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
          );
    }
  }
  return 1 - dp[la][lb] / Math.max(la, lb);
}

function normalize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// ── Detect roles ──────────────────────────────────────────────────
export function detectRoles(text) {
  if (!text) return [];
  const normalized = normalize(text);
  const words      = normalized.split(' ');
  const detected   = new Set();

  for (const { keywords, role } of ROLE_KEYWORDS) {
    for (const kw of keywords) {
      if (normalized.includes(kw)) { detected.add(role); break; }
      if (!kw.includes(' ') && kw.length >= 3) {
        for (const word of words) {
          if (word.length >= 3 && similarity(word, kw) >= 0.85) {
            detected.add(role); break;
          }
        }
      }
      if (detected.has(role)) break;
    }
  }
  return [...detected];
}
