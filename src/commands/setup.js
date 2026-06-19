const {
  EmbedBuilder,
  SlashCommandBuilder
} = require('discord.js');
const { SETUP_SECTIONS, syncSetupSections } = require('../utils/setupServerStructure');

const SECTION_CHOICES = [
  { name: 'Semua', value: 'all' },
  ...SETUP_SECTIONS.map((section) => ({
    name: section.name,
    value: section.key
  }))
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Tambah atau hapus struktur server.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Tambahkan struktur server.')
        .addStringOption((option) =>
          option
            .setName('kategori')
            .setDescription('Pilih kategori yang ingin ditambahkan.')
            .setRequired(true)
            .addChoices(...SECTION_CHOICES)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Hapus struktur server.')
        .addStringOption((option) =>
          option
            .setName('kategori')
            .setDescription('Pilih kategori yang ingin dihapus.')
            .setRequired(true)
            .addChoices(...SECTION_CHOICES)
        )
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Command ini hanya bisa dipakai di server.',
        ephemeral: true
      });
      return;
    }

    const action = interaction.options.getSubcommand();
    const sectionKey = interaction.options.getString('kategori');

    await interaction.deferReply({ ephemeral: true });

    const summary = await syncSetupSections(interaction.guild, [sectionKey], action);
    const embed = buildSummaryEmbed(action, sectionKey, summary);

    await interaction.editReply({ embeds: [embed] });
  }
};

function buildSummaryEmbed(action, sectionKey, summary) {
  const titleAction = action === 'add' ? 'Tambah' : 'Hapus';
  const targetLabel = getTargetLabel(sectionKey);
  const color = action === 'add' ? 0x2ecc71 : 0xe74c3c;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`Setup Server - ${titleAction}`)
    .setDescription(`Target: **${targetLabel}**`)
    .addFields(
      {
        name: action === 'add' ? '✅ Kategori dibuat' : '✅ Kategori dihapus',
        value: formatList(
          action === 'add' ? summary.createdCategories : summary.deletedCategories,
          action === 'add' ? 'Tidak ada kategori baru dibuat.' : 'Tidak ada kategori yang dihapus.'
        )
      },
      {
        name: action === 'add' ? '✅ Channel dibuat' : '✅ Channel dihapus',
        value: formatList(
          action === 'add' ? summary.createdChannels : summary.deletedChannels,
          action === 'add' ? 'Tidak ada channel baru dibuat.' : 'Tidak ada channel yang dihapus.'
        )
      },
      {
        name: '⚠️ Yang sudah ada',
        value: summary.existingItems.length > 0
          ? summary.existingItems.map((item) => `- ${item}`).join('\n')
          : 'Tidak ada item yang sudah ada sebelumnya.'
      },
      {
        name: 'ℹ️ Yang tidak ditemukan',
        value: summary.missingItems.length > 0
          ? summary.missingItems.map((item) => `- ${item}`).join('\n')
          : 'Tidak ada item yang hilang.'
      }
    )
    .setTimestamp();
}

function formatList(items, fallbackText) {
  if (items.length === 0) {
    return fallbackText;
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function getTargetLabel(sectionKey) {
  if (sectionKey === 'all') return 'Semua kategori';

  const section = SETUP_SECTIONS.find((item) => item.key === sectionKey);
  return section ? section.name : sectionKey;
}
