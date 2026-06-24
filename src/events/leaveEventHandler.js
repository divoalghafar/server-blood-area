const { Events } = require('discord.js');
const { sendLeaveMessage } = require('../services/welcomeService');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    await sendLeaveMessage(member).catch((error) => {
      console.error(`Gagal mengirim leave message di guild ${member.guild.name}:`, error?.message || error);
    });
  }
};
