const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildAnnouncementDetailEmbed, getAnnouncementById } = require('../services/announcementService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announcement-detail')
    .setDescription('Menampilkan detail announcement berdasarkan ID.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('ID announcement')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
        ephemeral: true
      });
      return;
    }

    const id = interaction.options.getString('id', true);
    const announcement = await getAnnouncementById(id);

    if (!announcement) {
      await interaction.reply({
        content: 'Announcement dengan ID tersebut tidak ditemukan.',
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [buildAnnouncementDetailEmbed(announcement)],
      ephemeral: true
    });
  }
};
