const { Events } = require('discord.js');
const { sendLog } = require('../services/loggingService');
const { buildRoleAddedLog, buildRoleRemovedLog } = require('../services/logEmbedBuilder');
const { BOOSTER_ROLE_NAME } = require('../services/boosterService');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());

    for (const roleId of newRoles) {
      if (!oldRoles.has(roleId)) {
        const role = newMember.guild.roles.cache.get(roleId);
        if (!role || role.managed || role.name === BOOSTER_ROLE_NAME) continue;

        await sendLog(newMember.guild, {
          event: 'role_added',
          userId: newMember.id,
          embed: buildRoleAddedLog(newMember, role)
        }).catch(() => null);
      }
    }

    for (const roleId of oldRoles) {
      if (!newRoles.has(roleId)) {
        const role = oldMember.guild.roles.cache.get(roleId);
        if (!role || role.managed || role.name === BOOSTER_ROLE_NAME) continue;

        await sendLog(newMember.guild, {
          event: 'role_removed',
          userId: newMember.id,
          embed: buildRoleRemovedLog(newMember, role)
        }).catch(() => null);
      }
    }
  }
};
