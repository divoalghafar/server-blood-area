const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildAnnouncementListEmbed, getLatestAnnouncements } = require('../services/announcementService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announcement-list')
    .setDescription('Menampilkan 10 announcement terakhir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
        ephemeral: true
      });
      return;
    }

    const announcements = await getLatestAnnouncements(10);

    await interaction.reply({
      embeds: [buildAnnouncementListEmbed(announcements)],
      ephemeral: true
    });
  }
};
