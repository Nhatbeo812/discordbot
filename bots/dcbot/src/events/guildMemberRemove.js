// src/events/guildMemberRemove.js
// Ghi lịch sử khi thành viên rời server

import { dbHelpers } from '../verify/db.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'guildMemberRemove',
  once: false,

  async execute(member, client) {
    const { user } = member;
    logger.info(`[MemberRemove] ${user.username} (${user.id}) đã rời server`);
    await dbHelpers.logLeave(user.id, user.username);
  },
};
