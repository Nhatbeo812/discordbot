// src/commands/verifypanel.js
// Admin command: gửi panel xác thực vào channel hiện tại

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('verifypanel')
    .setDescription('[Admin] Gửi panel xác thực hồ sơ vào channel này')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔐 Xác Thực Thành Viên — Liên Hiệp Quit')
      .setDescription(
        '## Chào mừng bạn!\n' +
        'Để được truy cập đầy đủ server, vui lòng hoàn thành **hồ sơ xác thực**.\n\n' +
        'Bấm nút bên dưới để bắt đầu.'
      )
      .addFields(
        {
          name: '📋 Hồ sơ gồm 3 phần',
          value:
            '**1.** Thông tin bản thân (tên, giới tính, ngành nghề, khu vực)\n' +
            '**2.** Kỹ năng & Định hướng tương lai\n' +
            '**3.** Thông tin liên lạc (tùy chọn)',
          inline: false,
        },
        { name: '⏱ Thời gian', value: 'Khoảng 3–5 phút', inline: true },
        { name: '🤖 Tự động', value: 'Bot sẽ tự detect role & gửi cho admin duyệt', inline: true },
      )
      .setFooter({ text: 'Thông tin sẽ được admin xét duyệt trước khi cấp quyền.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_start')
        .setLabel('🚀 Bắt đầu xác thực')
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({
      content: '✅ Panel xác thực đã được gửi vào channel này!',
      flags: MessageFlags.Ephemeral,
    });
  },
};
