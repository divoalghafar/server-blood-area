const { SlashCommandBuilder } = require('discord.js');
const { findSubmitReportChannel, sendTicketPanelToChannel, TICKET_CHANNEL_NAME } = require('../services/ticketService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Mengirim panel ticket ke channel submit-report.'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Command ini hanya bisa dipakai di server.',
        ephemeral: true
      });
      return;
    }

    const submitReportChannel = findSubmitReportChannel(interaction.guild);

    if (!submitReportChannel) {
      await interaction.reply({
        content: `Channel "${TICKET_CHANNEL_NAME}" tidak ditemukan.`,
        ephemeral: true
      });
      return;
    }

    await sendTicketPanelToChannel(submitReportChannel);

    await interaction.reply({
      content: 'Panel ticket berhasil dikirim ke #submit-report.',
      ephemeral: true
    });
  }
};
