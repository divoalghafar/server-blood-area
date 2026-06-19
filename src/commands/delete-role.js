const { SlashCommandBuilder } = require('discord.js');
const { deleteCustomRole } = require('../services/customRoleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-role')
    .setDescription('Menghapus custom role milik sendiri.'),

  async execute(interaction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: 'Command ini hanya bisa dipakai di server.',
        ephemeral: true
      });
      return;
    }

    const result = await deleteCustomRole(interaction.guild, interaction.member);

    if (result.error) {
      await interaction.reply({
        content: result.error,
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: '✅ Custom role berhasil dihapus.',
      ephemeral: true
    });
  }
};
