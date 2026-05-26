// src/events/interactionCreate.js
import { MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';

import {
  handleVerifyStart, handleForm1Submit,
  handleOpenForm2, handleForm2Submit,
  handleOpenForm3, handleForm3Submit,
  handleJobRoleSelect, handleGenderSelect,
  handleCancelStep,
} from '../verify/formFlow.js';

import {
  handleAccept, handleDeny, handleWarnOpen, handleWarnSubmit,
} from '../verify/adminPanel.js';

import {
  sendReadPanel,
  handleRpFilterJob, handleRpFilterGender,
  handleRpOpenSearchModal, handleRpDoSearch,
  handleRpSelectProfile, handleRpPage,
  handleRpBackToResults, handleRpBackToSearch, handleRpReset,
  handleRpSearchModalSubmit,
} from '../verify/readPanelFlow.js';

async function safeReply(interaction, message) {
  const payload = { content: message, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch {}
}

// Map button customId → role name
const ROLE_BUTTON_MAP = {
  'verify_role_3D': '3D',
  'verify_role_2D': '2D',
  'verify_role_VFX': 'VFX',
  'verify_role_Code': 'Code',
  'verify_role_Photo': 'Photography',
  'verify_role_Editor': 'Editor',
  'verify_role_Network': 'Network',
  'verify_role_Other': 'Other',
};

const GENDER_BUTTON_MAP = {
  'verify_gender_Nam': 'Nam',
  'verify_gender_Nu': 'Nu',
  'verify_gender_LGBT': 'LGBT',
};

export default {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {

    // [FIX #4] Ready gate: neu gateway chua ready (cold start), reply ngay tranh timeout 3s
    // Khong de interaction expire ma Discord hien "This interaction failed"
    if (!client.isReady()) {
      try {
        await interaction.reply({ content: '⏳ Bot vừa khởi động, vui lòng thử lại sau vài giây.', flags: MessageFlags.Ephemeral });
      } catch (_) {}
      return;
    }

    // ── Slash Commands ──────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) { logger.warn(`Command không tìm thấy: /${interaction.commandName}`); return; }
      try { await command.execute(interaction, client); }
      catch (err) { logger.error(`Lỗi /${interaction.commandName}:`, err.message); await safeReply(interaction, '❌ Lỗi khi thực thi lệnh.'); }
      return;
    }

    // ── Buttons ─────────────────────────────────────────────────
    if (interaction.isButton()) {
      const { customId } = interaction;
      logger.info(`[Button] ${interaction.user.username} → ${customId}`);
      try {
        // Verify flow
        if (customId === 'verify_start')       return await handleVerifyStart(interaction);
        if (customId === 'verify_open_form2')  return await handleOpenForm2(interaction);
        if (customId === 'verify_open_form3')  return await handleOpenForm3(interaction);
        if (customId === 'verify_cancel_step') return await handleCancelStep(interaction);

        // Role ngành nghề
        if (ROLE_BUTTON_MAP[customId]) return await handleJobRoleSelect(interaction, ROLE_BUTTON_MAP[customId]);

        // Giới tính
        if (GENDER_BUTTON_MAP[customId]) return await handleGenderSelect(interaction, GENDER_BUTTON_MAP[customId]);

        // Admin panel
        if (customId.startsWith('admin_accept_')) return await handleAccept(interaction, customId.slice('admin_accept_'.length));
        if (customId.startsWith('admin_deny_'))   return await handleDeny(interaction, customId.slice('admin_deny_'.length));
        if (customId.startsWith('admin_warn_') && !customId.startsWith('admin_warn_modal_'))
          return await handleWarnOpen(interaction, customId.slice('admin_warn_'.length));

        // Read panel buttons
        if (customId === 'rp_open_search_modal') return await handleRpOpenSearchModal(interaction);
        if (customId === 'rp_do_search')         return await handleRpDoSearch(interaction);
        if (customId === 'rp_reset')             return await handleRpReset(interaction);
        if (customId === 'rp_back_to_search')    return await handleRpBackToSearch(interaction);
        if (customId === 'rp_back_to_results')   return await handleRpBackToResults(interaction);
        if (customId === 'rp_page_info')         return; // disabled button, bo qua
        if (customId.startsWith('rp_page:')) {
          // Format: rp_page:{page}:{searchKey}
          // searchKey co the chua bat ky ky tu tru ':'
          // Tach theo vi tri dau tien va thu hai cua ':' de lay dung gia tri
          const firstColon  = customId.indexOf(':');
          const secondColon = customId.indexOf(':', firstColon + 1);
          const page        = parseInt(customId.substring(firstColon + 1, secondColon), 10);
          const searchKey   = customId.substring(secondColon + 1);
          return await handleRpPage(interaction, searchKey, page);
        }

      } catch (err) {
        logger.error(`[Button] Lỗi ${customId}:`, err);
        await safeReply(interaction, '❌ Lỗi, vui lòng thử lại.');
      }
      return;
    }

    // ── Select Menus ─────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      const { customId } = interaction;
      logger.info(`[Select] ${interaction.user.username} -> ${customId}`);
      try {
        if (customId === 'rp_filter_job')                    return await handleRpFilterJob(interaction);
        if (customId === 'rp_filter_gender')                 return await handleRpFilterGender(interaction);
        if (customId.startsWith('rp_select_profile:'))      return await handleRpSelectProfile(interaction);
      } catch (err) {
        logger.error(`[Select] Loi ${customId}:`, err);
        await safeReply(interaction, '❌ Lỗi khi xử lý, vui lòng thử lại.');
      }
      return;
    }

    // ── Modals ──────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;
      logger.info(`[Modal] ${interaction.user.username} → ${customId}`);
      try {
        if (customId === 'verify_modal_1') return await handleForm1Submit(interaction);
        if (customId === 'verify_modal_2') return await handleForm2Submit(interaction);
        if (customId === 'verify_modal_3') return await handleForm3Submit(interaction);
        if (customId.startsWith('admin_warn_modal_'))
          return await handleWarnSubmit(interaction, customId.slice('admin_warn_modal_'.length));
        if (customId === 'rp_search_modal')
          return await handleRpSearchModalSubmit(interaction);
      } catch (err) {
        logger.error(`[Modal] Lỗi ${customId}:`, err);
        await safeReply(interaction, '❌ Lỗi khi xử lý form.');
      }
      return;
    }
  },
};
