const { Events } = require('discord.js');
const { ensureLogsChannel } = require('../services/loggingService');

async function initLogging(client) {
  client.once(Events.ClientReady, async () => {
    await client.guilds.fetch().catch(() => null);

    for (const guild of client.guilds.cache.values()) {
      await ensureLogsChannel(guild).catch((error) => {
        console.error(`Gagal memastikan channel logs di guild ${guild.name}:`, error?.message || error);
      });
    }
  });
}

module.exports = { initLogging };
