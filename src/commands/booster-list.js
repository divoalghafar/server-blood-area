const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildBoosterListEmbed, getActiveBoosters } = require('../services/boosterService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('booster-list')
    .setDescription('Menampilkan seluruh booster aktif.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
        ephemeral: true
      });
      return;
    }

    const boosters = await getActiveBoosters();

    await interaction.reply({
      embeds: [buildBoosterListEmbed(boosters, interaction.guild)],
      ephemeral: true
    });
  }
};
