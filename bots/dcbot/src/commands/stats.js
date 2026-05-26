// src/commands/stats.js
// Admin command: Xem thống kê xác thực hồ sơ

import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { dbHelpers } from '../verify/db.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('[Admin] Xem thống kê xác thực thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const stats = await dbHelpers.getStats();

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Thống Kê Xác Thực Thành Viên')
        .addFields(
          { name: '👥 Tổng cộng', value: String(stats.total), inline: true },
          { name: '✅ Đã duyệt', value: String(stats.approved), inline: true },
          { name: '⏳ Đang chờ', value: String(stats.pending), inline: true },
          { name: '❌ Bị từ chối', value: String(stats.denied), inline: true },
          { 
            name: '📈 Tỷ lệ duyệt', 
            value: stats.total > 0 
              ? `${((stats.approved / stats.total) * 100).toFixed(1)}%` 
              : 'N/A',
            inline: true 
          },
        )
        .setFooter({ text: 'Liên Hiệp Quit • Hệ thống xác thực hồ sơ' })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      await interaction.reply({
        content: `❌ Lỗi: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
