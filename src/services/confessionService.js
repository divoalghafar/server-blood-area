const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
const { sendLog } = require('./loggingService');
const { buildConfessionCreatedLog } = require('./logEmbedBuilder');

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFESSIONS_FILE = path.join(DATA_DIR, 'confessions.json');

const CONFESSION_CHANNEL_NAME = 'confession';
const CONFESSION_REVIEW_CHANNEL_NAME = 'acc-confession';

const CONFESSION_PANEL_BUTTON_IDS = {
  submit: 'confession_panel_submit',
  reply: 'confession_panel_reply'
};

const CONFESSION_MODAL_IDS = {
  submit: 'confession_submit_modal',
  reply: 'confession_reply_modal'
};

const CONFESSION_REVIEW_BUTTON_IDS = {
  approve: 'confession_review_approve',
  deny: 'confession_review_deny',
  denyReason: 'confession_review_deny_reason',
  denyConfessban: 'confession_review_deny_confessban',
  denyReport: 'confession_review_deny_report'
};

const CONFESSION_DENY_REASON_MODAL_ID = 'confession_deny_reason_modal';

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(CONFESSIONS_FILE);
  } catch {
    await fs.writeFile(CONFESSIONS_FILE, '[]\n', 'utf8');
  }
}

async function readConfessions() {
  await ensureStorage();

  const raw = await fs.readFile(CONFESSIONS_FILE, 'utf8');

  if (!raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeConfessions(confessions) {
  await ensureStorage();
  await fs.writeFile(CONFESSIONS_FILE, `${JSON.stringify(confessions, null, 2)}\n`, 'utf8');
}

async function createConfessionRecord({ authorId, submissionType, title, message, targetUsername }) {
  return {
    id: randomUUID(),
    authorId,
    submissionType,
    title: title || '',
    message,
    targetUsername: targetUsername || null,
    status: 'pending',
    reviewReason: null,
    reviewedBy: null,
    reviewedAt: null,
    publicMessageId: null,
    reviewMessageId: null,
    createdAt: new Date().toISOString()
  };
}

async function saveConfession(payload) {
  const confessions = await readConfessions();
  const confession = await createConfessionRecord(payload);

  confessions.push(confession);
  await writeConfessions(confessions);

  return confession;
}

async function getConfessionById(id) {
  const confessions = await readConfessions();
  return confessions.find((confession) => confession.id === id) || null;
}

async function updateConfessionById(id, patch) {
  const confessions = await readConfessions();
  const index = confessions.findIndex((confession) => confession.id === id);

  if (index === -1) {
    return null;
  }

  confessions[index] = {
    ...confessions[index],
    ...patch
  };

  await writeConfessions(confessions);
  return confessions[index];
}

function findTextChannelByName(guild, channelName) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === channelName
  );
}

async function fetchTextChannelByName(guild, channelName) {
  await guild.channels.fetch();
  return findTextChannelByName(guild, channelName);
}

async function findConfessionChannelAsync(guild) {
  return fetchTextChannelByName(guild, CONFESSION_CHANNEL_NAME);
}

async function findConfessionReviewChannelAsync(guild) {
  return fetchTextChannelByName(guild, CONFESSION_REVIEW_CHANNEL_NAME);
}

function buildConfessionPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📣 Confession Panel')
    .setDescription('Klik tombol di bawah untuk mengirim confession anonim atau membalas confession lain.')
    .setTimestamp();
}

function buildConfessionPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CONFESSION_PANEL_BUTTON_IDS.submit)
        .setLabel('Submit')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CONFESSION_PANEL_BUTTON_IDS.reply)
        .setLabel('Reply')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function buildConfessionReviewEmbed(confession) {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`Confession Awaiting Review (#${shortId(confession.id)})`)
    .addFields(
      { name: 'Type', value: confession.submissionType === 'reply' ? 'Reply' : 'Submit', inline: true },
      { name: 'Status', value: confession.status, inline: true },
      { name: 'Pesan', value: confession.message, inline: false }
    )
    .setTimestamp(new Date(confession.createdAt));

  if (confession.targetUsername) {
    embed.addFields({ name: 'Tag Username Discord', value: confession.targetUsername });
  }

  return embed;
}

function buildConfessionPublicEmbed(confession) {
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`Confession (#${shortId(confession.id)})`)
    .addFields({ name: 'Pesan', value: confession.message, inline: false })
    .setFooter({ text: 'Anonim' })
    .setTimestamp(new Date(confession.createdAt));

  if (confession.targetUsername) {
    embed.addFields({ name: 'Tag Username Discord', value: confession.targetUsername });
  }

  return embed;
}

function buildConfessionPublicComponents() {
  return buildConfessionPanelComponents();
}

function buildConfessionInfoEmbed(confession) {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('Confession Info')
    .addFields(
      { name: 'ID', value: confession.id, inline: false },
      { name: 'Author ID', value: confession.authorId, inline: false },
      { name: 'Type', value: confession.submissionType || '-', inline: true },
      { name: 'Status', value: confession.status || '-', inline: true },
      { name: 'Tanggal', value: new Date(confession.createdAt).toLocaleString('id-ID'), inline: false }
    )
    .setTimestamp();

  if (confession.reviewedBy) {
    embed.addFields({ name: 'Reviewed By', value: confession.reviewedBy, inline: false });
  }

  if (confession.reviewedAt) {
    embed.addFields({ name: 'Reviewed At', value: new Date(confession.reviewedAt).toLocaleString('id-ID'), inline: false });
  }

  if (confession.targetUsername) {
    embed.addFields({ name: 'Tag Username Discord', value: confession.targetUsername });
  }

  if (confession.reviewReason) {
    embed.addFields({ name: 'Alasan', value: confession.reviewReason });
  }

  return embed;
}

function buildReviewActionComponents(confessionId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CONFESSION_REVIEW_BUTTON_IDS.approve}:${confessionId}`)
        .setLabel('Approve')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${CONFESSION_REVIEW_BUTTON_IDS.deny}:${confessionId}`)
        .setLabel('Deny')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${CONFESSION_REVIEW_BUTTON_IDS.denyReason}:${confessionId}`)
        .setLabel('Deny with reason')
        .setEmoji('💬')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${CONFESSION_REVIEW_BUTTON_IDS.denyConfessban}:${confessionId}`)
        .setLabel('Deny & confessban')
        .setEmoji('🛠️')
        .setStyle(ButtonStyle.Danger)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CONFESSION_REVIEW_BUTTON_IDS.denyReport}:${confessionId}`)
        .setLabel('Deny & report')
        .setEmoji('⚠️')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function buildDisabledReviewComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confession_review_done')
        .setLabel('Closed')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    )
  ];
}

async function sendConfessionPanel(channel) {
  return channel.send({
    embeds: [buildConfessionPanelEmbed()],
    components: buildConfessionPanelComponents()
  });
}

async function sendConfessionForReview(channel, confession) {
  const message = await channel.send({
    embeds: [buildConfessionReviewEmbed(confession)],
    components: buildReviewActionComponents(confession.id)
  });

  await updateConfessionById(confession.id, { reviewMessageId: message.id });

  return message;
}

async function approveConfession(guild, confessionId, reviewerId = null) {
  const confession = await getConfessionById(confessionId);

  if (!confession) {
    return { error: 'Confession tidak ditemukan.' };
  }

  const publicChannel = await findConfessionChannelAsync(guild);
  if (!publicChannel) {
    return { error: 'Channel #confession tidak ditemukan.' };
  }

  const approvedMessage = await publicChannel.send({
    embeds: [buildConfessionPublicEmbed(confession)],
    components: buildConfessionPublicComponents()
  });

  await sendLog(guild, {
    event: 'confession_created',
    userId: confession.authorId,
    embed: buildConfessionCreatedLog(confession)
  }).catch(() => null);

  const updated = await updateConfessionById(confessionId, {
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerId,
    publicMessageId: approvedMessage.id
  });

  return { confession: updated, approvedMessage };
}

async function denyConfession(confessionId, reason = null, reviewerId = null) {
  const updated = await updateConfessionById(confessionId, {
    status: 'denied',
    reviewReason: reason,
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString()
  });

  return updated;
}

async function denyConfessionWithAction(confessionId, status, reason = null, reviewerId = null) {
  const updated = await updateConfessionById(confessionId, {
    status,
    reviewReason: reason,
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString()
  });

  return updated;
}

async function disableReviewMessage(interaction, text) {
  await interaction.update({
    content: text,
    embeds: [],
    components: buildDisabledReviewComponents()
  });
}

async function editReviewMessageByConfessionId(guild, confessionId, text) {
  const confession = await getConfessionById(confessionId);

  if (!confession?.reviewMessageId) {
    return null;
  }

  const reviewChannel = await findConfessionReviewChannelAsync(guild);
  if (!reviewChannel) {
    return null;
  }

  const reviewMessage = await reviewChannel.messages.fetch(confession.reviewMessageId);
  await reviewMessage.edit({
    content: text,
    embeds: [],
    components: buildDisabledReviewComponents()
  });

  return reviewMessage;
}

function buildDenyReasonModal(confessionId) {
  const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

  return new ModalBuilder()
    .setCustomId(`${CONFESSION_DENY_REASON_MODAL_ID}:${confessionId}`)
    .setTitle('Deny with reason')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Alasan penolakan')
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(3)
          .setMaxLength(500)
          .setRequired(true)
      )
    );
}

function shortId(id) {
  return id.slice(0, 8);
}

module.exports = {
  CONFESSION_CHANNEL_NAME,
  CONFESSION_MODAL_IDS,
  CONFESSION_PANEL_BUTTON_IDS,
  CONFESSION_REVIEW_BUTTON_IDS,
  CONFESSION_DENY_REASON_MODAL_ID,
  CONFESSION_REVIEW_CHANNEL_NAME,
  CONFESSIONS_FILE,
  approveConfession,
  buildConfessionInfoEmbed,
  buildConfessionPanelComponents,
  buildConfessionPanelEmbed,
  buildConfessionPublicComponents,
  buildConfessionPublicEmbed,
  buildDenyReasonModal,
  buildConfessionReviewEmbed,
  buildDisabledReviewComponents,
  buildReviewActionComponents,
  denyConfession,
  denyConfessionWithAction,
  disableReviewMessage,
  editReviewMessageByConfessionId,
  fetchTextChannelByName,
  findConfessionChannelAsync,
  findConfessionReviewChannelAsync,
  getConfessionById,
  readConfessions,
  saveConfession,
  sendConfessionForReview,
  sendConfessionPanel,
  updateConfessionById,
  writeConfessions
};
