const { SlashCommandBuilder } = require('discord.js');
const { editCustomRole } = require('../services/customRoleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-role')
    .setDescription('Mengubah custom role milik sendiri.')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Nama role baru')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('color')
        .setDescription('Warna HEX baru, contoh #00FFAA')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: 'Command ini hanya bisa dipakai di server.',
        ephemeral: true
      });
      return;
    }

    const name = interaction.options.getString('name');
    const color = interaction.options.getString('color');

    const result = await editCustomRole(interaction.guild, interaction.member, { name, color });

    if (result.error) {
      await interaction.reply({
        content: result.error,
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: `✅ Custom role berhasil diperbarui: ${result.role}`,
      ephemeral: true
    });
  }
};
