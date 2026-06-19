const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
  deleteCustomRoleByUserId,
  getAllCustomRoles,
  getCustomRoleByUserId,
  upsertCustomRole
} = require('./customRoleRepository');

const CUSTOM_ROLE_CHANNEL_NAME = 'custom-role';
const BOOSTER_ROLE_NAME = 'Booster';
const BOOSTER_ONLY_MESSAGE = '❌ Hanya Booster yang dapat membuat Custom Role.';

function findCustomRoleChannel(guild) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === CUSTOM_ROLE_CHANNEL_NAME
  );
}

async function ensureCustomRoleChannel(guild) {
  await guild.channels.fetch();

  const existing = findCustomRoleChannel(guild);
  if (existing) return existing;

  return guild.channels.create({
    name: CUSTOM_ROLE_CHANNEL_NAME,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionFlagsBits.ViewChannel]
      }
    ]
  });
}

function findBoosterRole(guild) {
  return guild.roles.cache.find((role) => role.name === BOOSTER_ROLE_NAME);
}

function hasBoosterRole(member) {
  const boosterRole = findBoosterRole(member.guild);
  return Boolean(boosterRole && member.roles.cache.has(boosterRole.id));
}

function normalizeRoleName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function isValidRoleName(name) {
  return typeof name === 'string' && name.trim().length >= 3 && name.trim().length <= 30;
}

function normalizeHexColor(color) {
  if (!color) return null;

  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

async function getOwnCustomRole(guild, userId) {
  const record = await getCustomRoleByUserId(userId);
  if (!record) {
    return null;
  }

  const role = guild.roles.cache.get(record.roleId);
  if (role) {
    return { record, role };
  }

  await deleteCustomRoleByUserId(userId);
  return null;
}

async function createCustomRole(guild, member, name, color) {
  if (!hasBoosterRole(member)) {
    return { error: BOOSTER_ONLY_MESSAGE };
  }

  await ensureCustomRoleChannel(guild);

  const existing = await getOwnCustomRole(guild, member.id);
  if (existing) {
    return { error: 'Kamu sudah memiliki custom role.' };
  }

  const normalizedName = normalizeRoleName(name);
  if (!isValidRoleName(normalizedName)) {
    return { error: 'Nama role harus 3 sampai 30 karakter.' };
  }

  const normalizedColor = normalizeHexColor(color);
  if (!normalizedColor) {
    return { error: 'Warna harus format HEX valid, contoh: #00FFAA.' };
  }

  const role = await guild.roles.create({
    name: normalizedName,
    color: normalizedColor,
    reason: `Custom role created by ${member.user.tag}`
  });

  try {
    await member.roles.add(role);
  } catch (error) {
    await role.delete('Rollback custom role creation').catch(() => null);
    return { error: 'Gagal memberikan role ke user. Pastikan posisi role bot cukup tinggi.' };
  }

  const record = await upsertCustomRole({
    userId: member.id,
    roleId: role.id,
    roleName: normalizedName,
    color: normalizedColor,
    createdAt: new Date().toISOString()
  });

  return { record, role };
}

async function editCustomRole(guild, member, payload) {
  if (!hasBoosterRole(member)) {
    return { error: BOOSTER_ONLY_MESSAGE };
  }

  await ensureCustomRoleChannel(guild);

  const ownRole = await getOwnCustomRole(guild, member.id);
  if (!ownRole) {
    return { error: 'Custom role kamu tidak ditemukan.' };
  }

  const updates = {};

  if (payload.name !== undefined) {
    const normalizedName = normalizeRoleName(payload.name);
    if (!isValidRoleName(normalizedName)) {
      return { error: 'Nama role harus 3 sampai 30 karakter.' };
    }
    updates.name = normalizedName;
    updates.roleName = normalizedName;
  }

  if (payload.color !== undefined) {
    const normalizedColor = normalizeHexColor(payload.color);
    if (!normalizedColor) {
      return { error: 'Warna harus format HEX valid, contoh: #00FFAA.' };
    }
    updates.color = normalizedColor;
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'Pilih minimal satu parameter untuk diubah.' };
  }

  try {
    await ownRole.role.edit({
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.color ? { color: updates.color } : {})
    });
  } catch {
    return { error: 'Gagal mengubah role. Pastikan bot memiliki izin yang cukup.' };
  }

  const record = await upsertCustomRole({
    ...ownRole.record,
    ...(updates.roleName ? { roleName: updates.roleName } : {}),
    ...(updates.color ? { color: updates.color } : {})
  });

  return { record, role: ownRole.role };
}

async function deleteCustomRole(guild, member) {
  if (!hasBoosterRole(member)) {
    return { error: BOOSTER_ONLY_MESSAGE };
  }

  await ensureCustomRoleChannel(guild);

  const ownRole = await getOwnCustomRole(guild, member.id);
  if (!ownRole) {
    return { error: 'Custom role kamu tidak ditemukan.' };
  }

  try {
    await ownRole.role.delete('Custom role deleted by owner');
  } catch {
    return { error: 'Gagal menghapus role. Pastikan bot memiliki izin yang cukup.' };
  }

  const record = await deleteCustomRoleByUserId(member.id);

  return { record };
}

async function getActiveCustomRoles(guild) {
  const records = await getAllCustomRoles();
  const active = [];

  for (const record of records) {
    const role = guild.roles.cache.get(record.roleId);
    if (!role) {
      await deleteCustomRoleByUserId(record.userId);
      continue;
    }

    active.push({ record, role });
  }

  return active.sort((a, b) => new Date(b.record.createdAt || 0) - new Date(a.record.createdAt || 0));
}

async function getCustomRoleInfo(guild, userId) {
  return getOwnCustomRole(guild, userId);
}

function buildCustomRoleListEmbeds(entries, guild) {
  const chunks = chunkEntries(entries, 10);

  if (chunks.length === 0) {
    return [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Custom Role Aktif')
        .setDescription('Belum ada custom role aktif.')
        .setTimestamp()
    ];
  }

  return chunks.map((chunk, index) => {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(index === 0 ? 'Custom Role Aktif' : `Custom Role Aktif (${index + 1})`)
      .setDescription('Daftar seluruh custom role aktif saat ini.')
      .setTimestamp();

    embed.addFields(
      chunk.map(({ record, role }) => ({
        name: `${role.name} (${record.userId})`,
        value: [
          `User: ${formatUserLabel(guild, record.userId)}`,
          `Warna: ${record.color}`,
          `Dibuat: ${new Date(record.createdAt).toLocaleString('id-ID')}`
        ].join('\n'),
        inline: false
      }))
    );

    return embed;
  });
}

function buildCustomRoleInfoEmbed(entry, guild) {
  const { record, role } = entry;

  return new EmbedBuilder()
    .setColor(parseColorValue(record.color))
    .setTitle('Custom Role Info')
    .addFields(
      { name: 'User', value: formatUserLabel(guild, record.userId), inline: false },
      { name: 'Nama Role', value: role.name, inline: false },
      { name: 'Warna', value: record.color, inline: true },
      { name: 'Tanggal Dibuat', value: new Date(record.createdAt).toLocaleString('id-ID'), inline: true }
    )
    .setTimestamp();
}

function formatUserLabel(guild, userId) {
  const member = guild.members.cache.get(userId);
  return member ? `${member.user.tag} (${member.id})` : userId;
}

function parseColorValue(color) {
  if (!color) return 0x5865f2;
  return Number.parseInt(color.replace('#', ''), 16);
}

function chunkEntries(entries, size) {
  const chunks = [];

  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size));
  }

  return chunks;
}

module.exports = {
  BOOSTER_ROLE_NAME,
  CUSTOM_ROLE_CHANNEL_NAME,
  buildCustomRoleInfoEmbed,
  buildCustomRoleListEmbeds,
  createCustomRole,
  deleteCustomRole,
  editCustomRole,
  ensureCustomRoleChannel,
  findCustomRoleChannel,
  getActiveCustomRoles,
  getCustomRoleInfo,
  hasBoosterRole,
  isValidRoleName,
  normalizeHexColor
};
