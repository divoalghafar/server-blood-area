const { SlashCommandBuilder } = require('discord.js');
const { toggleShuffle, setShuffle } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Mengaktifkan atau menonaktifkan shuffle mode.')
    .addBooleanOption((option) =>
      option
        .setName('enabled')
        .setDescription('Aktifkan atau nonaktifkan shuffle')
        .setRequired(false)
    ),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');

    let result;

    if (enabled !== null) {
      result = setShuffle(interaction.guildId, enabled);
    } else {
      result = toggleShuffle(interaction.guildId);
    }

    await interaction.reply(result.message);
  }
};
