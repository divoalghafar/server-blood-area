require('dotenv').config();

const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
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

client.login(process.env.DISCORD_TOKEN);
