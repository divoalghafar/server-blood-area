const fs = require('node:fs/promises');
const path = require('node:path');
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const { buildLeaveEmbed, buildWelcomeEmbed } = require('./welcomeEmbedBuilder');

const DATA_DIR = path.join(process.cwd(), 'data');
const WELCOME_CONFIG_FILE = path.join(DATA_DIR, 'welcome-config.json');

const DEFAULT_CONFIG = {
  welcomeChannelId: '',
  leaveChannelId: ''
};

const WELCOME_CHANNEL_NAME = 'welcome';
const GOODBYE_CHANNEL_NAME = 'goodbye';
const MEMBER_ROLE_NAME = 'Member';

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(WELCOME_CONFIG_FILE);
  } catch {
    await fs.writeFile(WELCOME_CONFIG_FILE, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, 'utf8');
  }
}

async function readWelcomeConfig() {
  await ensureStorage();

  const raw = await fs.readFile(WELCOME_CONFIG_FILE, 'utf8');
  if (!raw.trim()) return { ...DEFAULT_CONFIG };

  try {
    const parsed = JSON.parse(raw);
    return {
      welcomeChannelId: parsed.welcomeChannelId || '',
      leaveChannelId: parsed.leaveChannelId || ''
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function writeWelcomeConfig(config) {
  await ensureStorage();
  await fs.writeFile(WELCOME_CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function findTextChannelByName(guild, channelName) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === channelName
  );
}

async function findChannelByConfigOrName(guild, channelId, fallbackName) {
  await guild.channels.fetch();

  if (channelId) {
    const byId = guild.channels.cache.get(channelId);
    if (byId && byId.type === ChannelType.GuildText) {
      return byId;
    }
  }

  return findTextChannelByName(guild, fallbackName);
}

async function ensureTextChannel(guild, channelName, configKey) {
  const config = await readWelcomeConfig();
  const existing = await findChannelByConfigOrName(guild, config[configKey], channelName);
  if (existing) {
    if (config[configKey] !== existing.id) {
      config[configKey] = existing.id;
      await writeWelcomeConfig(config);
    }

    return existing;
  }

  const created = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: guild.members.me?.id || guild.client.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory]
      }
    ]
  });

  config[configKey] = created.id;
  await writeWelcomeConfig(config);
  return created;
}

function findMemberRole(guild) {
  return guild.roles.cache.find((role) => role.name === MEMBER_ROLE_NAME);
}

async function ensureMemberRole(guild) {
  const existing = findMemberRole(guild);
  if (existing) return existing;

  return guild.roles.create({
    name: MEMBER_ROLE_NAME,
    reason: 'Auto create member role for welcome system'
  });
}

async function ensureWelcomeInfrastructure(guild) {
  await guild.channels.fetch();
  await guild.roles.fetch().catch(() => null);

  const welcomeChannel = await ensureTextChannel(guild, WELCOME_CHANNEL_NAME, 'welcomeChannelId');
  const leaveChannel = await ensureTextChannel(guild, GOODBYE_CHANNEL_NAME, 'leaveChannelId');
  const memberRole = await ensureMemberRole(guild);

  return { welcomeChannel, leaveChannel, memberRole };
}

async function resolveWelcomeTargets(guild) {
  const config = await readWelcomeConfig();

  const welcomeChannel = resolveChannelFromCache(guild, config.welcomeChannelId, WELCOME_CHANNEL_NAME);
  const leaveChannel = resolveChannelFromCache(guild, config.leaveChannelId, GOODBYE_CHANNEL_NAME);
  const memberRole = findMemberRole(guild);

  return { config, leaveChannel, memberRole, welcomeChannel };
}

function resolveChannelFromCache(guild, channelId, fallbackName) {
  if (channelId) {
    const byId = guild.channels.cache.get(channelId);
    if (byId && byId.type === ChannelType.GuildText) {
      return byId;
    }
  }

  return findTextChannelByName(guild, fallbackName);
}

async function setWelcomeConfigChannels(guild, payload = {}) {
  const config = await readWelcomeConfig();

  if (payload.welcomeChannelId !== undefined) {
    config.welcomeChannelId = payload.welcomeChannelId || '';
  }

  if (payload.leaveChannelId !== undefined) {
    config.leaveChannelId = payload.leaveChannelId || '';
  }

  await writeWelcomeConfig(config);
  return ensureWelcomeInfrastructure(guild);
}

async function sendWelcomeMessage(member) {
  let { welcomeChannel, memberRole } = await resolveWelcomeTargets(member.guild);

  if (!welcomeChannel || !memberRole) {
    const ensured = await ensureWelcomeInfrastructure(member.guild);
    welcomeChannel = welcomeChannel || ensured.welcomeChannel;
    memberRole = memberRole || ensured.memberRole;
  }

  const channels = buildChannelMentions(member.guild);
  await welcomeChannel.send({
    content: buildWelcomeEmbed(member, channels)
  });

  if (memberRole && !member.roles.cache.has(memberRole.id)) {
    await member.roles.add(memberRole).catch(() => null);
  }

  return welcomeChannel;
}

async function sendLeaveMessage(member) {
  let { leaveChannel } = await resolveWelcomeTargets(member.guild);

  if (!leaveChannel) {
    const ensured = await ensureWelcomeInfrastructure(member.guild);
    leaveChannel = ensured.leaveChannel;
  }

  await leaveChannel.send({
    embeds: [buildLeaveEmbed(member)]
  });

  return leaveChannel;
}

function buildChannelMentions(guild) {
  return {
    announce: mentionChannelByName(guild, 'announce'),
    rules: mentionChannelByName(guild, 'rules'),
    girlsVerify: mentionChannelByName(guild, 'girls-verify'),
    takeRole: mentionChannelByName(guild, 'take-role'),
    ticket: mentionChannelByName(guild, 'submit-report')
  };
}

function mentionChannelByName(guild, channelName) {
  const channel = findTextChannelByName(guild, channelName);
  return channel ? `<#${channel.id}>` : `#${channelName}`;
}

module.exports = {
  DEFAULT_CONFIG,
  GOODBYE_CHANNEL_NAME,
  MEMBER_ROLE_NAME,
  WELCOME_CHANNEL_NAME,
  WELCOME_CONFIG_FILE,
  buildChannelMentions,
  ensureMemberRole,
  ensureTextChannel,
  ensureWelcomeInfrastructure,
  findMemberRole,
  findTextChannelByName,
  mentionChannelByName,
  readWelcomeConfig,
  sendLeaveMessage,
  sendWelcomeMessage,
  resolveWelcomeTargets,
  setWelcomeConfigChannels,
  writeWelcomeConfig
};
