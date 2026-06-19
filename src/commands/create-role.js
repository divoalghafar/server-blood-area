const { SlashCommandBuilder } = require('discord.js');
const { createCustomRole } = require('../services/customRoleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-role')
    .setDescription('Membuat custom role untuk Booster.')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Nama role custom')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('color')
        .setDescription('Warna HEX role, contoh #00FFAA')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: 'Command ini hanya bisa dipakai di server.',
        ephemeral: true
      });
      return;
    }

    const name = interaction.options.getString('name', true);
    const color = interaction.options.getString('color', true);

    const result = await createCustomRole(interaction.guild, interaction.member, name, color);

    if (result.error) {
      await interaction.reply({
        content: result.error,
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: `✅ Custom role berhasil dibuat: ${result.role}`,
      ephemeral: true
    });
  }
};
