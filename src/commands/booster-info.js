const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildBoosterInfoEmbed, getBoosterByUserId } = require('../services/boosterService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('booster-info')
    .setDescription('Menampilkan detail booster berdasarkan user.')
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
    const booster = await getBoosterByUserId(user.id);

    if (!booster) {
      await interaction.reply({
        content: 'Data booster untuk user ini tidak ditemukan.',
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [buildBoosterInfoEmbed(booster, interaction.guild.members.cache.get(user.id) || null)],
      ephemeral: true
    });
  }
};
