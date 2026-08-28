const { SlashCommandBuilder } = require('discord.js');
const { disconnectMusic } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder().setName('disconnect').setDescription('Mengeluarkan bot dan mereset queue.'),
  async execute(interaction) {
    const result = disconnectMusic(interaction.guildId);
    await interaction.reply(result.message);
  }
};