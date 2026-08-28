const { SlashCommandBuilder } = require('discord.js');
const { clearQueue } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder().setName('clear').setDescription('Menghapus queue tanpa menghentikan lagu saat ini.'),
  async execute(interaction) {
    const result = clearQueue(interaction.guildId);
    await interaction.reply(result.message);
  }
};