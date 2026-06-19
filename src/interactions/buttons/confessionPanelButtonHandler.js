const {
  CONFESSION_MODAL_IDS,
  CONFESSION_PANEL_BUTTON_IDS
} = require('../../services/confessionService');

module.exports = {
  customIds: [
    CONFESSION_PANEL_BUTTON_IDS.submit,
    CONFESSION_PANEL_BUTTON_IDS.reply
  ],

  async execute(interaction) {
    if (interaction.customId === CONFESSION_PANEL_BUTTON_IDS.submit) {
      await interaction.showModal(buildSubmitModal());
      return;
    }

    if (interaction.customId === CONFESSION_PANEL_BUTTON_IDS.reply) {
      await interaction.showModal(buildReplyModal());
    }
  }
};

function buildSubmitModal() {
  const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

  return new ModalBuilder()
    .setCustomId(CONFESSION_MODAL_IDS.submit)
    .setTitle('Submit Confession')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('confession_message')
          .setLabel('Pesan')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('confession_target')
          .setLabel('Tag Username Discord (opsional)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(false)
      )
    );
}

function buildReplyModal() {
  const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

  return new ModalBuilder()
    .setCustomId(CONFESSION_MODAL_IDS.reply)
    .setTitle('Reply Confession')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('confession_message')
          .setLabel('Pesan')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('confession_target')
          .setLabel('Tag Username Discord (opsional)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(false)
      )
    );
}
