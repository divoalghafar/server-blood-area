const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const {
  buildAnnouncementEmbed,
  findAnnounceChannelAsync,
  logAnnouncementCreated,
  saveAnnouncement
} = require('../services/announcementService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Mengirim pengumuman ke channel #announce.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('Judul pengumuman')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('Isi pengumuman')
        .setRequired(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName('image')
        .setDescription('Upload gambar opsional')
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

    const title = interaction.options.getString('title', true).trim();
    const message = interaction.options.getString('message', true).trim();
    const image = interaction.options.getAttachment('image');

    if (image && !isImageAttachment(image)) {
      await interaction.reply({
        content: '❌ File image harus berupa gambar (png, jpg, jpeg, gif, webp, bmp, avif).',
        ephemeral: true
      });
      return;
    }

    const announceChannel = await findAnnounceChannelAsync(interaction.guild);

    if (!announceChannel) {
      await interaction.reply({
        content: 'Channel #announce tidak ditemukan.',
        ephemeral: true
      });
      return;
    }

    const announcement = await saveAnnouncement({
      title,
      message,
      createdBy: interaction.user.id
    });

    await logAnnouncementCreated(interaction.guild, announcement);

    await announceChannel.send({
      embeds: [buildAnnouncementEmbed(announcement, image?.url || null)]
    });

    await interaction.reply({
      content: '✅ Pengumuman berhasil dikirim.',
      ephemeral: true
    });
  }
};

function isImageAttachment(attachment) {
  if (attachment.contentType?.startsWith('image/')) {
    return true;
  }

  return /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(attachment.name || '');
}
