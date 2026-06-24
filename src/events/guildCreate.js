const { Events } = require('discord.js');
const { ensureLogsChannel } = require('../services/loggingService');
const { ensureWelcomeInfrastructure } = require('../services/welcomeService');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    await ensureLogsChannel(guild).catch((error) => {
      console.error(`Gagal membuat channel logs di guild ${guild.name}:`, error?.message || error);
    });

    await ensureWelcomeInfrastructure(guild).catch((error) => {
      console.error(`Gagal memastikan welcome infrastructure di guild ${guild.name}:`, error?.message || error);
    });
  }
};
