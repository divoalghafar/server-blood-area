const { SlashCommandBuilder } = require('discord.js');
const { skipTrack } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Melewati lagu yang sedang diputar.'),
  async execute(interaction) {
    const result = await skipTrack(interaction.guildId);
    await interaction.reply(result.message);
  }
};