// src/commands/resetuser.js
// Admin command: reset hoàn toàn dữ liệu xác thực của 1 user (để họ nộp lại hồ sơ)

import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { dbHelpers } from '../verify/db.js';

export default {
  data: new SlashCommandBuilder()
    .setName('resetuser')
    .setDescription('[Admin] Reset dữ liệu xác thực của 1 thành viên để họ nộp lại hồ sơ')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('Thành viên cần reset').setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const userId = target.id;

    const hadProfile  = !!(await dbHelpers.getProfile(userId));
    const hadTempForm = !!(await dbHelpers.getTempForm(userId));

    // Xoa sach data
    await dbHelpers.clearTempForm(userId);
    await dbHelpers.deleteProfile(userId);
    await dbHelpers.updateUserStatus(userId, 'pending');
    // Xoa khoi approved_profiles neu da tung duoc duyet
    // Tranh read-panel hien profile cu sau khi reset
    await dbHelpers.deleteApprovedProfile(userId);
    await dbHelpers.logAudit(userId, 'manual_reset', `Reset boi ${interaction.user.username}`, interaction.user.id, interaction.user.username);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('🔄 Reset thành công')
      .setDescription(`Dữ liệu xác thực của <@${userId}> đã được xoá hoàn toàn.`)
      .addFields(
        { name: 'Profile cũ',   value: hadProfile  ? '✅ Đã xoá' : '⬜ Không có', inline: true },
        { name: 'TempForm cũ',  value: hadTempForm ? '✅ Đã xoá' : '⬜ Không có', inline: true },
        { name: 'Status mới',   value: '`pending`',                                inline: true },
      )
      .setFooter({ text: `Reset bởi ${interaction.user.username} • UserID: ${userId}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
