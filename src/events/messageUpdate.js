const { Events } = require('discord.js');
const { sendLog } = require('../services/loggingService');
const { buildMessageEditLog } = require('../services/logEmbedBuilder');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (newMessage.author?.bot || oldMessage.author?.bot) return;

    const resolvedOld = await resolveMessage(oldMessage);
    const resolvedNew = await resolveMessage(newMessage);

    if (!resolvedNew?.guild) return;

    if ((resolvedOld.content || '') === (resolvedNew.content || '')) return;

    await sendLog(resolvedNew.guild, {
      event: 'message_edited',
      userId: resolvedNew.author?.id || resolvedOld.author?.id || null,
      embed: buildMessageEditLog(resolvedOld, resolvedNew)
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
