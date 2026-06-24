const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { setWelcomeConfigChannels } = require('../services/welcomeService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome-config')
    .setDescription('Mengatur channel welcome dan goodbye.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('welcome-channel')
        .setDescription('Channel untuk welcome message')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName('leave-channel')
        .setDescription('Channel untuk leave message')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
        ephemeral: true
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: 'Command ini hanya bisa dipakai di server.',
        ephemeral: true
      });
      return;
    }

    const welcomeChannel = interaction.options.getChannel('welcome-channel');
    const leaveChannel = interaction.options.getChannel('leave-channel');

    if (!welcomeChannel && !leaveChannel) {
      await interaction.reply({
        content: 'Pilih minimal satu channel untuk diubah.',
        ephemeral: true
      });
      return;
    }

    if (welcomeChannel && welcomeChannel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: 'Welcome channel harus berupa text channel.',
        ephemeral: true
      });
      return;
    }

    if (leaveChannel && leaveChannel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: 'Leave channel harus berupa text channel.',
        ephemeral: true
      });
      return;
    }

    await setWelcomeConfigChannels(interaction.guild, {
      welcomeChannelId: welcomeChannel?.id,
      leaveChannelId: leaveChannel?.id
    });

    const parts = [];
    if (welcomeChannel) parts.push(`Welcome channel: ${welcomeChannel}`);
    if (leaveChannel) parts.push(`Leave channel: ${leaveChannel}`);

    await interaction.reply({
      content: `✅ Welcome config berhasil diperbarui.\n${parts.join('\n')}`,
      ephemeral: true
    });
  }
};
