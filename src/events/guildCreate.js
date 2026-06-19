const { Events } = require('discord.js');
const { ensureLogsChannel } = require('../services/loggingService');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    await ensureLogsChannel(guild).catch((error) => {
      console.error(`Gagal membuat channel logs di guild ${guild.name}:`, error?.message || error);
    });
  }
};
