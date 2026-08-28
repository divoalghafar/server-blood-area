const { SlashCommandBuilder } = require('discord.js');
const { stopMusic } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Menghentikan musik dan mengosongkan queue.'),
  async execute(interaction) {
    const result = stopMusic(interaction.guildId);
    await interaction.reply(result.message);
  }
};