// src/commands/hosoxuat.js
// Admin command: export hồ sơ user ra file MD / TXT / JSON

import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
  AttachmentBuilder,
} from 'discord.js';
import { dbHelpers } from '../verify/db.js';
import { buildMarkdown, buildTXT, buildJSON } from '../verify/profileBuilder.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hosoxuat')
    .setDescription('[Admin] Export hồ sơ thành viên ra file')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('Thành viên cần export').setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('format')
        .setDescription('Định dạng file (mặc định: tất cả)')
        .addChoices(
          { name: 'Tất cả (MD + TXT + JSON)', value: 'all' },
          { name: 'Markdown (.md)',            value: 'md'  },
          { name: 'Plain Text (.txt)',         value: 'txt' },
          { name: 'JSON (.json)',              value: 'json'},
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    const target  = interaction.options.getUser('user');
    const format  = interaction.options.getString('format') ?? 'all';
    const profile = await dbHelpers.getProfile(target.id);

    if (!profile) {
      return interaction.reply({
        content: `❌ Không có hồ sơ nào cho <@${target.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const username = target.username;
    const files    = [];

    if (format === 'all' || format === 'md') {
      files.push(new AttachmentBuilder(
        Buffer.from(buildMarkdown({ username }, profile), 'utf-8'),
        { name: `${username}.md` }
      ));
    }
    if (format === 'all' || format === 'txt') {
      files.push(new AttachmentBuilder(
        Buffer.from(buildTXT({ username }, profile), 'utf-8'),
        { name: `${username}.txt` }
      ));
    }
    if (format === 'all' || format === 'json') {
      files.push(new AttachmentBuilder(
        Buffer.from(buildJSON(target.id, { username }, profile), 'utf-8'),
        { name: `${username}.json` }
      ));
    }

    await interaction.reply({
      content: `📁 Hồ sơ của **${username}** (format: \`${format}\`)`,
      files,
      flags: MessageFlags.Ephemeral,
    });
  },
};
