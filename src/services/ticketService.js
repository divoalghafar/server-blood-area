const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { sendLog } = require('./loggingService');
const { buildTicketClosedLog, buildTicketCreatedLog } = require('./logEmbedBuilder');

const TICKET_CATEGORY_NAME = 'TICKETS';
const TICKET_CHANNEL_NAME = 'submit-report';
const TICKET_PREFIX = 'ticket-';

const TICKET_BUTTON_IDS = {
  open: 'ticket_open',
  close: 'ticket_close',
  confirmClose: 'ticket_confirm_close',
  cancelClose: 'ticket_cancel_close'
};

function buildTicketPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Support Ticket')
    .setDescription('Butuh bantuan?\n\nKlik tombol di bawah untuk membuat ticket pribadi.')
    .setTimestamp();
}

function buildTicketCreatedEmbed() {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🎫 Ticket Dibuat')
    .setDescription('Silakan jelaskan masalahmu.')
    .setTimestamp();
}

function buildCloseConfirmEmbed() {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('⚠️ Apakah kamu yakin ingin menutup ticket?')
    .setDescription('Pilih tombol di bawah untuk melanjutkan atau membatalkan.')
    .setTimestamp();
}

function buildTicketPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(TICKET_BUTTON_IDS.open)
        .setLabel('Open Ticket')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function buildCloseTicketComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(TICKET_BUTTON_IDS.close)
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function buildCloseConfirmComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(TICKET_BUTTON_IDS.confirmClose)
        .setLabel('Ya Tutup')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(TICKET_BUTTON_IDS.cancelClose)
        .setLabel('Batal')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function findTicketCategory(guild) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === TICKET_CATEGORY_NAME
  );
}

function findSubmitReportChannel(guild) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === TICKET_CHANNEL_NAME
  );
}

function getTicketOwnerId(channel) {
  if (!channel?.topic) return null;

  const match = channel.topic.match(/^ticket-owner:(\d+)$/);
  return match ? match[1] : null;
}

function isTicketChannel(channel) {
  return Boolean(channel?.name?.startsWith(TICKET_PREFIX) && getTicketOwnerId(channel));
}

function normalizeTicketChannelName(username) {
  const sanitized = username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${TICKET_PREFIX}${sanitized || 'user'}`;
}

async function findActiveTicketChannel(guild, userId) {
  await guild.channels.fetch();

  return guild.channels.cache.find((channel) => {
    if (channel.type !== ChannelType.GuildText) return false;
    if (!channel.parentId || channel.parent?.name !== TICKET_CATEGORY_NAME) return false;
    return getTicketOwnerId(channel) === userId;
  });
}

async function createTicketChannel(guild, member) {
  const ticketCategory = findTicketCategory(guild);

  if (!ticketCategory) {
    return { error: 'Kategori TICKETS tidak ditemukan.' };
  }

  const activeTicket = await findActiveTicketChannel(guild, member.id);
  if (activeTicket) {
    return { error: 'Kamu masih memiliki ticket aktif.' };
  }

  const baseName = normalizeTicketChannelName(member.user.username);
  const channelName = await resolveUniqueTicketChannelName(guild, baseName);
  const botMember = guild.members.me ?? await guild.members.fetch(guild.client.user.id);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: ticketCategory.id,
    topic: `ticket-owner:${member.id}`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      {
        id: botMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ]
  });

  await sendLog(guild, {
    event: 'ticket_created',
    userId: member.id,
    embed: buildTicketCreatedLog(member, channel.name)
  }).catch(() => null);

  return { channel };
}

async function resolveUniqueTicketChannelName(guild, baseName) {
  await guild.channels.fetch();

  const existingNames = new Set(
    guild.channels.cache
      .filter((channel) => channel.type === ChannelType.GuildText)
      .map((channel) => channel.name)
  );

  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let index = 2;
  while (existingNames.has(`${baseName}-${index}`)) {
    index += 1;
  }

  return `${baseName}-${index}`;
}

async function sendTicketPanelToChannel(channel) {
  return channel.send({
    embeds: [buildTicketPanelEmbed()],
    components: buildTicketPanelComponents()
  });
}

async function handleOpenTicket(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;

  if (!guild || !member) {
    await interaction.reply({
      content: 'Ticket hanya bisa dibuat di server.',
      ephemeral: true
    });
    return;
  }

  const result = await createTicketChannel(guild, member);

  if (result.error) {
    await interaction.reply({
      content: result.error,
      ephemeral: true
    });
    return;
  }

  const ticketChannel = result.channel;

  await ticketChannel.send({
    embeds: [buildTicketCreatedEmbed()],
    components: buildCloseTicketComponents()
  });

  await interaction.reply({
    content: `Ticket kamu berhasil dibuat: ${ticketChannel}`,
    ephemeral: true
  });
}

async function handleCloseTicket(interaction) {
  const ticketOwnerId = getTicketOwnerId(interaction.channel);

  if (!ticketOwnerId) {
    await interaction.reply({
      content: 'Channel ini bukan channel ticket yang valid.',
      ephemeral: true
    });
    return;
  }

  if (!canManageTicket(interaction.member, ticketOwnerId)) {
    await interaction.reply({
      content: 'Kamu tidak punya izin untuk menutup ticket ini.',
      ephemeral: true
    });
    return;
  }

  await interaction.reply({
    embeds: [buildCloseConfirmEmbed()],
    components: buildCloseConfirmComponents(),
    ephemeral: true
  });
}

async function handleConfirmClose(interaction) {
  const ticketOwnerId = getTicketOwnerId(interaction.channel);

  if (!ticketOwnerId) {
    await interaction.reply({
      content: 'Channel ini bukan channel ticket yang valid.',
      ephemeral: true
    });
    return;
  }

  if (!canManageTicket(interaction.member, ticketOwnerId)) {
    await interaction.reply({
      content: 'Kamu tidak punya izin untuk menutup ticket ini.',
      ephemeral: true
    });
    return;
  }

  await interaction.channel.send('Ticket akan ditutup dalam 5 detik');

  await sendLog(interaction.guild, {
    event: 'ticket_closed',
    userId: interaction.user.id,
    embed: buildTicketClosedLog(interaction.member, interaction.channel.name)
  }).catch(() => null);

  await interaction.update({
    content: 'Ticket sedang diproses untuk ditutup.',
    embeds: [],
    components: []
  });

  setTimeout(async () => {
    try {
      await interaction.channel.delete('Ticket closed by user confirmation');
    } catch (error) {
      console.error('Gagal menghapus channel ticket:', error);
    }
  }, 5000);
}

async function handleCancelClose(interaction) {
  await interaction.update({
    content: 'Penutupan ticket dibatalkan.',
    embeds: [],
    components: []
  });
}

function canManageTicket(member, ticketOwnerId) {
  if (!member) return false;
  if (member.id === ticketOwnerId) return true;

  const permissions = member.permissions;
  return permissions?.has(PermissionFlagsBits.Administrator) || permissions?.has(PermissionFlagsBits.ManageChannels);
}

module.exports = {
  TICKET_BUTTON_IDS,
  buildTicketCreatedEmbed,
  buildTicketPanelComponents,
  buildTicketPanelEmbed,
  buildCloseConfirmComponents,
  buildCloseConfirmEmbed,
  buildCloseTicketComponents,
  createTicketChannel,
  findSubmitReportChannel,
  findTicketCategory,
  getTicketOwnerId,
  handleCancelClose,
  handleCloseTicket,
  handleConfirmClose,
  handleOpenTicket,
  isTicketChannel,
  sendTicketPanelToChannel
};
