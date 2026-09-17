const { SlashCommandBuilder } = require('discord.js');
const { setAutoplay, toggleAutoplay } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Mengaktifkan atau menonaktifkan autoplay acak.')
    .addBooleanOption((option) => option
      .setName('enabled')
      .setDescription('True untuk aktif, false untuk nonaktif.')
      .setRequired(false)),
  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const result = enabled === null
      ? toggleAutoplay(interaction.guildId)
      : setAutoplay(interaction.guildId, enabled);

    await interaction.reply(result.message);
  }
};
