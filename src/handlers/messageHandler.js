const PREFIX = 'gm1!';

function initMessageCommands(client) {
  client.on('messageCreate', async (message) => {
    if (message.author?.bot || !message.guild || !message.content.startsWith(PREFIX)) {
      return;
    }

    const body = message.content.slice(PREFIX.length).trim();
    const [name, ...args] = body.split(/\s+/);
    const command = client.commands.get(name?.toLowerCase());

    if (!command) return;

    const interaction = createMessageContext(message, args);

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Gagal menjalankan ${PREFIX}${name}:`, error);
      await interaction.editReply('Terjadi kesalahan saat menjalankan command musik.');
    }
  });
}

function createMessageContext(message, args) {
  let response = null;

  const send = async (payload) => {
    response = response ? await response.edit(normalizePayload(payload)) : await message.reply(normalizePayload(payload));
    return response;
  };

  return {
    client: message.client,
    guild: message.guild,
    guildId: message.guildId,
    member: message.member,
    channel: message.channel,
    channelId: message.channelId,
    user: message.author,
    options: {
      getString(name, required = false) {
        const value = name === 'input' || name === 'url' ? args.join(' ') : args[0];
        if (required && !value) throw new Error(`Argumen ${name} wajib diisi.`);
        return value || null;
      },
      getBoolean(_name, required = false) {
        const value = args[0]?.toLowerCase();
        if (!value && required) throw new Error('Gunakan true atau false.');
        if (value === 'true' || value === 'on' || value === 'yes') return true;
        if (value === 'false' || value === 'off' || value === 'no') return false;
        if (required) throw new Error('Gunakan true atau false.');
        return null;
      },
      getSubcommand() { return args[0]; }
    },
    deferReply: async () => undefined,
    reply: send,
    editReply: send,
    followUp: send,
    replied: false,
    deferred: false
  };
}

function normalizePayload(payload) {
  return typeof payload === 'string' ? { content: payload } : payload;
}

module.exports = { PREFIX, initMessageCommands };
