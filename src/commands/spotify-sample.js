const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { resolveSpotifyTrack } = require('../services/spotifyService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spotify-sample')
    .setDescription('Menguji resolusi 1 track Spotify menjadi metadata lagu.')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('Link Spotify track atau spotify:track:...')
        .setRequired(true)
    ),

  async execute(interaction) {
    const input = interaction.options.getString('url', true);

    await interaction.deferReply();

    let track;

    try {
      track = await resolveSpotifyTrack(input);
    } catch (error) {
      await interaction.editReply({
        content: `Gagal membaca track Spotify: ${error.message}`
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle('Spotify Track Resolved')
      .setDescription('Ini hasil sample pertama dari track Spotify yang kamu kirim.')
      .addFields(
        { name: 'Judul', value: track.title, inline: false },
        { name: 'Artis', value: track.artist, inline: false },
        { name: 'Track ID', value: track.trackId, inline: false },
        { name: 'Sumber', value: track.sourceName, inline: false },
        { name: 'Query YouTube', value: track.youtubeSearchQuery, inline: false }
      )
      .setURL(track.trackUrl)
      .setFooter({ text: 'Tahap ini baru resolver metadata, belum voice playback.' });

    if (track.thumbnailUrl) {
      embed.setThumbnail(track.thumbnailUrl);
    }

    await interaction.editReply({
      embeds: [embed]
    });
  }
};
