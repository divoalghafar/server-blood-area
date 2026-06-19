const { Events } = require('discord.js');
const { sendLog } = require('../services/loggingService');
const { buildMemberLeaveLog } = require('../services/logEmbedBuilder');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    await sendLog(member.guild, {
      event: 'member_leave',
      userId: member.id,
      embed: buildMemberLeaveLog(member)
    }).catch(() => null);
  }
};
