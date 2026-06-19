const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildCustomRoleListEmbeds, getActiveCustomRoles } = require('../services/customRoleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('custom-role-list')
    .setDescription('Menampilkan seluruh custom role yang aktif.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
        ephemeral: true
      });
      return;
    }

    const entries = await getActiveCustomRoles(interaction.guild);
    const embeds = buildCustomRoleListEmbeds(entries, interaction.guild);

    await interaction.reply({
      embeds,
      ephemeral: true
    });
  }
};
