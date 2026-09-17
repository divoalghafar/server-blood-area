require('dotenv').config();

const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { initMessageCommands } = require('./handlers/messageHandler');

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN belum diisi di file .env');
  process.exit(1);
}

const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

loadCommands(client);
initMessageCommands(client);

client.on(Events.VoiceStateUpdate, (_oldState, newState) => {
  if (!client.user || newState.id !== client.user.id) {
    return;
  }

  console.log(
    `[gateway] voiceStateUpdate bot -> guild=${newState.guild?.id || 'unknown'} channel=${newState.channelId || 'null'} serverMute=${newState.serverMute} selfMute=${newState.selfMute} suppress=${newState.suppress}`
  );
});

client.login(process.env.DISCORD_TOKEN);
