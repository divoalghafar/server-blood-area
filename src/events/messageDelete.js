const { Events } = require('discord.js');
const { sendLog } = require('../services/loggingService');
const { buildMessageDeleteLog } = require('../services/logEmbedBuilder');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (message.author?.bot) return;

    const resolvedMessage = await resolveMessage(message);

    if (!resolvedMessage?.guild) return;

    await sendLog(resolvedMessage.guild, {
      event: 'message_deleted',
      userId: resolvedMessage.author?.id || null,
      embed: buildMessageDeleteLog(resolvedMessage)
    }).catch(() => null);
  }
};

async function resolveMessage(message) {
  if (!message.partial) return message;

  try {
    return await message.fetch();
  } catch {
    return message;
  }
}
