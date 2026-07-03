// src/verify/readPanelFlow.js
// Toan bo logic /read-panel: tim kiem, phan trang, hien profile

import {
  EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { dbHelpers } from './db.js';
import { logger }    from '../utils/logger.js';

// ── Constants ─────────────────────────────────────────────────────
const PAGE_SIZE = 20; // so ket qua moi trang trong SelectMenu (max 25)

const JOB_ROLE_OPTIONS = [
  { label: 'Tất cả ngành', value: 'all',         emoji: '🔍' },
  { label: '3D Artist',    value: '3D',           emoji: '🎭' },
  { label: '2D Artist',    value: '2D',           emoji: '✏️' },
  { label: 'VFX',          value: 'VFX',          emoji: '✨' },
  { label: 'Code',         value: 'Code',         emoji: '💻' },
  { label: 'Photography',  value: 'Photography',  emoji: '📷' },
  { label: 'Editor',       value: 'Editor',       emoji: '🎬' },
  { label: 'Network',      value: 'Network',      emoji: '🌐' },
];

const GENDER_OPTIONS = [
  { label: 'Tất cả giới tính', value: 'all',  emoji: '👥' },
  { label: 'Nam',              value: 'Nam',  emoji: '👨' },
  { label: 'Nữ',               value: 'Nữ',   emoji: '👩' },
  { label: 'LGBT',             value: 'LGBT', emoji: '🏳️‍🌈' },
];

// ── Build embed chính của search panel ───────────────────────────
function buildSearchPanelEmbed(filters) {
  const jobLabel    = JOB_ROLE_OPTIONS.find(o => o.value === (filters.jobRole ?? 'all'))?.label ?? 'Tất cả';
  const genderLabel = GENDER_OPTIONS.find(o => o.value === (filters.gender  ?? 'all'))?.label ?? 'Tất cả';

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🔍 Tra Cứu Hồ Sơ Thành Viên')
    .setDescription(
      '> Chọn bộ lọc bên dưới rồi nhấn **Tìm kiếm**.\n' +
      '> Có thể để trống tất cả để xem toàn bộ hồ sơ.\n\n' +
      '**Bộ lọc hiện tại:**\n' +
      `• Ngành nghề : \`${jobLabel}\`\n` +
      `• Giới tính  : \`${genderLabel}\`\n` +
      `• Mã số      : \`${filters.memberCode || '—'}\`\n` +
      `• Tên Discord: \`${filters.username   || '—'}\`\n\n` +
      '*💡 Tìm tên: nhập một phần tên, không phân biệt hoa thường.*\n' +
      '*💡 Mã số: nhập VD `#0001` hoặc chỉ `1`.*'
    )
    .setFooter({ text: 'Liên Hiệp Quit • Chỉ bạn mới thấy panel này' })
    .setTimestamp();
}

// ── Build các components của search panel ─────────────────────────
function buildSearchPanelComponents(filters) {
  // Row 1: Select ngành nghề
  const jobSelect = new StringSelectMenuBuilder()
    .setCustomId('rp_filter_job')
    .setPlaceholder('🎯 Chọn ngành nghề...')
    .addOptions(JOB_ROLE_OPTIONS.map(o =>
      new StringSelectMenuOptionBuilder()
        .setLabel(o.label)
        .setValue(o.value)
        .setEmoji(o.emoji)
        .setDefault(o.value === (filters.jobRole ?? 'all'))
    ));

  // Row 2: Select giới tính
  const genderSelect = new StringSelectMenuBuilder()
    .setCustomId('rp_filter_gender')
    .setPlaceholder('👥 Chọn giới tính...')
    .addOptions(GENDER_OPTIONS.map(o =>
      new StringSelectMenuOptionBuilder()
        .setLabel(o.label)
        .setValue(o.value)
        .setEmoji(o.emoji)
        .setDefault(o.value === (filters.gender ?? 'all'))
    ));

  // Row 3: Nút tìm theo tên/mã + tìm kiếm + reset
  const btnSearch = new ButtonBuilder()
    .setCustomId('rp_open_search_modal')
    .setLabel('✏️ Nhập Mã / Tên')
    .setStyle(ButtonStyle.Secondary);

  const btnGo = new ButtonBuilder()
    .setCustomId('rp_do_search')
    .setLabel('🔍 Tìm kiếm')
    .setStyle(ButtonStyle.Primary);

  const btnReset = new ButtonBuilder()
    .setCustomId('rp_reset')
    .setLabel('🔄 Reset')
    .setStyle(ButtonStyle.Danger);

  return [
    new ActionRowBuilder().addComponents(jobSelect),
    new ActionRowBuilder().addComponents(genderSelect),
    new ActionRowBuilder().addComponents(btnSearch, btnGo, btnReset),
  ];
}

// ── Build embed profile đầy đủ ────────────────────────────────────
function buildProfileEmbed(profile) {
  const approvedDate = profile.approved_at
    ? new Date(profile.approved_at * 1000).toLocaleDateString('vi-VN')
    : 'N/A';

  return new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle(`📋 ${profile.member_code} — ${profile.username}`)
    .addFields(
      { name: '🆔 Mã số',       value: profile.member_code      || 'N/A', inline: true },
      { name: '👤 Giới tính',   value: profile.gender           || 'N/A', inline: true },
      { name: '🎯 Ngành nghề',  value: profile.job_role         || 'N/A', inline: true },
      { name: '📍 Khu vực',     value: profile.location         || 'N/A', inline: true },
      { name: '💼 Trạng thái',  value: profile.current_status   || 'N/A', inline: true },
      { name: '📅 Ngày duyệt',  value: approvedDate,                      inline: true },
      { name: '📝 Giới thiệu',  value: (profile.bio            || 'N/A').substring(0, 300) },
      { name: '🔧 Ngành / CV',  value: (profile.job_field      || 'N/A').substring(0, 200) },
      { name: '⚙️ Kỹ năng',    value: (profile.skills         || 'N/A').substring(0, 200) },
      { name: '💡 Đam mê',      value: (profile.interests      || '—').substring(0, 150),   inline: true },
      { name: '🎯 Định hướng',  value: (profile.direction      || '—').substring(0, 150),   inline: true },
      { name: '🔗 Liên kết',    value: [
          profile.facebook  ? `Facebook: ${profile.facebook}`   : null,
          profile.portfolio ? `Portfolio: ${profile.portfolio}` : null,
          profile.contact   ? `Liên lạc: ${profile.contact}`   : null,
        ].filter(Boolean).join('\n') || '—'
      },
    )
    .setFooter({ text: `Discord ID: ${profile.member_id} • Duyệt bởi ${profile.approved_by ?? 'N/A'}` })
    .setTimestamp();
}

// ── Build result list (SelectMenu) ───────────────────────────────
function buildResultComponents(results, page, totalPages, searchKey) {
  const start     = page * PAGE_SIZE;
  const pageItems = results.slice(start, start + PAGE_SIZE);

  const rows = [];

  // Chi build SelectMenu neu co items (tranh crash voi 0 options)
  if (pageItems.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`rp_select_profile:${searchKey}:${page}`)
      .setPlaceholder(`📂 Chọn hồ sơ để xem (${results.length} kết quả)`)
      .addOptions(pageItems.map(p =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${p.member_code} — ${p.username}`.substring(0, 100))
          .setDescription(`${p.job_role} • ${p.gender} • ${p.location || 'N/A'}`.substring(0, 100))
          .setValue(p.member_id)
      ));
    rows.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  // Pagination buttons nếu có nhiều hơn 1 trang
  if (totalPages > 1) {
    const btnPrev = new ButtonBuilder()
      .setCustomId(`rp_page:${page - 1}:${searchKey}`)
      .setLabel('◀ Trước')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0);

    const btnPageInfo = new ButtonBuilder()
      .setCustomId('rp_page_info')
      .setLabel(`Trang ${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const btnNext = new ButtonBuilder()
      .setCustomId(`rp_page:${page + 1}:${searchKey}`)
      .setLabel('Tiếp ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1);

    rows.push(new ActionRowBuilder().addComponents(btnPrev, btnPageInfo, btnNext));
  }

  // Nút quay lại tìm kiếm
  const btnBack = new ButtonBuilder()
    .setCustomId('rp_back_to_search')
    .setLabel('◀ Quay lại tìm kiếm')
    .setStyle(ButtonStyle.Danger);

  rows.push(new ActionRowBuilder().addComponents(btnBack));
  return rows;
}

// ── Session state (in-memory, reset khi bot restart) ─────────────
// Luu filter + ket qua search theo userId
// Bot restart -> mat session -> user can /read-panel lai (chap nhan duoc)
const _sessions = new Map();

function getSession(userId) {
  return _sessions.get(userId) ?? {
    jobRole:    'all',
    gender:     'all',
    memberCode: '',
    username:   '',
    results:    null,
    page:       0,
  };
}

function setSession(userId, data) {
  _sessions.set(userId, { ...getSession(userId), ...data });
}

// ── Export: Gui panel lan dau ─────────────────────────────────────
export async function sendReadPanel(interaction) {
  const userId = interaction.user.id;
  // Reset session khi mo panel moi
  _sessions.delete(userId);
  const session = getSession(userId);

  await interaction.reply({
    embeds:     [buildSearchPanelEmbed(session)],
    components: buildSearchPanelComponents(session),
    flags:      MessageFlags.Ephemeral,
  });
}

// ── Handler: Chon filter ngành nghề ──────────────────────────────
export async function handleRpFilterJob(interaction) {
  const userId  = interaction.user.id;
  const jobRole = interaction.values[0];
  setSession(userId, { jobRole, results: null, page: 0 });
  const session = getSession(userId);

  await interaction.update({
    embeds:     [buildSearchPanelEmbed(session)],
    components: buildSearchPanelComponents(session),
  });
}

// ── Handler: Chon filter gioi tinh ───────────────────────────────
export async function handleRpFilterGender(interaction) {
  const userId = interaction.user.id;
  const gender = interaction.values[0];
  setSession(userId, { gender, results: null, page: 0 });
  const session = getSession(userId);

  await interaction.update({
    embeds:     [buildSearchPanelEmbed(session)],
    components: buildSearchPanelComponents(session),
  });
}

// ── Handler: Mo modal nhap ma so / ten ───────────────────────────
export async function handleRpOpenSearchModal(interaction) {
  const session = getSession(interaction.user.id);

  const modal = new ModalBuilder()
    .setCustomId('rp_search_modal')
    .setTitle('🔍 Tìm kiếm theo Mã số / Tên');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('rp_input_code')
        .setLabel('Mã số thành viên (VD: #0001 hoặc 1)')
        .setStyle(TextInputStyle.Short)
        .setValue(session.memberCode || '')
        .setRequired(false)
        .setMaxLength(10),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('rp_input_name')
        .setLabel('Tên Discord (nhập một phần, VD: "nam")')
        .setStyle(TextInputStyle.Short)
        .setValue(session.username || '')
        .setRequired(false)
        .setMaxLength(50),
    ),
  );

  await interaction.showModal(modal);
}

// ── Handler: Submit modal nhap ma / ten ──────────────────────────
export async function handleRpSearchModalSubmit(interaction) {
  const userId     = interaction.user.id;
  const memberCode = interaction.fields.getTextInputValue('rp_input_code').trim();
  const username   = interaction.fields.getTextInputValue('rp_input_name').trim();

  setSession(userId, { memberCode, username, results: null, page: 0 });

  // Sau khi submit modal -> tu dong thuc hien search luon
  await _doSearch(interaction, userId, true);
}

// ── Handler: Bam nut Tim kiem ─────────────────────────────────────
export async function handleRpDoSearch(interaction) {
  await _doSearch(interaction, interaction.user.id, false);
}

// ── Internal: Thuc hien search + hien ket qua ────────────────────
async function _doSearch(interaction, userId, isModalSubmit) {
  const session = getSession(userId);

  await (isModalSubmit ? interaction.deferReply({ flags: MessageFlags.Ephemeral }) : interaction.deferUpdate());

  let results;
  try {
    results = await dbHelpers.searchApprovedProfiles({
      jobRole:    session.jobRole,
      gender:     session.gender,
      memberCode: session.memberCode,
      username:   session.username,
    });
  } catch (err) {
    logger.error('[ReadPanel] Loi search:', err);
    const isAuthErr = err.code === 16;
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('❌ Lỗi kết nối Database')
        .setDescription(
          isAuthErr
            ? '⚠️ Firebase credential không hợp lệ.\nAdmin kiểm tra lại `FIREBASE_PRIVATE_KEY` trên Render.'
            : '❌ Không thể kết nối database. Vui lòng thử lại sau vài giây.'
        )
      ],
      components: [],
    });
    return;
  }

  setSession(userId, { results, page: 0 });

  // 0 ket qua
  if (results.length === 0) {
    const btnBack = new ButtonBuilder()
      .setCustomId('rp_back_to_search')
      .setLabel('◀ Quay lại tìm kiếm')
      .setStyle(ButtonStyle.Secondary);

    if (isModalSubmit) {
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('❌ Không tìm thấy kết quả')
          .setDescription('Không có hồ sơ nào khớp với bộ lọc hiện tại.\nThử điều chỉnh lại bộ lọc hoặc để trống.')
          .setFooter({ text: 'Liên Hiệp Quit • Tra cứu hồ sơ' })
        ],
        components: [new ActionRowBuilder().addComponents(btnBack)],
      });
    } else {
      await interaction.editReply({
        embeds: [buildSearchPanelEmbed(session),
          new EmbedBuilder().setColor(0xED4245).setDescription('❌ Không tìm thấy hồ sơ nào phù hợp.')
        ],
        components: buildSearchPanelComponents(session),
      });
    }
    return;
  }

  // 1 ket qua -> hien profile ngay
  if (results.length === 1) {
    const btnBack = new ButtonBuilder()
      .setCustomId('rp_back_to_search')
      .setLabel('◀ Quay lại tìm kiếm')
      .setStyle(ButtonStyle.Secondary);

    await interaction.editReply({
      embeds:     [buildProfileEmbed(results[0])],
      components: [new ActionRowBuilder().addComponents(btnBack)],
    });
    return;
  }

  // Nhieu ket qua -> hien SelectMenu + phan trang
  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  // searchKey: dung de embed vao customId cho pagination
  const searchKey  = `${userId}_${Date.now()}`;
  setSession(userId, { searchKey });

  const resultEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🔍 Tìm thấy ${results.length} hồ sơ`)
    .setDescription('Chọn một hồ sơ từ danh sách bên dưới để xem chi tiết.')
    .setFooter({ text: `Trang 1/${totalPages} • Liên Hiệp Quit` });

  await interaction.editReply({
    embeds:     [resultEmbed],
    components: buildResultComponents(results, 0, totalPages, searchKey),
  });
}

// ── Handler: Chon profile tu SelectMenu ──────────────────────────
export async function handleRpSelectProfile(interaction) {
  const userId    = interaction.user.id;
  const targetId  = interaction.values[0];
  const session   = getSession(userId);
  const results   = session.results ?? [];

  await interaction.deferUpdate();

  let profile = results.find(p => p.member_id === targetId);
  if (!profile) {
    // Fallback: lay tu Firestore neu session het han
    profile = await dbHelpers.getApprovedProfile(targetId);
  }

  if (!profile) {
    await interaction.editReply({
      content: '❌ Không tìm thấy hồ sơ. Vui lòng thử lại.',
      embeds: [], components: [],
    });
    return;
  }

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const btnBack = new ButtonBuilder()
    .setCustomId('rp_back_to_results')
    .setLabel('◀ Quay lại danh sách')
    .setStyle(ButtonStyle.Secondary);

  const btnBackSearch = new ButtonBuilder()
    .setCustomId('rp_back_to_search')
    .setLabel('🔍 Tìm kiếm mới')
    .setStyle(ButtonStyle.Danger);

  await interaction.editReply({
    embeds:     [buildProfileEmbed(profile)],
    components: [new ActionRowBuilder().addComponents(btnBack, btnBackSearch)],
  });
}

// ── Handler: Phan trang ───────────────────────────────────────────
export async function handleRpPage(interaction, searchKey, page) {
  const userId  = interaction.user.id;
  const session = getSession(userId);
  const results = session.results ?? [];

  await interaction.deferUpdate();

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const safePage   = Math.max(0, Math.min(page, totalPages - 1));
  setSession(userId, { page: safePage });

  const resultEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🔍 Tìm thấy ${results.length} hồ sơ`)
    .setDescription('Chọn một hồ sơ từ danh sách bên dưới để xem chi tiết.')
    .setFooter({ text: `Trang ${safePage + 1}/${totalPages} • Liên Hiệp Quit` });

  await interaction.editReply({
    embeds:     [resultEmbed],
    components: buildResultComponents(results, safePage, totalPages, searchKey),
  });
}

// ── Handler: Quay lai danh sach ket qua ──────────────────────────
export async function handleRpBackToResults(interaction) {
  const userId  = interaction.user.id;
  const session = getSession(userId);
  const results = session.results ?? [];

  await interaction.deferUpdate();

  if (!results.length) {
    // Neu session het -> quay ve panel chinh
    await interaction.editReply({
      embeds:     [buildSearchPanelEmbed(session)],
      components: buildSearchPanelComponents(session),
    });
    return;
  }

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const page       = session.page ?? 0;
  const searchKey  = session.searchKey ?? `${userId}_0`;

  const resultEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🔍 Tìm thấy ${results.length} hồ sơ`)
    .setDescription('Chọn một hồ sơ từ danh sách bên dưới để xem chi tiết.')
    .setFooter({ text: `Trang ${page + 1}/${totalPages} • Liên Hiệp Quit` });

  await interaction.editReply({
    embeds:     [resultEmbed],
    components: buildResultComponents(results, page, totalPages, searchKey),
  });
}

// ── Handler: Quay lai search panel ───────────────────────────────
export async function handleRpBackToSearch(interaction) {
  const userId  = interaction.user.id;
  const session = getSession(userId);
  // Giu lai filter, xoa ket qua cu
  setSession(userId, { results: null, page: 0 });

  await interaction.update({
    embeds:     [buildSearchPanelEmbed(session)],
    components: buildSearchPanelComponents(session),
  });
}

// ── Handler: Reset toan bo ────────────────────────────────────────
export async function handleRpReset(interaction) {
  const userId = interaction.user.id;
  _sessions.delete(userId);
  const session = getSession(userId);

  await interaction.update({
    embeds:     [buildSearchPanelEmbed(session)],
    components: buildSearchPanelComponents(session),
  });
}
