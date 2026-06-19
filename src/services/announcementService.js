const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { ChannelType, EmbedBuilder } = require('discord.js');
const { sendLog } = require('./loggingService');
const { buildAnnouncementCreatedLog } = require('./logEmbedBuilder');

const DATA_DIR = path.join(process.cwd(), 'data');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json');
const ANNOUNCE_CHANNEL_NAME = 'announce';

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(ANNOUNCEMENTS_FILE);
  } catch {
    await fs.writeFile(ANNOUNCEMENTS_FILE, '[]\n', 'utf8');
  }
}

async function readAnnouncements() {
  await ensureStorage();

  const raw = await fs.readFile(ANNOUNCEMENTS_FILE, 'utf8');

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

async function writeAnnouncements(announcements) {
  await ensureStorage();
  await fs.writeFile(ANNOUNCEMENTS_FILE, `${JSON.stringify(announcements, null, 2)}\n`, 'utf8');
}

function findAnnounceChannel(guild) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === ANNOUNCE_CHANNEL_NAME
  );
}

async function findAnnounceChannelAsync(guild) {
  await guild.channels.fetch();
  return findAnnounceChannel(guild);
}

function createAnnouncementRecord({ title, message, createdBy }) {
  return {
    id: randomUUID(),
    title,
    message,
    createdBy,
    createdAt: new Date().toISOString()
  };
}

async function saveAnnouncement(payload) {
  const announcements = await readAnnouncements();
  const announcement = createAnnouncementRecord(payload);

  announcements.push(announcement);
  await writeAnnouncements(announcements);

  return announcement;
}

async function logAnnouncementCreated(guild, announcement) {
  await sendLog(guild, {
    event: 'announcement_created',
    userId: announcement.createdBy,
    embed: buildAnnouncementCreatedLog(announcement)
  }).catch(() => null);
}

async function getAnnouncementById(id) {
  const announcements = await readAnnouncements();
  return announcements.find((item) => item.id === id) || null;
}

async function getLatestAnnouncements(limit = 10) {
  const announcements = await readAnnouncements();
  return announcements.slice(-limit).reverse();
}

function buildAnnouncementEmbed(announcement, imageUrl = null) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(announcement.title)
    .setDescription(announcement.message)
    .setFooter({ text: 'Divo Community' })
    .setTimestamp(new Date(announcement.createdAt));

  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  return embed;
}

function buildAnnouncementListEmbed(announcements) {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('Announcement List')
    .setDescription(announcements.length > 0 ? '10 pengumuman terakhir.' : 'Belum ada announcement.')
    .setTimestamp();

  if (announcements.length > 0) {
    embed.addFields(
      announcements.map((item) => ({
        name: item.title,
        value: `ID: \`${item.id}\`\n${truncate(item.message, 120)}\n${new Date(item.createdAt).toLocaleString('id-ID')}`
      }))
    );
  }

  return embed;
}

function buildAnnouncementDetailEmbed(announcement) {
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('Announcement Detail')
    .addFields(
      { name: 'ID', value: announcement.id, inline: false },
      { name: 'Title', value: announcement.title, inline: false },
      { name: 'Message', value: announcement.message, inline: false },
      { name: 'Created By', value: announcement.createdBy, inline: true },
      { name: 'Created At', value: new Date(announcement.createdAt).toLocaleString('id-ID'), inline: true }
    )
    .setTimestamp();
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

module.exports = {
  ANNOUNCE_CHANNEL_NAME,
  ANNOUNCEMENTS_FILE,
  buildAnnouncementDetailEmbed,
  buildAnnouncementEmbed,
  buildAnnouncementListEmbed,
  findAnnounceChannelAsync,
  getAnnouncementById,
  getLatestAnnouncements,
  saveAnnouncement,
  logAnnouncementCreated,
  readAnnouncements,
  writeAnnouncements
};
