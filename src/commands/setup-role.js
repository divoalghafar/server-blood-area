const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder
} = require('discord.js');
const {
  ROLE_DEFINITIONS,
  buildTakeRoleEmbed,
  ensureAllTakeRoles,
  findTakeRoleChannel,
  TAKE_ROLE_CHANNEL_NAME
} = require('../utils/takeRoleSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-role')
    .setDescription('Mengirim panel tombol role ke channel take-role.'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Command ini hanya bisa dipakai di server.',
        ephemeral: true
      });
      return;
    }

    const takeRoleChannel = findTakeRoleChannel(interaction.guild);

    if (!takeRoleChannel) {
      await interaction.reply({
        content: `Channel "${TAKE_ROLE_CHANNEL_NAME}" tidak ditemukan. Buat dulu channel itu lewat setup server.`,
        ephemeral: true
      });
      return;
    }

    const roles = await ensureAllTakeRoles(interaction.guild);
    const embed = buildTakeRoleEmbed();
    const components = buildRoleButtons();

    await takeRoleChannel.send({
      embeds: [embed],
      components
    });

    const createdRoles = roles.filter((item) => item.created).map((item) => item.role.name);

    await interaction.reply({
      content: createdRoles.length > 0
        ? `Panel take-role berhasil dikirim. Role baru dibuat: ${createdRoles.join(', ')}`
        : 'Panel take-role berhasil dikirim.',
      ephemeral: true
    });
  }
};

function buildRoleButtons() {
  const buttons = ROLE_DEFINITIONS.map((definition) =>
    new ButtonBuilder()
      .setCustomId(definition.customId)
      .setLabel(definition.label)
      .setStyle(ButtonStyle.Primary)
  );

  return [new ActionRowBuilder().addComponents(buttons)];
}
