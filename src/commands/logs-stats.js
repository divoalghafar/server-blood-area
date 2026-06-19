const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildLogStatsEmbed, getLogStats } = require('../services/loggingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs-stats')
    .setDescription('Menampilkan statistik log server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
        ephemeral: true
      });
      return;
    }

    const stats = await getLogStats();

    await interaction.reply({
      embeds: [buildLogStatsEmbed(stats)],
      ephemeral: true
    });
  }
};
