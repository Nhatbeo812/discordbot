// src/verify/formFlow.js
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder, MessageFlags,
} from 'discord.js';
import { dbHelpers } from './db.js';
import { detectRoles } from './detector.js';
import { buildMarkdown } from './profileBuilder.js';
import { logger } from '../utils/logger.js';

// ── Role IDs ngành nghề (từ .env) ─────────────────────────────────
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
const GENDER_ROLES = {
  'Nam':  process.env.DCBOT_ROLE_MALE_ID   || '1499842997884289025',
  'Nữ':   process.env.DCBOT_ROLE_FEMALE_ID || '1499843221013139536',
  'LGBT': process.env.DCBOT_ROLE_LGBT_ID   || '1503634507079614515',
};

// ── Cooldown ──────────────────────────────────────────────────────
const _cooldown = new Map();
const COOLDOWN_MS = 3000;
function isOnCooldown(userId) {
  const last = _cooldown.get(userId) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) return true;
  _cooldown.set(userId, Date.now());
  return false;
}

// ── Validate ──────────────────────────────────────────────────────
function validateField(value, fieldName, minLen = 1, maxLen = 500) {
  const v = (value ?? '').trim();
  if (v.length < minLen) return `❌ **${fieldName}** cần ít nhất ${minLen} ký tự.`;
  if (v.length > maxLen) return `❌ **${fieldName}** không được vượt quá ${maxLen} ký tự.`;
  if (/^(.)\1{4,}$/.test(v)) return `❌ **${fieldName}** không hợp lệ.`;
  return null;
}

// ── Progress embed ────────────────────────────────────────────────
function progressEmbed(step) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📘 Tiến độ hồ sơ: ${step}/3`)
    .addFields(
      { name: step >= 1 ? '✅ Phần 1' : '⬜ Phần 1', value: step >= 1 ? 'Hoàn thành' : 'Chưa điền', inline: true },
      { name: step >= 2 ? '✅ Phần 2' : '⬜ Phần 2', value: step >= 2 ? 'Hoàn thành' : 'Chưa điền', inline: true },
      { name: step >= 3 ? '✅ Phần 3' : '⬜ Phần 3', value: step >= 3 ? 'Hoàn thành' : 'Chưa điền', inline: true },
    )
    .setFooter({ text: 'Liên Hiệp Quit • Xác thực thành viên' });
}

// ── Reset toàn bộ hồ sơ của user ─────────────────────────────────
async function resetUserForm(userId) {
  await dbHelpers.clearTempForm(userId);
  await dbHelpers.deleteProfile(userId);
  await dbHelpers.updateUserStatus(userId, 'pending');
  await dbHelpers.logAudit(userId, 'self_reset', 'User tự reset hồ sơ để làm lại');
}

// ── VERIFY_START ──────────────────────────────────────────────────
export async function handleVerifyStart(interaction) {
  const userId = interaction.user.id;
  const tempForm = await dbHelpers.getTempForm(userId);
  const step = tempForm?.step ?? 0;

  if (step >= 5) {
    // [FIX Lỗi 1] showModal TRƯỚC (trong 3s token còn hiệu lực), reset DB SAU
    logger.info(`[Verify] Auto-reset step>=5 cho ${interaction.user.username}`);
    const showModalPromise = openForm1(interaction);
    resetUserForm(userId).catch(e => logger.warn(`[Verify] Reset lỗi (non-critical): ${e.message}`));
    return showModalPromise;
  }

  if (step === 1) {
    await interaction.deferUpdate();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_open_form2').setLabel('Tiếp tục Phần 2 →').setStyle(ButtonStyle.Primary),
    );
    return interaction.followUp({
      embeds: [progressEmbed(1).setDescription('🔄 Bạn đang làm dở. Bấm để tiếp tục Phần 2.')],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (step === 2) {
    await interaction.deferUpdate();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_open_form3').setLabel('Tiếp tục Phần 3 →').setStyle(ButtonStyle.Primary),
    );
    return interaction.followUp({
      embeds: [progressEmbed(2).setDescription('🔄 Bạn đang làm dở. Bấm để tiếp tục Phần 3.')],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (step === 3) {
    // [FIX A] deferUpdate xong phai dung editReply, khong dung followUp
    await interaction.deferUpdate();
    return _showJobRoleSelectionDeferred(interaction);
  }

  if (step === 4) {
    // [FIX A] tuong tu
    await interaction.deferUpdate();
    return _showGenderSelectionDeferred(interaction);
  }

  return openForm1(interaction);
}

// ── FORM 1 ────────────────────────────────────────────────────────
export async function openForm1(interaction) {
  const modal = new ModalBuilder().setCustomId('verify_modal_1').setTitle('Hồ Sơ (1/3) — Bản Thân');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('bio').setLabel('Giới thiệu bản thân')
        .setStyle(TextInputStyle.Paragraph).setPlaceholder('Tên, sở thích, ...').setMinLength(1).setMaxLength(500).setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('job_field').setLabel('Ngành nghề / lĩnh vực')
        .setStyle(TextInputStyle.Paragraph).setPlaceholder('VD: Lập trình, 3D, 2D...').setMinLength(1).setMaxLength(200).setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('current_status').setLabel('Trạng thái hiện tại')
        .setStyle(TextInputStyle.Short).setPlaceholder('Sinh viên / Đi làm / Freelancer...').setMinLength(1).setMaxLength(100).setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('location').setLabel('Khu vực sinh sống')
        .setStyle(TextInputStyle.Short).setPlaceholder('TP.HCM / Hà Nội...').setMinLength(1).setMaxLength(100).setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

export async function handleForm1Submit(interaction) {
  const userId = interaction.user.id;
  const bio            = interaction.fields.getTextInputValue('bio').trim();
  const job_field      = interaction.fields.getTextInputValue('job_field').trim();
  const current_status = interaction.fields.getTextInputValue('current_status').trim();
  const location       = interaction.fields.getTextInputValue('location').trim();

  // [FIX B] Validate trước, reply lỗi nếu có (không cần defer)
  const errors = [
    validateField(bio,            'Giới thiệu', 1, 500),
    validateField(job_field,      'Ngành nghề',  1, 200),
    validateField(current_status, 'Trạng thái',  1, 100),
    validateField(location,       'Khu vực',     1, 100),
  ].filter(Boolean);

  if (errors.length > 0) return interaction.reply({ content: errors.join('\n'), flags: MessageFlags.Ephemeral });

  // [FIX B] defer trước DB call → tránh timeout
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  await dbHelpers.upsertTempForm(userId, { step: 1, form1: JSON.stringify({ bio, job_field, current_status, location }), form2: null, form3: null });
  await dbHelpers.logAudit(userId, 'form1_submit', `job=${job_field}`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_cancel_step').setLabel('🔄 Làm lại').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('verify_open_form2').setLabel('Tiếp tục →').setStyle(ButtonStyle.Primary),
  );
  await interaction.editReply({ embeds: [progressEmbed(1).setDescription('Phần 1 đã lưu!')], components: [row] });
}

// ── FORM 2 ────────────────────────────────────────────────────────
export async function handleOpenForm2(interaction) {
  if (isOnCooldown(interaction.user.id)) return interaction.reply({ content: '⏳ Đợi vài giây.', flags: MessageFlags.Ephemeral });

  // [FIX Lỗi 2] KHÔNG deferUpdate trước showModal — Discord không cho phép showModal sau defer
  // Đọc DB trước khi reply bất kỳ thứ gì; nếu cần báo lỗi thì reply ephemeral, nếu OK thì showModal
  const tempForm = await dbHelpers.getTempForm(interaction.user.id);
  const step = tempForm?.step ?? 0;

  if (step === 0) {
    return interaction.reply({ content: '❌ Hoàn thành Phần 1 trước.', flags: MessageFlags.Ephemeral });
  }

  if (step >= 2) {
    return interaction.reply({
      embeds: [progressEmbed(step).setDescription('⚠️ Đã hoàn thành Phần 2. Bấm để tiếp tục Phần 3.')],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_open_form3').setLabel('Tiếp tục Phần 3 →').setStyle(ButtonStyle.Primary)
      )],
      flags: MessageFlags.Ephemeral,
    });
  }

  // step === 1: OK, mở modal (đây là response duy nhất cho interaction này)
  return openForm2(interaction);
}

export async function openForm2(interaction) {
  const modal = new ModalBuilder().setCustomId('verify_modal_2').setTitle('Hồ Sơ (2/3) — Kỹ Năng');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('skills').setLabel('Kỹ năng & Tools')
        .setStyle(TextInputStyle.Paragraph).setPlaceholder('Photoshop, Blender, VS Code...').setMinLength(1).setMaxLength(300).setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('interests').setLabel('Đam mê / Hứng thú')
        .setStyle(TextInputStyle.Paragraph).setMaxLength(300).setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('direction').setLabel('Định hướng tương lai')
        .setStyle(TextInputStyle.Paragraph).setMaxLength(300).setRequired(false),
    ),
  );
  await interaction.showModal(modal);
}

export async function handleForm2Submit(interaction) {
  const userId    = interaction.user.id;
  const skills    = interaction.fields.getTextInputValue('skills').trim();
  const interests = interaction.fields.getTextInputValue('interests').trim();
  const direction = interaction.fields.getTextInputValue('direction').trim();

  // [FIX B] Validate trước khi chưa defer
  const err = validateField(skills, 'Kỹ năng', 1, 300);
  if (err) return interaction.reply({ content: err, flags: MessageFlags.Ephemeral });

  // [FIX B] defer trước DB call
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  await dbHelpers.upsertTempForm(userId, { step: 2, form2: JSON.stringify({ skills, interests, direction }), form3: null });
  await dbHelpers.logAudit(userId, 'form2_submit', `skills=${skills.substring(0, 40)}`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_cancel_step').setLabel('🔄 Làm lại').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('verify_open_form3').setLabel('Tiếp tục →').setStyle(ButtonStyle.Primary),
  );
  await interaction.editReply({ embeds: [progressEmbed(2).setDescription('Phần 2 đã lưu!')], components: [row] });
}

// ── FORM 3 ────────────────────────────────────────────────────────
export async function handleOpenForm3(interaction) {
  if (isOnCooldown(interaction.user.id)) return interaction.reply({ content: '⏳ Đợi vài giây.', flags: MessageFlags.Ephemeral });

  // [FIX] KHÔNG deferUpdate trước showModal
  const tempForm = await dbHelpers.getTempForm(interaction.user.id);
  const step = tempForm?.step ?? 0;

  if (step < 2) {
    return interaction.reply({ content: `❌ Hoàn thành ${step === 0 ? 'Phần 1' : 'Phần 2'} trước.`, flags: MessageFlags.Ephemeral });
  }

  if (step >= 3) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('✅ Đã hoàn thành Phần 3').setDescription('Bạn đã điền xong cả 3 phần. Hồ sơ đang chờ admin duyệt.')],
      components: [],
      flags: MessageFlags.Ephemeral,
    });
  }

  // step === 2: OK, mở modal
  return openForm3(interaction);
}

export async function openForm3(interaction) {
  const modal = new ModalBuilder().setCustomId('verify_modal_3').setTitle('Hồ Sơ (3/3) — Liên Lạc');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('facebook').setLabel('Facebook (không bắt buộc)')
        .setStyle(TextInputStyle.Short).setPlaceholder('facebook.com/abc').setMaxLength(200).setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('portfolio').setLabel('Portfolio / GitHub (không bắt buộc)')
        .setStyle(TextInputStyle.Short).setPlaceholder('github.com/abc').setMaxLength(300).setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('contact').setLabel('Liên lạc khác')
        .setStyle(TextInputStyle.Short).setPlaceholder('Discord: abc / Gmail: abc@gmail.com').setMaxLength(200).setRequired(false),
    ),
  );
  await interaction.showModal(modal);
}

export async function handleForm3Submit(interaction) {
  const userId   = interaction.user.id;
  const username = interaction.user.username;
  const facebook  = interaction.fields.getTextInputValue('facebook').trim();
  const portfolio = interaction.fields.getTextInputValue('portfolio').trim();
  const contact   = interaction.fields.getTextInputValue('contact').trim();

  // [FIX #4] defer ngay để tránh timeout interaction (nhất là khi DB chậm)
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const tempForm = await dbHelpers.getTempForm(userId);
  if (!tempForm?.form1) return interaction.editReply({ content: '❌ Không tìm thấy dữ liệu Phần 1. Bấm **Bắt đầu xác thực** lại.' });

  const form1 = JSON.parse(tempForm.form1);
  const form2 = tempForm.form2 ? JSON.parse(tempForm.form2) : {};
  const allFields = { ...form1, ...form2, facebook, portfolio, contact };
  const detectedRoles = detectRoles(allFields.job_field ?? '');

  await dbHelpers.upsertUser(userId, username);
  await dbHelpers.upsertProfile(userId, { ...allFields, detected_roles: JSON.stringify(detectedRoles), profile_md: '' });
  await dbHelpers.upsertTempForm(userId, { step: 3, form3: JSON.stringify({ facebook, portfolio, contact, detectedRoles }) });
  await dbHelpers.logAudit(userId, 'form3_submit', 'All forms complete');

  // Sử dụng editReply vì đã defer
  const tempFormUpdated   = await dbHelpers.getTempForm(userId);
  const form3data         = tempFormUpdated?.form3 ? JSON.parse(tempFormUpdated.form3) : {};
  const detectedRolesFinal = form3data.detectedRoles ?? [];

  const roleRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_role_3D').setLabel('🎨 3D').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_2D').setLabel('✏️ 2D').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_VFX').setLabel('✨ VFX').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_Code').setLabel('💻 Code').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_Photo').setLabel('📷 Photography').setStyle(ButtonStyle.Primary),
  );
  const roleRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_role_Editor').setLabel('🎬 Editor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_Network').setLabel('🌐 Network').setStyle(ButtonStyle.Primary),
  );

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎯 Chọn ngành nghề chính của bạn')
    .setDescription(
      'Vui lòng chọn **role ngành nghề** phù hợp nhất.\n\n' +
      '> Bot detect: **' + (detectedRolesFinal.length > 0 ? detectedRolesFinal.join(', ') : 'Chưa xác định') + '**'
    )
    .setFooter({ text: 'Liên Hiệp Quit • Chọn role ngành nghề' });

  return interaction.editReply({ embeds: [embed], components: [roleRow1, roleRow2] });
}

// ── CHỌN ROLE NGÀNH NGHỀ ──────────────────────────────────────────
// Dùng khi interaction đã deferUpdate → phải editReply
async function _showJobRoleSelectionDeferred(interaction) {
  const tempForm   = await dbHelpers.getTempForm(interaction.user.id);
  const form3data  = tempForm?.form3 ? JSON.parse(tempForm.form3) : {};
  const detectedRoles = form3data.detectedRoles ?? [];

  const roleRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_role_3D').setLabel('🎨 3D').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_2D').setLabel('✏️ 2D').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_VFX').setLabel('✨ VFX').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_Code').setLabel('💻 Code').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_Photo').setLabel('📷 Photography').setStyle(ButtonStyle.Primary),
  );
  const roleRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_role_Editor').setLabel('🎬 Editor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_Network').setLabel('🌐 Network').setStyle(ButtonStyle.Primary),
  );
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎯 Chọn ngành nghề chính của bạn')
    .setDescription(
      'Vui lòng chọn **role ngành nghề** phù hợp nhất.\n\n' +
      '> Bot detect: **' + (detectedRoles.length > 0 ? detectedRoles.join(', ') : 'Chưa xác định') + '**'
    )
    .setFooter({ text: 'Liên Hiệp Quit • Chọn role ngành nghề' });

  return interaction.editReply({ embeds: [embed], components: [roleRow1, roleRow2] });
}

// Dùng khi interaction đã deferUpdate → phải editReply
function _showGenderSelectionDeferred(interaction) {
  const genderRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_gender_Nam').setLabel('👨 Nam').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_gender_Nu').setLabel('👩 Nữ').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_gender_LGBT').setLabel('🏳️‍🌈 LGBT').setStyle(ButtonStyle.Primary),
  );
  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🧑 Chọn giới tính của bạn')
        .setDescription('🔄 Bạn đã chọn role ngành nghề. Tiếp tục chọn **giới tính**:')
        .setFooter({ text: 'Liên Hiệp Quit • Bước cuối cùng!' }),
    ],
    components: [genderRow],
  });
}

async function showJobRoleSelection(interaction, isReply) {
  const tempForm   = await dbHelpers.getTempForm(interaction.user.id);
  const form3data  = tempForm?.form3 ? JSON.parse(tempForm.form3) : {};
  const detectedRoles = form3data.detectedRoles ?? [];

  const roleRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_role_3D').setLabel('🎨 3D').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_2D').setLabel('✏️ 2D').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_VFX').setLabel('✨ VFX').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_Code').setLabel('💻 Code').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_Photo').setLabel('📷 Photography').setStyle(ButtonStyle.Primary),
  );
  const roleRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_role_Editor').setLabel('🎬 Editor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_role_Network').setLabel('🌐 Network').setStyle(ButtonStyle.Primary),
  );

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎯 Chọn ngành nghề chính của bạn')
    .setDescription(
      'Vui lòng chọn **role ngành nghề** phù hợp nhất.\n\n' +
      '> Bot detect: **' + (detectedRoles.length > 0 ? detectedRoles.join(', ') : 'Chưa xác định') + '**'
    )
    .setFooter({ text: 'Liên Hiệp Quit • Chọn role ngành nghề' });

  if (isReply) {
    return interaction.reply({ embeds: [embed], components: [roleRow1, roleRow2], flags: MessageFlags.Ephemeral });
  }
  return interaction.followUp({ embeds: [embed], components: [roleRow1, roleRow2], flags: MessageFlags.Ephemeral });
}

// ── CHỌN GIỚI TÍNH ────────────────────────────────────────────────
function showGenderSelection(interaction, isReply = true) {
  const genderRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_gender_Nam').setLabel('👨 Nam').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_gender_Nu').setLabel('👩 Nữ').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_gender_LGBT').setLabel('🏳️‍🌈 LGBT').setStyle(ButtonStyle.Primary),
  );
  const payload = {
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🧑 Chọn giới tính của bạn')
        .setDescription('🔄 Bạn đã chọn role ngành nghề. Tiếp tục chọn **giới tính**:')
        .setFooter({ text: 'Liên Hiệp Quit • Bước cuối cùng!' }),
    ],
    components: [genderRow],
  };

  if (isReply) return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  return interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
}

// ── HANDLER: User chọn role ngành nghề ────────────────────────────
export async function handleJobRoleSelect(interaction, roleName) {
  const userId = interaction.user.id;
  const roleId = JOB_ROLES[roleName];

  if (!roleId) {
    await interaction.deferUpdate();
    return interaction.editReply({ content: '❌ Role không hợp lệ.', components: [], embeds: [] });
  }

  // [FIX] defer ngay để tránh timeout khi DB chậm
  await interaction.deferUpdate();

  try {
    await interaction.member.roles.add(roleId);
    logger.ok(`[Role] Cấp role ngành nghề ${roleName} cho ${interaction.user.username}`);
  } catch (e) {
    logger.warn(`[Role] Không add được role ${roleName}:`, e.message);
  }

  await dbHelpers.upsertProfile(userId, { manual_role: roleName });
  await dbHelpers.upsertTempForm(userId, { step: 4 });
  await dbHelpers.logAudit(userId, 'role_selected', `Chọn role: ${roleName}`);

  const genderRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_gender_Nam').setLabel('👨 Nam').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_gender_Nu').setLabel('👩 Nữ').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify_gender_LGBT').setLabel('🏳️‍🌈 LGBT').setStyle(ButtonStyle.Primary),
  );

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🧑 Chọn giới tính của bạn')
        .setDescription(`✅ Đã cấp role **${roleName}**!\n\nBây giờ hãy chọn **giới tính** của bạn:`)
        .setFooter({ text: 'Liên Hiệp Quit • Bước cuối cùng!' }),
    ],
    components: [genderRow],
  });
}

// ── HANDLER: User chọn giới tính → cấp role + gửi admin ──────────
export async function handleGenderSelect(interaction, genderKey) {
  const userId   = interaction.user.id;
  const username = interaction.user.username;

  // [FIX #1] defer ngay để tránh interaction token hết hạn (3s)
  await interaction.deferUpdate();

  // [FIX #2] Chặn user đã được duyệt khỏi gửi lại yêu cầu
  const existingApproved = await dbHelpers.getApprovedProfile(userId);
  if (existingApproved) {
    logger.warn(`[Gender] User ${username} đã approved, bỏ qua.`);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Hồ sơ đã được duyệt')
          .setDescription('Hồ sơ của bạn đã được admin duyệt trước đó. Không cần thực hiện lại.')
          .setFooter({ text: 'Liên Hiệp Quit • Xác thực thành viên' }),
      ],
      components: [],
    });
  }

  const genderMap = { 'Nam': 'Nam', 'Nu': 'Nữ', 'LGBT': 'LGBT' };
  const gender    = genderMap[genderKey] ?? 'Không xác định';

  await dbHelpers.upsertProfile(userId, { gender });
  await dbHelpers.upsertTempForm(userId, { step: 5 });
  await dbHelpers.logAudit(userId, 'gender_selected', `Giới tính: ${gender}`);

  const genderRoleId = GENDER_ROLES[gender];
  if (genderRoleId) {
    try {
      await interaction.member.roles.add(genderRoleId);
      logger.ok(`[Role] Cấp role giới tính ${gender} cho ${username}`);
    } catch (e) {
      logger.warn(`[Role] Không add được role giới tính ${gender}:`, e.message);
    }
  }

  const profile = await dbHelpers.getProfile(userId);
  const profileMD = buildMarkdown({ username }, profile);
  await dbHelpers.upsertProfile(userId, { profile_md: profileMD });

  const adminChannelId = process.env.DCBOT_ADMIN_REVIEW_CHANNEL_ID;
  const adminChannel   = interaction.guild.channels.cache.get(adminChannelId);
  if (adminChannel) {
    await sendToAdminChannel(adminChannel, interaction.user, profile);
  } else {
    logger.warn(`[Verify] Không tìm thấy admin channel: ${adminChannelId}`);
  }

  await dbHelpers.logAudit(userId, 'profile_pending', 'Sent to admin channel');

  const manualRole = profile?.manual_role ?? 'N/A';
  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Hồ sơ đã được gửi!')
        .setDescription('Hồ sơ đang **chờ admin duyệt**.\nBạn sẽ nhận thông báo qua DM.')
        .addFields(
          { name: '🎯 Role ngành nghề', value: `**${manualRole}**`, inline: true },
          { name: '👤 Giới tính',       value: gender,              inline: true },
        )
        .setFooter({ text: 'Liên Hiệp Quit • Cảm ơn bạn!' })
        .setTimestamp(),
    ],
    components: [],
  });
}

// ── Gửi hồ sơ lên admin channel ──────────────────────────────────
async function sendToAdminChannel(channel, user, profile) {
  const manualRole = profile?.manual_role ?? 'N/A';
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📨 Hồ Sơ Chờ Duyệt')
    .setDescription(`User: <@${user.id}> \`(${user.username})\``)
    .addFields(
      { name: '👤 Giới tính',    value: profile?.gender         ?? 'N/A', inline: true },
      { name: '📍 Khu vực',      value: profile?.location       ?? 'N/A', inline: true },
      { name: '💼 Trạng thái',   value: profile?.current_status ?? 'N/A', inline: true },
      { name: '🔧 Ngành nghề',   value: (profile?.job_field     ?? 'N/A').substring(0, 200) },
      { name: '🎯 Role đã chọn', value: manualRole },
      { name: '📝 Giới thiệu',   value: (profile?.bio           ?? 'N/A').substring(0, 300) },
    )
    .setTimestamp()
    .setFooter({ text: '🟢 Hồ sơ chờ duyệt' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`admin_accept_${user.id}`).setLabel('✅ ACCEPT').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`admin_deny_${user.id}`).setLabel('❌ DENY').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`admin_warn_${user.id}`).setLabel('⚠️ CẢNH BÁO').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ── HỦY / LÀM LẠI ────────────────────────────────────────────────
export async function handleCancelStep(interaction) {
  const userId   = interaction.user.id;

  // [FIX D] defer truoc DB; khong the goi showModal sau khi button da duoc defer
  await interaction.deferUpdate();

  const tempForm = await dbHelpers.getTempForm(userId);
  const step     = tempForm?.step ?? 1;

  if (step <= 1) {
    await dbHelpers.upsertTempForm(userId, { step: 0, form1: null });
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🔄 Đã xóa Phần 1').setDescription('Bấm **Bắt đầu xác thực** để điền lại từ đầu.')],
      components: [],
    });
  } else if (step === 2) {
    await dbHelpers.upsertTempForm(userId, { step: 1, form2: null });
    return interaction.editReply({
      embeds: [progressEmbed(1).setDescription('❌ Đã xóa Phần 2. Bấm để điền lại.')],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_open_form2').setLabel('✏️ Điền lại Phần 2').setStyle(ButtonStyle.Primary),
      )],
    });
  } else {
    await dbHelpers.upsertTempForm(userId, { step: 2, form3: null });
    return interaction.editReply({
      embeds: [progressEmbed(2).setDescription('❌ Đã xóa Phần 3. Bấm để điền lại.')],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_open_form3').setLabel('✏️ Điền lại Phần 3').setStyle(ButtonStyle.Primary),
      )],
    });
  }
}