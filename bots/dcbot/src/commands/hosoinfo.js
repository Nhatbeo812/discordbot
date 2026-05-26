// src/commands/hosoinfo.js
// Admin command: xem thông tin hồ sơ của 1 user cụ thể

import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  AttachmentBuilder,
} from 'discord.js';
import { dbHelpers } from '../verify/db.js';
import { buildMarkdown } from '../verify/profileBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hosoinfo')
    .setDescription('[Admin] Xem hồ sơ xác thực của một thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('Thành viên cần xem').setRequired(true)
    ),

  async execute(interaction) {
    const target  = interaction.options.getUser('user');
    const profile = await dbHelpers.getProfile(target.id);
    const history = await dbHelpers.getJoinHistory(target.id);
    const count   = await dbHelpers.getJoinCount(target.id);

    if (!profile) {
      return interaction.reply({
        content: `❌ Không có hồ sơ nào cho <@${target.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const roles = profile.detected_roles ? JSON.parse(profile.detected_roles) : [];
    const lastJoin = history.find(h => h.event === 'join');
    const lastJoinDate = lastJoin
      ? new Date(lastJoin.timestamp * 1000).toLocaleDateString('vi-VN')
      : 'N/A';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📁 Hồ sơ: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '👤 Giới tính',     value: profile.gender         ?? 'N/A', inline: true },
        { name: '📍 Khu vực',       value: profile.location       ?? 'N/A', inline: true },
        { name: '💼 Trạng thái',    value: profile.current_status ?? 'N/A', inline: true },
        { name: '🔧 Ngành nghề',    value: profile.job_field      ?? 'N/A' },
        { name: '🛠 Kỹ năng',       value: profile.skills         ?? 'N/A' },
        { name: '🎯 Định hướng',    value: profile.direction      ?? 'N/A' },
        { name: '🏷 Role được cấp', value: roles.join(', ')       || 'Chưa cấp', inline: true },
        { name: '📅 Số lần join',   value: String(count),                   inline: true },
        { name: '🕓 Join gần nhất', value: lastJoinDate,                    inline: true },
      )
      .setFooter({ text: `UserID: ${target.id}` })
      .setTimestamp();

    // Attach file MD
    const profileMD  = buildMarkdown({ username: target.username }, profile);
    const attachment = new AttachmentBuilder(
      Buffer.from(profileMD, 'utf-8'),
      { name: `${target.username}.md` }
    );

    await interaction.reply({
      embeds: [embed],
      files: [attachment],
      flags: MessageFlags.Ephemeral,
    });
  },
};
