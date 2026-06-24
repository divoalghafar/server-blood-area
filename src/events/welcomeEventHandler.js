const { Events } = require('discord.js');
const { sendWelcomeMessage } = require('../services/welcomeService');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    await sendWelcomeMessage(member).catch((error) => {
      console.error(`Gagal mengirim welcome message di guild ${member.guild.name}:`, error?.message || error);
    });
  }
};
