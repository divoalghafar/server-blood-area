const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateQueue, setAutoplay } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Mengaktifkan atau menonaktifkan autoplay acak.')
    .addBooleanOption((option) => option
      .setName('enabled')
      .setDescription('True untuk aktif, false untuk nonaktif.')
      .setRequired(true)),
  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled', true);
    setAutoplay(interaction.guildId, enabled);
    await interaction.reply(`Autoplay ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`);
  }
};