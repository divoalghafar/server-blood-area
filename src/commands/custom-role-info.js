const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildCustomRoleInfoEmbed, getCustomRoleInfo } = require('../services/customRoleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('custom-role-info')
    .setDescription('Menampilkan detail custom role berdasarkan user.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User yang ingin dicek')
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

    const user = interaction.options.getUser('user', true);
    const entry = await getCustomRoleInfo(interaction.guild, user.id);

    if (!entry) {
      await interaction.reply({
        content: 'Data custom role untuk user ini tidak ditemukan.',
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [buildCustomRoleInfoEmbed(entry, interaction.guild)],
      ephemeral: true
    });
  }
};
