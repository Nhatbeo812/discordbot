// src/commands/syncrole.js
// /sync-role: Dong bo role Discord -> Firestore approved_profiles
// Quet toan bo approved_profiles, voi moi user:
//   - Neu con trong server: check role hien tai vs DB, cap lai neu thieu
//   - Neu da roi server: skip, ghi log
// Chi admin/mod co ManageRoles moi dung duoc

import {
  SlashCommandBuilder, PermissionFlagsBits,
  EmbedBuilder, MessageFlags,
} from 'discord.js';
import { dbHelpers } from '../verify/db.js';
import { logger }    from '../utils/logger.js';

// ── Role ID maps (dong bo voi adminPanel.js va formFlow.js) ───────
const JOB_ROLES = {
  '3D':          process.env.DCBOT_ROLE_3D_ID          || '1499842181085790320',
  '2D':          process.env.DCBOT_ROLE_2D_ID          || '1504166919513833613',
  'VFX':         process.env.DCBOT_ROLE_VFX_ID         || '1499842436560715866',
  'Code':        process.env.DCBOT_ROLE_CODE_ID        || '1499894916443275526',
  'Photography': process.env.DCBOT_ROLE_PHOTOGRAPHY_ID || '1499842675996758264',
  'Editor':      process.env.DCBOT_ROLE_EDITOR_ID      || '1499842796792840263',
  'Network':     process.env.DCBOT_ROLE_NETWORK_ID     || '1503634110864953478',
};

const GENDER_ROLES = {
  'Nam':  process.env.DCBOT_ROLE_MALE_ID   || '1499842997884289025',
  'Nữ':   process.env.DCBOT_ROLE_FEMALE_ID || '1499843221013139536',
  'LGBT': process.env.DCBOT_ROLE_LGBT_ID   || '1503634507079614515',
};

export default {
  data: new SlashCommandBuilder()
    .setName('sync-role')
    .setDescription('Đồng bộ role Discord với database approved_profiles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    // Defer ngay - viec nay co the mat vai giay neu nhieu member
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;

    // Counters
    let synced   = 0; // cap them role thanh cong
    let alreadyOk = 0; // da co du role, khong can sync
    let leftServer = 0; // da roi server
    let errors   = 0; // loi khac
    const errorDetails = [];

    try {
      const profiles = await dbHelpers.getAllApprovedProfiles();

      if (profiles.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⚠️ Không có hồ sơ nào')
            .setDescription('Chưa có hồ sơ nào được duyệt trong database.')
          ],
        });
      }

      logger.info(`[SyncRole] Bat dau sync ${profiles.length} profiles...`);

      // Xu ly tung profile
      for (const profile of profiles) {
        const userId = profile.member_id;
        if (!userId) continue;

        try {
          // Fetch member tu Discord
          const member = await guild.members.fetch(userId).catch(() => null);

          if (!member) {
            leftServer++;
            logger.info(`[SyncRole] ${profile.username ?? userId} da roi server, bo qua.`);
            continue;
          }

          const memberRoleId    = process.env.DCBOT_MEMBER_ROLE_ID;
          const unverifiedRoleId = process.env.DCBOT_UNVERIFIED_ROLE_ID;
          let addedAny = false;

          // 1. Remove role "Chua xac thuc" neu con
          if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
            await member.roles.remove(unverifiedRoleId).catch(e =>
              logger.warn(`[SyncRole] Khong remove unverified role cho ${userId}: ${e.message}`)
            );
          }

          // 2. Cap Member role neu thieu
          if (memberRoleId && !member.roles.cache.has(memberRoleId)) {
            await member.roles.add(memberRoleId).catch(e =>
              logger.warn(`[SyncRole] Khong add member role cho ${userId}: ${e.message}`)
            );
            addedAny = true;
          }

          // 3. Cap role nganh nghe neu thieu
          const jobRoleId = JOB_ROLES[profile.job_role];
          if (jobRoleId && !member.roles.cache.has(jobRoleId)) {
            await member.roles.add(jobRoleId).catch(e =>
              logger.warn(`[SyncRole] Khong add job role ${profile.job_role} cho ${userId}: ${e.message}`)
            );
            addedAny = true;
            logger.ok(`[SyncRole] Added job role ${profile.job_role} cho ${profile.username}`);
          }

          // 4. Cap role gioi tinh neu thieu
          const genderRoleId = GENDER_ROLES[profile.gender];
          if (genderRoleId && !member.roles.cache.has(genderRoleId)) {
            await member.roles.add(genderRoleId).catch(e =>
              logger.warn(`[SyncRole] Khong add gender role ${profile.gender} cho ${userId}: ${e.message}`)
            );
            addedAny = true;
            logger.ok(`[SyncRole] Added gender role ${profile.gender} cho ${profile.username}`);
          }

          if (addedAny) {
            synced++;
          } else {
            alreadyOk++;
          }

        } catch (err) {
          errors++;
          const msg = `${profile.username ?? userId}: ${err.message}`;
          errorDetails.push(msg);
          logger.error(`[SyncRole] Loi xu ly ${userId}:`, err.message);
        }
      }

      // Log audit
      await dbHelpers.logAudit(
        'system',
        'sync_role',
        `Synced ${synced}, ok ${alreadyOk}, left ${leftServer}, errors ${errors}`,
        interaction.user.id,
        interaction.user.username,
      );

      // Build ket qua embed
      const total = profiles.length;
      const embed = new EmbedBuilder()
        .setColor(errors > 0 ? 0xFEE75C : 0x57F287)
        .setTitle('🔄 Kết quả Sync Role')
        .addFields(
          { name: '📊 Tổng hồ sơ',       value: `\`${total}\``,      inline: true },
          { name: '✅ Đã cấp thêm role',  value: `\`${synced}\``,     inline: true },
          { name: '🟢 Đã đủ role',        value: `\`${alreadyOk}\``,  inline: true },
          { name: '🚪 Đã rời server',     value: `\`${leftServer}\``, inline: true },
          { name: '❌ Lỗi',               value: `\`${errors}\``,     inline: true },
          { name: '​',                    value: '​',                   inline: true },
        )
        .setFooter({ text: `Thực hiện bởi ${interaction.user.username} • Liên Hiệp Quit` })
        .setTimestamp();

      // Hien thi chi tiet loi neu co (toi da 5 dong)
      if (errorDetails.length > 0) {
        const shown = errorDetails.slice(0, 5).join('\n');
        const more  = errorDetails.length > 5 ? `\n...và ${errorDetails.length - 5} lỗi khác` : '';
        embed.addFields({ name: '⚠️ Chi tiết lỗi', value: `\`\`\`${shown}${more}\`\`\`` });
      }

      logger.ok(`[SyncRole] Hoan thanh: synced=${synced}, ok=${alreadyOk}, left=${leftServer}, err=${errors}`);
      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      logger.error('[SyncRole] Loi nghiem trong:', err);
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('❌ Lỗi Sync Role')
          .setDescription(`Đã xảy ra lỗi nghiêm trọng:\n\`\`\`${err.message}\`\`\``)
        ],
      });
    }
  },
};
