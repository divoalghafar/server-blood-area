const { Events } = require('discord.js');
const { sendLog } = require('../services/loggingService');
const { buildMemberJoinLog } = require('../services/logEmbedBuilder');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    await sendLog(member.guild, {
      event: 'member_join',
      userId: member.id,
      embed: buildMemberJoinLog(member)
    }).catch(() => null);
  }
};
