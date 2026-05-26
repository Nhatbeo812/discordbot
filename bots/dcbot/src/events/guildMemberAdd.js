// src/events/guildMemberAdd.js
// Ghi lịch sử join + cấp role "Chưa xác thực"
// KHÔNG gửi panel mới — member tự xác thực qua panel cố định (đặt bởi /verifypanel)

import { dbHelpers } from '../verify/db.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, _client) {
    const { user, guild } = member;
    logger.info(`[MemberAdd] ${user.username} (${user.id}) đã join server`);

    // Lưu vào DB & ghi lịch sử join
    await dbHelpers.upsertUser(user.id, user.username);
    await dbHelpers.logJoin(user.id, user.username);

    const joinCount = await dbHelpers.getJoinCount(user.id);
    if (joinCount > 1) {
      logger.info(`[MemberAdd] ${user.username} join lần thứ ${joinCount}`);
    }

    // Cấp role "Chưa xác thực" — member sẽ tự bấm panel cố định để xác thực
    const unverifiedRoleId = process.env.DCBOT_UNVERIFIED_ROLE_ID;
    if (unverifiedRoleId) {
      try {
        const unverifiedRole = guild.roles.cache.get(unverifiedRoleId);
        if (unverifiedRole) {
          await member.roles.add(unverifiedRole).catch(e =>
            logger.warn(`[MemberAdd] Lỗi cấp role "Chưa xác thực": ${e.message}`)
          );
          logger.ok(`[MemberAdd] Cấp role "Chưa xác thực" cho ${user.username}`);
        }
      } catch (err) {
        logger.warn(`[MemberAdd] Lỗi cấp role: ${err.message}`);
      }
    }

    // Không gửi panel / không ping — tránh spam welcome channel
  },
};
