const { SlashCommandBuilder } = require('discord.js');
const { joinMusic } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Memasukkan bot ke voice channel kamu.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const queue = await joinMusic(interaction);
      await interaction.editReply(
        `Bot berhasil masuk ke <#${queue.voiceChannelId}>.`
      );
    } catch (error) {
      await interaction.editReply(`Gagal masuk ke voice channel: ${error.message}`);
    }
  }
};