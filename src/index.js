require('dotenv').config();

const { Client, Collection, Events, GatewayIntentBits, Partials } = require('discord.js');
const { loadButtons } = require('./handlers/buttonHandler');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { initLogging } = require('./handlers/loggingHandler');
const { loadModals } = require('./handlers/modalHandler');

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN belum diisi di file .env');
  process.exit(1);
}

const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();

loadCommands(client);
loadButtons(client);
loadModals(client);
initLogging(client);
loadEvents(client);

client.on(Events.VoiceStateUpdate, (_oldState, newState) => {
  if (!client.user || newState.id !== client.user.id) {
    return;
  }

  console.log(
    `[gateway] voiceStateUpdate bot -> guild=${newState.guild?.id || 'unknown'} channel=${newState.channelId || 'null'} serverMute=${newState.serverMute} selfMute=${newState.selfMute} suppress=${newState.suppress}`
  );
});

client.on(Events.Debug, (message) => {
  if (typeof message !== 'string' || !message.startsWith('[VOICE]')) {
    return;
  }

  console.log(`[gateway] ${message}`);
});

client.login(process.env.DISCORD_TOKEN);
