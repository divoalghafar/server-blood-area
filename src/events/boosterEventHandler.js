const { Events } = require('discord.js');
const {
  BOOSTER_ROLE_NAME,
  ensureBoosterChannel,
  ensureBoosterRole,
  setBoosterInactive,
  upsertBoosterRecord
} = require('../services/boosterService');
const {
  buildBoosterJoinEmbed,
  buildBoosterLeaveEmbed
} = require('../services/boosterService');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const oldBoosting = Boolean(oldMember.premiumSince);
    const newBoosting = Boolean(newMember.premiumSince);

    if (oldBoosting === newBoosting) return;

    const boosterRole = await ensureBoosterRole(newMember.guild).catch(() => null);
    const boosterChannel = await ensureBoosterChannel(newMember.guild).catch(() => null);

    if (!boosterRole || !boosterChannel) return;

    if (newBoosting) {
      if (!newMember.roles.cache.has(boosterRole.id)) {
        await newMember.roles.add(boosterRole).catch(() => null);
      }

      await upsertBoosterRecord(newMember.id, new Date().toISOString(), true);

      await boosterChannel.send({
        embeds: [buildBoosterJoinEmbed(newMember)]
      }).catch(() => null);
      return;
    }

    if (oldBoosting && !newBoosting) {
      if (newMember.roles.cache.has(boosterRole.id)) {
        await newMember.roles.remove(boosterRole).catch(() => null);
      }

      await setBoosterInactive(newMember.id);

      await boosterChannel.send({
        embeds: [buildBoosterLeaveEmbed(newMember)]
      }).catch(() => null);
    }
  }
};
