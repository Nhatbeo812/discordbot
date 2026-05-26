// src/commands/log.js
// Admin command: Export audit logs

import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  AttachmentBuilder,
} from 'discord.js';
import { dbHelpers } from '../verify/db.js';
import { logger } from '../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('[Admin] Xem và export audit logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Xem danh sách users có audit logs')
    )
    .addSubcommand(sub =>
      sub
        .setName('export')
        .setDescription('Export audit log của 1 user thành file txt')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('User cần export log')
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      return handleLogList(interaction, client);
    } else if (subcommand === 'export') {
      return handleLogExport(interaction);
    }
  },
};

// ── List all users with logs ──────────────────────────────────────
async function handleLogList(interaction, client) {
  try {
    const users = await dbHelpers.getAllAuditUsers();

    if (users.length === 0) {
      return interaction.reply({
        content: '❌ Không có audit logs nào.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const userList = await Promise.all(
      users.map(async (userId) => {
        try {
          const userObj = await client.users.fetch(userId);
          const logCount = (await dbHelpers.getAuditLogs(userId)).length;
          return `<@${userId}> (\`${userObj.username}\`) - **${logCount}** entries`;
        } catch {
          return `\`${userId}\` - *User không tìm thấy*`;
        }
      })
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Audit Logs - Danh Sách Users')
      .setDescription(userList.join('\n') || 'Không có logs')
      .addFields({
        name: 'Tổng cộng',
        value: `**${users.length}** users có logs`,
        inline: true,
      })
      .setFooter({ text: 'Dùng /log export <user> để export logs của user' })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('[Log List] Lỗi:', err);
    await interaction.reply({
      content: `❌ Lỗi: ${err.message}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

// ── Export logs of specific user ──────────────────────────────────
async function handleLogExport(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser('user');
    const targetUserId = targetUser.id;

    // ✅ Lấy logs
    const logs = await dbHelpers.getAuditLogs(targetUserId);
    if (logs.length === 0) {
      return interaction.editReply({
        content: `❌ Không có audit logs cho <@${targetUserId}>.`,
      });
    }

    const logText = await dbHelpers.exportAuditLogsAsText(targetUserId);

    // ✅ Tạo file attachment
    const attachment = new AttachmentBuilder(Buffer.from(logText, 'utf-8'), {
      name: `auditlog_${targetUser.username}_${Date.now()}.txt`,
    });

    // ✅ Hiện preview + gửi file
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('📄 Audit Log Exported')
      .setDescription(`**User:** <@${targetUserId}> (\`${targetUser.username}\`)\n**Total entries:** ${logs.length}`)
      .addFields({
        name: 'Preview (First 5 entries)',
        value:
          logs
            .slice(0, 5)
            .map(log => `\`${log.timestamp}\` **[${log.action}]** ${log.details}`)
            .join('\n') || 'N/A',
      })
      .setFooter({ text: 'File full log đã được gửi kèm theo.' })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
    });

    logger.info(`[Log Export] Admin ${interaction.user.username} exported logs for ${targetUser.username}`);
  } catch (err) {
    logger.error('[Log Export] Lỗi:', err);
    await interaction.editReply({
      content: `❌ Lỗi: ${err.message}`,
    });
  }
}
