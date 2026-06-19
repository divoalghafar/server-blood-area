const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { ChannelType, EmbedBuilder } = require('discord.js');

const DATA_DIR = path.join(process.cwd(), 'data');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const LOG_CHANNEL_NAME = 'logs';

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(LOGS_FILE);
  } catch {
    await fs.writeFile(LOGS_FILE, '[]\n', 'utf8');
  }
}

async function readLogs() {
  await ensureStorage();

  const raw = await fs.readFile(LOGS_FILE, 'utf8');
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLogs(logs) {
  await ensureStorage();
  await fs.writeFile(LOGS_FILE, `${JSON.stringify(logs, null, 2)}\n`, 'utf8');
}

async function appendLog(entry) {
  const logs = await readLogs();
  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  };

  logs.push(record);
  await writeLogs(logs);
  return record;
}

function buildLogEmbed({ title, color, fields = [], description = null, timestamp = new Date() }) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setTimestamp(timestamp instanceof Date ? timestamp : new Date(timestamp));

  if (description) {
    embed.setDescription(description);
  }

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}

function findLogsChannel(guild) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === LOG_CHANNEL_NAME
  );
}

async function ensureLogsChannel(guild) {
  await guild.channels.fetch();

  const existing = findLogsChannel(guild);
  if (existing) return existing;

  return guild.channels.create({
    name: LOG_CHANNEL_NAME,
    type: ChannelType.GuildText
  });
}

async function sendLog(guild, payload) {
  const channel = await ensureLogsChannel(guild);
  const embed = payload.embed || buildLogEmbed(payload);

  await channel.send({ embeds: [embed] });
  await appendLog({
    event: payload.event,
    userId: payload.userId || null,
    details: payload.details || {}
  });

  return channel;
}

async function getLogStats() {
  const logs = await readLogs();

  const stats = {
    join: 0,
    leave: 0,
    ticket: 0,
    announcement: 0,
    confession: 0
  };

  for (const log of logs) {
    switch (log.event) {
      case 'member_join':
        stats.join += 1;
        break;
      case 'member_leave':
        stats.leave += 1;
        break;
      case 'ticket_created':
      case 'ticket_closed':
        stats.ticket += 1;
        break;
      case 'announcement_created':
        stats.announcement += 1;
        break;
      case 'confession_created':
        stats.confession += 1;
        break;
      default:
        break;
    }
  }

  return stats;
}

function buildLogStatsEmbed(stats) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Logs Stats')
    .addFields(
      { name: 'Total Join', value: String(stats.join), inline: true },
      { name: 'Total Leave', value: String(stats.leave), inline: true },
      { name: 'Total Ticket', value: String(stats.ticket), inline: true },
      { name: 'Total Announcement', value: String(stats.announcement), inline: true },
      { name: 'Total Confession', value: String(stats.confession), inline: true }
    )
    .setTimestamp();
}

module.exports = {
  LOG_CHANNEL_NAME,
  LOGS_FILE,
  appendLog,
  buildLogEmbed,
  buildLogStatsEmbed,
  ensureLogsChannel,
  getLogStats,
  readLogs,
  sendLog,
  writeLogs
};
