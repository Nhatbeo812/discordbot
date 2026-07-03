// src/verify/db.js
// Firestore-based database — thay the verify.json
// [FIX #1] Data khong bi mat khi Render redeploy

import { db }     from '../utils/firebaseClient.js';
import { logger } from '../utils/logger.js';

// ── Collection refs ───────────────────────────────────────────────
const usersCol            = db.collection('users');
const profilesCol         = db.collection('profiles');
const tempFormsCol        = db.collection('form_temp');
const joinHistoryCol      = db.collection('join_history');
const auditLogsCol        = db.collection('audit_logs');
const approvedProfilesCol = db.collection('approved_profiles');
const countersCol         = db.collection('counters');

// ── In-memory cache ───────────────────────────────────────────────
const _cache = {
  users:            {},
  profiles:         {},
  tempForm:         {},
  approvedProfiles: {},
};

function now() { return Math.floor(Date.now() / 1000); }

// ── Retry wrapper ─────────────────────────────────────────────────
// Tu dong thu lai khi gap loi tam thoi (network, quota)
// UNAUTHENTICATED (code 16) -> khong retry, throw ngay
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

async function withRetry(fn, label = 'DB') {
  let lastErr;
  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err.code === 16) {
        logger.error(`[${label}] UNAUTHENTICATED: Firebase credential sai tren Render.`);
        throw err;
      }
      if (i === RETRY_ATTEMPTS - 1) break;
      logger.warn(`[${label}] Loi lan ${i + 1}/${RETRY_ATTEMPTS}: ${err.message}. Thu lai...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastErr;
}

// ── Internal helpers ──────────────────────────────────────────────
async function _getDoc(col, id) {
  return withRetry(async () => {
    const snap = await col.doc(id).get();
    return snap.exists ? snap.data() : null;
  }, 'getDoc');
}

async function _setDoc(col, id, data, merge = true) {
  return withRetry(async () => {
    if (merge) {
      await col.doc(id).set(data, { merge: true });
    } else {
      await col.doc(id).set(data);
    }
  }, 'setDoc');
}

// ── Auto-increment member_code ────────────────────────────────────
async function _nextProfileCode() {
  const counterRef = countersCol.doc('profile_counter');
  const newCode = await withRetry(() => db.runTransaction(async t => {
    const snap = await t.get(counterRef);
    const last = snap.exists ? (snap.data().last_code ?? 0) : 0;
    const next = last + 1;
    t.set(counterRef, { last_code: next }, { merge: true });
    return next;
  }), 'counter');
  return `#${String(newCode).padStart(4, '0')}`;
}

// ── Trim join_history: chi giu 50 doc moi nhat/user ──────────────
const JOIN_HISTORY_LIMIT = 50;
async function _trimJoinHistory(userId) {
  const snap = await joinHistoryCol
    .where('user_id', '==', userId)
    .orderBy('timestamp', 'desc')
    .get();
  if (snap.size <= JOIN_HISTORY_LIMIT) return;
  const toDelete = snap.docs.slice(JOIN_HISTORY_LIMIT);
  const batch = db.batch();
  toDelete.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  logger.info(`[DB] Trimmed ${toDelete.length} join_history docs cho user ${userId}`);
}

// ─────────────────────────────────────────────────────────────────
export const dbHelpers = {

  // ── Users ─────────────────────────────────────────────────────────
  async upsertUser(userId, username) {
    const existing = _cache.users[userId] ?? await _getDoc(usersCol, userId);
    if (existing) {
      const update = { username, updated_at: now() };
      _cache.users[userId] = { ...existing, ...update };
      await _setDoc(usersCol, userId, update);
    } else {
      const data = { username, status: 'pending', created_at: now(), updated_at: now() };
      _cache.users[userId] = data;
      await _setDoc(usersCol, userId, data, false);
      logger.info(`[DB] New user: ${username} (${userId})`);
    }
  },

  async updateUserStatus(userId, status) {
    const existing = _cache.users[userId] ?? await _getDoc(usersCol, userId);
    if (!existing) return;
    const old = existing.status;
    const update = { status, updated_at: now() };
    _cache.users[userId] = { ...existing, ...update };
    await _setDoc(usersCol, userId, update);
    logger.info(`[DB] User ${userId} status: ${old} -> ${status}`);
  },

  async getUser(userId) {
    if (_cache.users[userId]) return _cache.users[userId];
    const data = await _getDoc(usersCol, userId);
    if (data) _cache.users[userId] = data;
    return data;
  },

  // ── Profiles ──────────────────────────────────────────────────────
  async upsertProfile(userId, data) {
    const existing = _cache.profiles[userId] ?? {};
    const merged = { ...existing, ...data };
    _cache.profiles[userId] = merged;
    await _setDoc(profilesCol, userId, data);
  },

  async getProfile(userId) {
    if (_cache.profiles[userId]) return _cache.profiles[userId];
    const data = await _getDoc(profilesCol, userId);
    if (data) _cache.profiles[userId] = data;
    return data;
  },

  async approveProfile(userId) {
    const update = { approved_at: now() };
    if (_cache.profiles[userId]) {
      _cache.profiles[userId] = { ..._cache.profiles[userId], ...update };
    }
    await _setDoc(profilesCol, userId, update);
    logger.info(`[DB] Profile approved: ${userId}`);
  },

  async deleteProfile(userId) {
    delete _cache.profiles[userId];
    await withRetry(() => profilesCol.doc(userId).delete(), 'deleteProfile');
    logger.info(`[DB] Profile deleted: ${userId}`);
  },

  // ── Approved Profiles ─────────────────────────────────────────────
  async saveApprovedProfile(userId, profileData, adminId, adminUsername) {
    const memberCode = await _nextProfileCode();
    const data = {
      member_id:      userId,
      member_code:    memberCode,
      username:       profileData.username      ?? '',
      username_lower: (profileData.username     ?? '').toLowerCase(),
      job_role:       profileData.manual_role    ?? '',
      gender:         profileData.gender         ?? '',
      bio:            profileData.bio            ?? '',
      job_field:      profileData.job_field      ?? '',
      skills:         profileData.skills         ?? '',
      interests:      profileData.interests      ?? '',
      direction:      profileData.direction      ?? '',
      current_status: profileData.current_status ?? '',
      location:       profileData.location       ?? '',
      facebook:       profileData.facebook       ?? '',
      portfolio:      profileData.portfolio      ?? '',
      contact:        profileData.contact        ?? '',
      approved_at:    now(),
      approved_by_id: adminId,
      approved_by:    adminUsername,
    };
    _cache.approvedProfiles[userId] = data;
    await _setDoc(approvedProfilesCol, userId, data, false);
    logger.ok(`[DB] Saved approved profile: ${profileData.username} (${userId}) -> ${memberCode}`);
    return memberCode;
  },

  async getApprovedProfile(userId) {
    if (_cache.approvedProfiles[userId]) return _cache.approvedProfiles[userId];
    const data = await _getDoc(approvedProfilesCol, userId);
    if (data) _cache.approvedProfiles[userId] = data;
    return data;
  },

  async searchApprovedProfiles({ memberCode, jobRole, username, gender } = {}) {
    const hasJob    = jobRole && jobRole !== 'all';
    const hasGender = gender  && gender  !== 'all';

    // [FIX #3] Tránh compound query cần Firestore composite index
    // Strategy: dùng 1 field filter mạnh nhất, còn lại filter client-side
    let query = approvedProfilesCol;
    if (hasJob) {
      query = query.where('job_role', '==', jobRole).orderBy('approved_at', 'desc');
    } else if (hasGender) {
      query = query.where('gender', '==', gender).orderBy('approved_at', 'desc');
    } else {
      query = query.orderBy('approved_at', 'desc');
    }

    const snap = await withRetry(() => query.limit(200).get(), 'search');
    let results = snap.docs.map(d => d.data());

    // Client-side filter phần còn lại
    if (hasJob && hasGender) {
      results = results.filter(p => p.gender === gender);
    } else if (!hasJob && hasGender) {
      // Đã filter bằng gender trên query, không cần thêm
    }

    if (memberCode) {
      const normalized = memberCode.startsWith('#') ? memberCode : `#${memberCode.padStart(4, '0')}`;
      results = results.filter(p => p.member_code === normalized);
    }
    if (username?.trim()) {
      const q = username.trim().toLowerCase();
      results = results.filter(p => (p.username_lower ?? '').includes(q));
    }
    return results;
  },

  async getAllApprovedProfiles() {
    const snap = await withRetry(() => approvedProfilesCol.get(), 'getAllApproved');
    return snap.docs.map(d => d.data());
  },

  async deleteApprovedProfile(userId) {
    delete _cache.approvedProfiles[userId];
    await withRetry(() => approvedProfilesCol.doc(userId).delete(), 'deleteApproved');
    logger.info(`[DB] Deleted approved profile: ${userId}`);
  },

  // ── Form temp ─────────────────────────────────────────────────────
  async getTempForm(userId) {
    if (_cache.tempForm[userId]) return _cache.tempForm[userId];
    const data = await _getDoc(tempFormsCol, userId);
    if (data) _cache.tempForm[userId] = data;
    return data;
  },

  async upsertTempForm(userId, data) {
    const existing = _cache.tempForm[userId]
      ?? await _getDoc(tempFormsCol, userId)
      ?? { step: 0, form1: null, form2: null, form3: null };
    const merged = { ...existing };
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) merged[k] = v;
    }
    merged.updated_at = now();
    _cache.tempForm[userId] = merged;
    await _setDoc(tempFormsCol, userId, merged, false);
  },

  async clearTempForm(userId) {
    delete _cache.tempForm[userId];
    await withRetry(() => tempFormsCol.doc(userId).delete(), 'clearTemp');
    logger.info(`[DB] Cleared temp form: ${userId}`);
  },

  // ── Join history ──────────────────────────────────────────────────
  async logJoin(userId, username) {
    await withRetry(() => joinHistoryCol.add({ user_id: userId, username, event: 'join', timestamp: now() }), 'logJoin');
    await _trimJoinHistory(userId);
  },

  async logLeave(userId, username) {
    await withRetry(() => joinHistoryCol.add({ user_id: userId, username, event: 'leave', timestamp: now() }), 'logLeave');
    await _trimJoinHistory(userId);
  },

  async getJoinHistory(userId) {
    const snap = await withRetry(() =>
      joinHistoryCol.where('user_id', '==', userId).orderBy('timestamp', 'desc').limit(20).get(),
      'joinHistory'
    );
    return snap.docs.map(d => d.data());
  },

  async getJoinCount(userId) {
    const snap = await withRetry(() =>
      joinHistoryCol.where('user_id', '==', userId).where('event', '==', 'join').get(),
      'joinCount'
    );
    return snap.size;
  },

  // ── Audit logs ────────────────────────────────────────────────────
  async logAudit(userId, action, details, byId = null, byName = null) {
    await withRetry(() => auditLogsCol.add({
      user_id: userId, action, details,
      by: byId, by_name: byName,
      timestamp: new Date().toISOString(),
    }), 'logAudit');
    logger.info(`[DB][Audit] ${userId} -> ${action}: ${details}`);
  },

  async getAuditLogs(userId) {
    const snap = await withRetry(() =>
      auditLogsCol.where('user_id', '==', userId).orderBy('timestamp', 'asc').get(),
      'auditLogs'
    );
    return snap.docs.map(d => d.data());
  },

  async getAllAuditUsers() {
    const snap = await withRetry(() => auditLogsCol.get(), 'allAuditUsers');
    const ids = new Set(snap.docs.map(d => d.data().user_id));
    return [...ids];
  },

  async exportAuditLogsAsText(userId) {
    const user = await _getDoc(usersCol, userId);
    const logs = await dbHelpers.getAuditLogs(userId);
    const header = `AUDIT LOG -- ${user?.username ?? userId} (${userId})\n${'='.repeat(50)}\n`;
    const entries = logs.map(l =>
      `[${l.timestamp}] [${l.action.toUpperCase()}]\n  ${l.details}` +
      (l.by_name ? `\n  By: ${l.by_name} (${l.by})` : '')
    ).join('\n\n');
    return header + (entries || '(Khong co entries)');
  },

  // ── Stats ─────────────────────────────────────────────────────────
  async getStats() {
    const snap = await withRetry(() => usersCol.get(), 'stats');
    const users = snap.docs.map(d => d.data());
    return {
      total:    users.length,
      approved: users.filter(u => u.status === 'approved').length,
      pending:  users.filter(u => u.status === 'pending').length,
      denied:   users.filter(u => u.status === 'denied').length,
    };
  },
};
