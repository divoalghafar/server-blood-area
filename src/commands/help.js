const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const COMMAND_DETAILS = {
  play: ['<lagu / link>', 'Memutar lagu atau menambahkannya ke queue.'],
  join: ['', 'Memasukkan bot ke voice channel kamu.'],
  skip: ['', 'Melewati lagu yang sedang diputar.'],
  stop: ['', 'Menghentikan musik dan mengosongkan queue.'],
  disconnect: ['', 'Mengeluarkan bot dari voice channel.'],
  loop: ['[off | one | all]', 'Mengatur mode loop musik.'],
  shuffle: ['[true | false]', 'Toggle atau mengatur shuffle mode.'],
  autoplay: ['[true | false]', 'Toggle atau mengatur autoplay.'],
  clear: ['', 'Menghapus lagu di queue.'],
  'spotify-sample': ['<link Spotify>', 'Menguji metadata track Spotify.']
};

const COMMAND_GROUPS = [
  {
    name: 'Playback',
    commands: ['play', 'join', 'skip', 'stop', 'disconnect']
  },
  {
    name: 'Queue & Modes',
    commands: ['clear', 'loop', 'shuffle', 'autoplay']
  },
  {
    name: 'Spotify',
    commands: ['spotify-sample']
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Menampilkan daftar command music yang tersedia.'),

  async execute(interaction, client) {
    const availableCommands = new Set(client.commands.keys());
    const fields = COMMAND_GROUPS
      .map((group) => ({
        name: group.name,
        value: group.commands
          .filter((name) => availableCommands.has(name))
          .map(formatCommand)
          .join('\n'),
        inline: false
      }))
      .filter((group) => group.value);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎵 Music Bot Commands')
      .setDescription('Gunakan prefix `gm1!` sebelum command.\nContoh: `gm1!play lofi music`')
      .addFields(fields)
      .setFooter({ text: 'Khusus role yang memiliki akses music.' });

    await interaction.reply({
      embeds: [embed]
    });
  }
};

function formatCommand(name) {
  const [usage, description] = COMMAND_DETAILS[name];
  const command = usage ? `gm1!${name} ${usage}` : `gm1!${name}`;
  return `\`${command}\` — ${description}`;
}
