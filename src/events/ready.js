const { Events } = require('discord.js');
const { ensureWelcomeInfrastructure } = require('../services/welcomeService');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Bot Online sebagai ${client.user.tag}`);

    await client.guilds.fetch().catch(() => null);

    for (const guild of client.guilds.cache.values()) {
      await ensureWelcomeInfrastructure(guild).catch((error) => {
        console.error(`Gagal memastikan welcome infrastructure di guild ${guild.name}:`, error?.message || error);
      });
    }
  }
};
