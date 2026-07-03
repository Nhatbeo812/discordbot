// src/verify/adminPanel.js
import {
  ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder, MessageFlags,
} from 'discord.js';
import { dbHelpers } from './db.js';
import { buildMarkdown } from './profileBuilder.js';
import { logger } from '../utils/logger.js';

// ── Role IDs được phép duyệt hồ sơ ──────────────────────────────
const ALLOWED_REVIEWER_ROLES = [
  '1296703793651650571', // Admin
  '1499895563984965823', // Supporter
  '1387493175957913663', // Moderator
];

// ── Role IDs ngành nghề ───────────────────────────────────────────
const JOB_ROLES = {
  '3D':          process.env.DCBOT_ROLE_3D_ID          || '1499842181085790320',
  '2D':          process.env.DCBOT_ROLE_2D_ID          || '1499842304205127690',
  'VFX':         process.env.DCBOT_ROLE_VFX_ID         || '1499842436560715866',
  'Code':        process.env.DCBOT_ROLE_CODE_ID        || '1499894916443275526',
  'Photography': process.env.DCBOT_ROLE_PHOTOGRAPHY_ID || '1499842675996758264',
  'Editor':      process.env.DCBOT_ROLE_EDITOR_ID      || '1499842796792840263',
  'Network':     process.env.DCBOT_ROLE_NETWORK_ID     || '1503634110864953478',
};

// ── Role IDs giới tính ────────────────────────────────────────────
// Lưu ý: role giới tính được cấp tại bước user chọn (formFlow.js)
// Phần accept chỉ cấp lại nếu vì lý do nào đó user chưa có role
const GENDER_ROLES = {
  'Nam':  process.env.DCBOT_ROLE_MALE_ID   || '1499842997884289025',
  'Nữ':   process.env.DCBOT_ROLE_FEMALE_ID || '1499843221013139536',
  'LGBT': process.env.DCBOT_ROLE_LGBT_ID   || '1503634507079614515',
};

// ── Check quyền duyệt ────────────────────────────────────────────
function canReview(member) {
  return ALLOWED_REVIEWER_ROLES.some(roleId => member.roles.cache.has(roleId));
}

// ── ACCEPT ────────────────────────────────────────────────────────
export async function handleAccept(interaction, targetUserId) {
  if (!canReview(interaction.member)) {
    return interaction.reply({ content: '❌ Bạn không có quyền duyệt hồ sơ.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferUpdate();
  try {
    // [FIX #11] Chặn double-accept: kiểm tra đã approve chưa trước khi xử lý
    // Ngăn 2 admin bấm ACCEPT cùng lúc gây cấp role 2 lần / ghi DB 2 lần
    const existingProfile = await dbHelpers.getProfile(targetUserId);
    if (existingProfile?.approved_at) {
      logger.warn(`[Accept] User ${targetUserId} đã được approve trước đó (${existingProfile.approved_at}), bỏ qua.`);
      return interaction.editReply({
        content: `⚠️ Hồ sơ của <@${targetUserId}> đã được duyệt trước đó rồi.`,
        components: [], // [FIX #10] Xóa buttons khỏi panel khi phát hiện đã xử lý
      });
    }

    const guild = interaction.guild;
    const member = await guild.members.fetch(targetUserId).catch(err => {
      logger.warn(`[Accept] Không fetch member ${targetUserId}: ${err.message}`);
      return null;
    });

    if (!member) {
      // [FIX #10] Xóa buttons khi member đã rời server — tránh admin bấm lại nhiều lần
      return interaction.editReply({
        content: `❌ Không tìm thấy member <@${targetUserId}>. Họ có thể đã rời server.`,
        components: [],
      });
    }

    const profile = await dbHelpers.getProfile(targetUserId);
    const adminId = interaction.user.id;

    // Remove "Chưa xác thực" role
    const unverifiedRoleId = process.env.DCBOT_UNVERIFIED_ROLE_ID;
    if (unverifiedRoleId) {
      await member.roles.remove(unverifiedRoleId).catch(e =>
        logger.warn(`[Accept] Không remove role "Chưa xác thực": ${e.message}`)
      );
    }

    // Cấp Member role
    const memberRoleId = process.env.DCBOT_MEMBER_ROLE_ID;
    if (memberRoleId) {
      await member.roles.add(memberRoleId).catch(e =>
        logger.warn(`[Accept] Không add member role: ${e.message}`)
      );
    }

    const appliedRoles = [];

    // Cấp role ngành nghề
    const manualRole = profile?.manual_role;
    if (manualRole && JOB_ROLES[manualRole]) {
      const role = guild.roles.cache.get(JOB_ROLES[manualRole]);
      if (role) {
        await member.roles.add(role).catch(e =>
          logger.warn(`[Accept] Không add role ${manualRole}: ${e.message}`)
        );
        appliedRoles.push(manualRole);
        logger.ok(`[Accept] Added job role: ${manualRole}`);
      }
    }

    // Cấp role giới tính (đảm bảo user có role, phòng trường hợp bị thiếu)
    const gender = profile?.gender;
    if (gender && GENDER_ROLES[gender]) {
      const genderRoleId = GENDER_ROLES[gender];
      const role = guild.roles.cache.get(genderRoleId);
      if (role && !member.roles.cache.has(genderRoleId)) {
        await member.roles.add(role).catch(e =>
          logger.warn(`[Accept] Không add gender role ${gender}: ${e.message}`)
        );
        appliedRoles.push(gender);
        logger.ok(`[Accept] Added gender role: ${gender} (${genderRoleId})`);
      }
    }

    await dbHelpers.logAudit(targetUserId, 'accept', `Roles: ${appliedRoles.join(', ')}`, adminId);
    await dbHelpers.updateUserStatus(targetUserId, 'approved');
    await dbHelpers.approveProfile(targetUserId);

    // Luu vao approved_profiles cho read-panel
    // Goi sau khi profile da day du (gender, manual_role, tat ca fields)
    const fullProfile = await dbHelpers.getProfile(targetUserId);
    const memberCode  = await dbHelpers.saveApprovedProfile(
      targetUserId,
      { ...fullProfile, username: member.user.username },
      adminId,
      interaction.user.username,
    );
    logger.ok(`[Accept] Saved approved profile ${memberCode} cho ${member.user.username}`);

    // Lưu vào storage channel
    const storageChannelId = process.env.DCBOT_STORAGE_CHANNEL_ID;
    if (storageChannelId && profile) {
      try {
        const storageChannel = guild.channels.cache.get(storageChannelId);
        if (storageChannel) {
          const username  = member.user.username;
          const profileMD = buildMarkdown({ username }, profile);

          const storageEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setAuthor({
              name: `📂 Hồ sơ — ${username}`,
              iconURL: member.user.displayAvatarURL(),
            })
            .addFields(
              { name: '🆔 Mã số',      value: memberCode,                inline: true },
              { name: '👤 Giới tính',  value: profile.gender         ?? 'N/A', inline: true },
              { name: '📍 Khu vực',    value: profile.location        ?? 'N/A', inline: true },
              { name: '💼 Trạng thái', value: profile.current_status  ?? 'N/A', inline: true },
              { name: '🎯 Role',       value: appliedRoles.join(', ')  || 'N/A', inline: true },
              { name: '🔧 Ngành nghề', value: (profile.job_field      ?? 'N/A').substring(0, 100), inline: true },
            )
            .setFooter({ text: `UserID: ${targetUserId} • Duyệt bởi ${interaction.user.username}` })
            .setTimestamp();

          await storageChannel.send({ embeds: [storageEmbed], content: profileMD });
        }
      } catch (e) {
        logger.warn(`[Accept] Lỗi lưu vào storage channel: ${e.message}`);
      }
    }

    await dbHelpers.clearTempForm(targetUserId);

    await member.send(`✅ **Hồ sơ đã được duyệt!** Chào mừng đến với **Liên Hiệp Quit**! 🎉\n\n🆔 Mã số thành viên của bạn: **${memberCode}**`).catch(() => {});

    const doneEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('✅ Hồ sơ đã được duyệt')
      .setDescription(`<@${targetUserId}> đã được cấp role.`)
      .addFields(
        { name: 'Admin duyệt',   value: `<@${adminId}>`,                 inline: true },
        { name: '🆔 Mã số',        value: memberCode,                    inline: true },
        { name: '🎯 Roles',        value: appliedRoles.join(', ') || 'N/A', inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [doneEmbed], components: [] });

  } catch (err) {
    logger.error('[Accept] Lỗi:', err);
    await dbHelpers.logAudit(targetUserId, 'accept_error', err.message, interaction.user.id);
    await interaction.followUp({ content: `❌ Lỗi: ${err.message}`, flags: MessageFlags.Ephemeral });
  }
}

// ── DENY ──────────────────────────────────────────────────────────
export async function handleDeny(interaction, targetUserId) {
  if (!canReview(interaction.member)) {
    return interaction.reply({ content: '❌ Bạn không có quyền duyệt hồ sơ.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferUpdate();

  // [FIX #11 + BUG6] Check status tu 'users' collection (khong phai 'profiles')
  // profiles bi xoa sau khi deny -> getProfile tra null -> guard that bai
  // users collection giu status vinh vien, khong bi xoa khi deny
  const existingUser = await dbHelpers.getUser(targetUserId);
  if (existingUser?.status === 'denied') {
    logger.warn(`[Deny] User ${targetUserId} da bi deny truoc do, bo qua.`);
    return interaction.editReply({
      content: `⚠️ Hồ sơ của <@${targetUserId}> đã được xử lý (từ chối) trước đó rồi.`,
      components: [],
    });
  }

  const adminId = interaction.user.id;
  await dbHelpers.logAudit(targetUserId, 'deny', 'Profile denied', adminId);

  await dbHelpers.clearTempForm(targetUserId);
  await dbHelpers.deleteProfile(targetUserId);
  await dbHelpers.updateUserStatus(targetUserId, 'denied');
  // Xoa khoi approved_profiles neu truoc do da duoc duyet roi bi deny lai
  await dbHelpers.deleteApprovedProfile(targetUserId);

  try {
    const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    if (member) {
      await member.send('❌ **Hồ sơ đã bị từ chối.** Liên hệ admin để biết thêm chi tiết.\n\nBấm nút **Bắt đầu xác thực** để nộp lại hồ sơ.').catch(() => {});
    }
  } catch (e) {
    logger.warn(`[Deny] Lỗi fetch member: ${e.message}`);
  }

  const denyEmbed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('❌ Hồ sơ đã bị từ chối')
    .setDescription(`<@${targetUserId}> đã được thông báo qua DM và có thể nộp lại hồ sơ.`)
    .addFields({ name: 'Admin từ chối', value: `<@${adminId}>`, inline: true })
    .setTimestamp();

  await interaction.editReply({ embeds: [denyEmbed], components: [] });
}

// ── CẢNH BÁO — Mở modal ──────────────────────────────────────────
export async function handleWarnOpen(interaction, targetUserId) {
  if (!canReview(interaction.member)) {
    return interaction.reply({ content: '❌ Bạn không có quyền duyệt hồ sơ.', flags: MessageFlags.Ephemeral });
  }

  const modal = new ModalBuilder()
    .setCustomId(`admin_warn_modal_${targetUserId}`)
    .setTitle('⚠️ Gửi yêu cầu chỉnh sửa hồ sơ');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('warn_reason').setLabel('Nội dung yêu cầu chỉnh sửa')
        .setStyle(TextInputStyle.Paragraph).setPlaceholder('VD: Ghi rõ ngành nghề hơn...').setRequired(true).setMaxLength(500),
    ),
  );
  await interaction.showModal(modal);
}

// ── CẢNH BÁO — Submit ────────────────────────────────────────────
export async function handleWarnSubmit(interaction, targetUserId) {
  // [FIX #7] Wrap toàn bộ trong try/catch — trước đây không có error boundary nào
  // Nếu reply() hoặc fetch() thất bại → exception bay ra interactionCreate, khó debug
  try {
    const reason = interaction.fields.getTextInputValue('warn_reason')?.trim();
    if (!reason) {
      return interaction.reply({ content: '❌ Nội dung yêu cầu không được để trống.', flags: MessageFlags.Ephemeral });
    }

    const adminId = interaction.user.id;

    // reply trước — đảm bảo Discord nhận ack trong 3 giây
    await interaction.reply({
      content: `⚠️ Đã gửi yêu cầu chỉnh sửa tới <@${targetUserId}>.`,
      flags: MessageFlags.Ephemeral,
    });

    // Ghi DB sau reply — nếu DB lỗi không ảnh hưởng interaction đã reply
    await dbHelpers.updateUserStatus(targetUserId, 'needs_edit');
    await dbHelpers.logAudit(targetUserId, 'warn', `Reason: ${reason}`, adminId);
    await dbHelpers.clearTempForm(targetUserId);

    // Gửi DM — lỗi DM (user tắt DM) không được crash toàn handler
    try {
      const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
      if (member) {
        await member.send(
          '⚠️ **Hồ sơ cần chỉnh sửa**\n\n' +
          `**Yêu cầu từ quản trị viên:**\n${reason}\n\n` +
          'Bấm nút **Bắt đầu xác thực** để điền lại.'
        ).catch(dmErr =>
          logger.warn(`[Warn] Không gửi được DM cho ${targetUserId}: ${dmErr.message}`)
        );
      } else {
        logger.warn(`[Warn] Không tìm thấy member ${targetUserId} để gửi DM`);
      }
    } catch (fetchErr) {
      logger.warn(`[Warn] Lỗi fetch member khi gửi DM: ${fetchErr.message}`);
    }

    logger.ok(`[Warn] Admin ${interaction.user.username} gửi cảnh báo cho ${targetUserId}: ${reason.substring(0, 60)}`);

  } catch (err) {
    logger.error('[Warn] Lỗi xử lý handleWarnSubmit:', err);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `❌ Lỗi khi gửi cảnh báo: ${err.message}`, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: `❌ Lỗi khi gửi cảnh báo: ${err.message}`, flags: MessageFlags.Ephemeral });
      }
    } catch (_) { /* interaction đã hết hạn — bỏ qua */ }
  }
}
