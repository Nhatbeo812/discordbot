// src/commands/readpanel.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { sendReadPanel } from '../verify/readPanelFlow.js';

export default {
  data: new SlashCommandBuilder()
    .setName('read-panel')
    .setDescription('Mở panel tra cứu hồ sơ thành viên đã được duyệt')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    await sendReadPanel(interaction);
  },
};
