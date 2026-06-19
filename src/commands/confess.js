const { SlashCommandBuilder } = require('discord.js');
const { findConfessionChannelAsync } = require('../services/confessionService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Mengirim panel confession ke channel #confession.'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Command ini hanya bisa dipakai di server.',
        ephemeral: true
      });
      return;
    }

    const confessionChannel = await findConfessionChannelAsync(interaction.guild);

    if (!confessionChannel) {
      await interaction.reply({
        content: 'Channel #confession tidak ditemukan.',
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: `#confession siap. Tombol Submit dan Reply akan muncul di card confession terbaru secara otomatis.`,
      ephemeral: true
    });
  }
};
