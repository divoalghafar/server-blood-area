const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildConfessionInfoEmbed, getConfessionById } = require('../services/confessionService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confession-info')
    .setDescription('Melihat data confession berdasarkan ID.')
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('ID confession')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'Command ini hanya untuk Administrator.',
        ephemeral: true
      });
      return;
    }

    const id = interaction.options.getString('id', true);
    const confession = await getConfessionById(id);

    if (!confession) {
      await interaction.reply({
        content: 'Confession dengan ID tersebut tidak ditemukan.',
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [buildConfessionInfoEmbed(confession)],
      ephemeral: true
    });
  }
};
