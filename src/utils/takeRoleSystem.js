const { ChannelType, EmbedBuilder } = require('discord.js');

const TAKE_ROLE_CHANNEL_NAME = 'take-role';

const ROLE_DEFINITIONS = [
  { customId: 'role_developer', label: 'Developer', roleName: 'Developer' },
  { customId: 'role_designer', label: 'Designer', roleName: 'Designer' },
  { customId: 'role_gamer', label: 'Gamer', roleName: 'Gamer' },
  { customId: 'role_music', label: 'Music', roleName: 'Music' },
  { customId: 'role_anime', label: 'Anime', roleName: 'Anime' }
];

function buildTakeRoleEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎭 Pilih Role Kamu')
    .setDescription('Klik tombol di bawah untuk mendapatkan role sesuai minatmu.')
    .setTimestamp();
}

function findTakeRoleChannel(guild) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === TAKE_ROLE_CHANNEL_NAME
  );
}

async function ensureRoleExists(guild, roleName) {
  const existingRole = guild.roles.cache.find((role) => role.name === roleName);

  if (existingRole) {
    return { role: existingRole, created: false };
  }

  const createdRole = await guild.roles.create({
    name: roleName,
    reason: 'Auto create role for take-role system'
  });

  return { role: createdRole, created: true };
}

async function ensureAllTakeRoles(guild) {
  const result = [];

  for (const roleDef of ROLE_DEFINITIONS) {
    const payload = await ensureRoleExists(guild, roleDef.roleName);
    result.push({
      ...roleDef,
      role: payload.role,
      created: payload.created
    });
  }

  return result;
}

function getRoleDefinitionByCustomId(customId) {
  return ROLE_DEFINITIONS.find((definition) => definition.customId === customId);
}

async function toggleRoleForMember(interaction, roleName) {
  const payload = await ensureRoleExists(interaction.guild, roleName);
  const role = payload.role;
  const member = interaction.member;

  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role);
    return { action: 'removed', role };
  }

  await member.roles.add(role);
  return { action: 'added', role };
}

module.exports = {
  ROLE_DEFINITIONS,
  TAKE_ROLE_CHANNEL_NAME,
  buildTakeRoleEmbed,
  ensureAllTakeRoles,
  findTakeRoleChannel,
  getRoleDefinitionByCustomId,
  toggleRoleForMember
};
