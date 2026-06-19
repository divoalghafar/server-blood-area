const fs = require('node:fs/promises');
const path = require('node:path');
const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const DATA_DIR = path.join(process.cwd(), 'data');
const BOOSTERS_FILE = path.join(DATA_DIR, 'boosters.json');
const BOOSTER_CHANNEL_NAME = 'booster';
const BOOSTER_ROLE_NAME = 'Booster';

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(BOOSTERS_FILE);
  } catch {
    await fs.writeFile(BOOSTERS_FILE, '[]\n', 'utf8');
  }
}

async function readBoosters() {
  await ensureStorage();

  const raw = await fs.readFile(BOOSTERS_FILE, 'utf8');
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeBoosters(boosters) {
  await ensureStorage();
  await fs.writeFile(BOOSTERS_FILE, `${JSON.stringify(boosters, null, 2)}\n`, 'utf8');
}

function findBoosterChannel(guild) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === BOOSTER_CHANNEL_NAME
  );
}

async function ensureBoosterChannel(guild) {
  await guild.channels.fetch();

  const existing = findBoosterChannel(guild);
  if (existing) return existing;

  return guild.channels.create({
    name: BOOSTER_CHANNEL_NAME,
    type: ChannelType.GuildText
  });
}

function findBoosterRole(guild) {
  return guild.roles.cache.find((role) => role.name === BOOSTER_ROLE_NAME);
}

async function ensureBoosterRole(guild) {
  const existing = findBoosterRole(guild);
  if (existing) return existing;

  return guild.roles.create({
    name: BOOSTER_ROLE_NAME,
    reason: 'Auto create booster role'
  });
}

async function upsertBoosterRecord(userId, boostedAt = new Date().toISOString(), active = true) {
  const boosters = await readBoosters();
  const index = boosters.findIndex((item) => item.userId === userId);

  const record = {
    userId,
    boostedAt,
    active
  };

  if (index === -1) {
    boosters.push(record);
  } else {
    boosters[index] = {
      ...boosters[index],
      ...record
    };
  }

  await writeBoosters(boosters);
  return record;
}

async function setBoosterInactive(userId, endedAt = new Date().toISOString()) {
  const boosters = await readBoosters();
  const index = boosters.findIndex((item) => item.userId === userId);

  if (index === -1) {
    const record = {
      userId,
      boostedAt: endedAt,
      active: false,
      endedAt
    };
    boosters.push(record);
    await writeBoosters(boosters);
    return record;
  }

  boosters[index] = {
    ...boosters[index],
    active: false,
    endedAt
  };

  await writeBoosters(boosters);
  return boosters[index];
}

async function getActiveBoosters() {
  const boosters = await readBoosters();
  return boosters
    .filter((item) => item.active)
    .sort((a, b) => new Date(b.boostedAt || 0) - new Date(a.boostedAt || 0));
}

async function getBoosterByUserId(userId) {
  const boosters = await readBoosters();
  return boosters.find((item) => item.userId === userId) || null;
}

function buildBoosterJoinEmbed(member) {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('🚀 Booster Baru')
    .setDescription(`Terima kasih kepada:\n\n${member}\n\nkarena telah melakukan Server Boost.`)
    .setTimestamp();
}

function buildBoosterLeaveEmbed(member) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle('⚠️ Boost Dicabut')
    .setDescription(`${member} sudah tidak melakukan Server Boost.`)
    .setTimestamp();
}

function buildBoosterListEmbed(boosters, guild) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Booster Aktif')
    .setTimestamp();

  if (boosters.length === 0) {
    embed.setDescription('Belum ada booster aktif.');
    return embed;
  }

  embed.setDescription('Daftar seluruh booster aktif saat ini.');
  embed.addFields(
    boosters.map((booster) => ({
      name: formatBoosterListName(booster, guild),
      value: formatBoosterListValue(booster, guild),
      inline: false
    }))
  );

  return embed;
}

function buildBoosterInfoEmbed(booster, member) {
  const boostedAt = booster?.boostedAt ? new Date(booster.boostedAt) : null;
  const endedAt = booster?.endedAt ? new Date(booster.endedAt) : null;
  const now = new Date();
  const duration = booster?.active && boostedAt ? formatDuration(now - boostedAt) : boostedAt && endedAt ? formatDuration(endedAt - boostedAt) : '-';

  return new EmbedBuilder()
    .setColor(booster?.active ? 0x57f287 : 0xed4245)
    .setTitle('Booster Info')
    .addFields(
      { name: 'User', value: member ? `${member.user.tag} (${member.id})` : booster?.userId || '-', inline: false },
      { name: 'Status Boost', value: booster?.active ? 'Aktif' : 'Tidak aktif', inline: true },
      { name: 'Tanggal Boost', value: boostedAt ? boostedAt.toLocaleString('id-ID') : '-', inline: true },
      { name: 'Lama Boost', value: duration, inline: false }
    )
    .setTimestamp();
}

function formatBoosterListValue(booster, guild) {
  const member = guild.members.cache.get(booster.userId);
  const label = member ? `${member.user.tag} (${member.id})` : booster.userId;
  const boostedAt = booster.boostedAt ? new Date(booster.boostedAt).toLocaleString('id-ID') : '-';
  return `Status: ${booster.active ? 'Aktif' : 'Tidak aktif'}\nBoosted At: ${boostedAt}\nUser: ${label}`;
}

function formatBoosterListName(booster, guild) {
  const member = guild.members.cache.get(booster.userId);
  return member ? `${member.displayName} (${member.id})` : booster.userId;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '-';

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(' ') : '0m';
}

module.exports = {
  BOOSTER_CHANNEL_NAME,
  BOOSTER_ROLE_NAME,
  BOOSTERS_FILE,
  buildBoosterInfoEmbed,
  buildBoosterJoinEmbed,
  buildBoosterLeaveEmbed,
  buildBoosterListEmbed,
  ensureBoosterChannel,
  ensureBoosterRole,
  findBoosterChannel,
  findBoosterRole,
  getActiveBoosters,
  getBoosterByUserId,
  readBoosters,
  setBoosterInactive,
  upsertBoosterRecord,
  writeBoosters
};
