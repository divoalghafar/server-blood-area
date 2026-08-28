const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { buildQueueStatus, enqueueMusic } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Memutar lagu dari Spotify link atau query pencarian.')
    .addStringOption((option) =>
      option
        .setName('input')
        .setDescription('Link Spotify track/album/playlist atau kata kunci lagu')
        .setRequired(true)
    ),

  async execute(interaction) {
    const input = interaction.options.getString('input', true);

    await interaction.deferReply();

    let result;

    try {
      result = await enqueueMusic(interaction, input);
    } catch (error) {
      await interaction.editReply({
        content: `Gagal memproses perintah play: ${error.message}`
      });
      return;
    }

    const { resolved, queue } = result;
    const status = buildQueueStatus(queue, resolved);
    const isPlayingNow = queue.current && queue.state === 'playing';

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle(isPlayingNow ? 'Sedang Memutar' : 'Masuk Queue')
      .setDescription(buildDescription(resolved, isPlayingNow))
      .addFields(
        { name: 'Sumber', value: formatSource(resolved.sourceType), inline: true },
        { name: 'Ditambahkan', value: String(status.addedCount), inline: true },
        { name: 'Total Queue', value: String(status.totalCount), inline: true }
      )
      .setTimestamp();

    if (resolved.thumbnailUrl) {
      embed.setThumbnail(resolved.thumbnailUrl);
    }

    if (queue.current?.playback?.youtube?.title) {
      embed.addFields({
        name: 'Diputar dari YouTube',
        value: queue.current.playback.youtube.title,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

function buildDescription(resolved, isPlayingNow) {
  if (resolved.sourceType === 'track') {
    const title = resolved.title || 'Unknown title';
    const artist = resolved.artist ? ` - ${resolved.artist}` : '';
    return isPlayingNow
      ? `Memulai pemutaran untuk **${title}${artist}**.`
      : `Menambahkan **${title}${artist}** ke queue.`;
  }

  if (resolved.sourceType === 'album' || resolved.sourceType === 'playlist') {
    const count = resolved.items.length;
    return isPlayingNow
      ? `Memulai pemutaran **${resolved.title}** dengan **${count} track**.`
      : `Menambahkan **${resolved.title}** dengan **${count} track** ke queue.`;
  }

  return isPlayingNow
    ? `Memulai pemutaran untuk input: **${resolved.title}**.`
    : `Menambahkan input ke queue: **${resolved.title}**.`;
}

function formatSource(sourceType) {
  if (sourceType === 'track') return 'Spotify Track';
  if (sourceType === 'album') return 'Spotify Album';
  if (sourceType === 'playlist') return 'Spotify Playlist';
  if (sourceType === 'youtube-url') return 'YouTube URL';
  return 'YouTube Search';
}
