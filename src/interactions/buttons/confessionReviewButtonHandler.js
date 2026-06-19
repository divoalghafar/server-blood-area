const {
  CONFESSION_REVIEW_BUTTON_IDS,
  approveConfession,
  disableReviewMessage,
  denyConfession,
  denyConfessionWithAction,
  buildDenyReasonModal
} = require('../../services/confessionService');

module.exports = {
  customIdPrefixes: [
    `${CONFESSION_REVIEW_BUTTON_IDS.approve}:`,
    `${CONFESSION_REVIEW_BUTTON_IDS.deny}:`,
    `${CONFESSION_REVIEW_BUTTON_IDS.denyReason}:`,
    `${CONFESSION_REVIEW_BUTTON_IDS.denyConfessban}:`,
    `${CONFESSION_REVIEW_BUTTON_IDS.denyReport}:`
  ],

  async execute(interaction) {
    const [action, confessionId] = interaction.customId.split(':');

    if (!confessionId) {
      await interaction.reply({
        content: 'ID confession tidak valid.',
        ephemeral: true
      });
      return;
    }

    if (action === CONFESSION_REVIEW_BUTTON_IDS.approve) {
      const result = await approveConfession(interaction.guild, confessionId, interaction.user.id);

      if (result.error) {
        await interaction.reply({
          content: result.error,
          ephemeral: true
        });
        return;
      }

      await disableReviewMessage(interaction, '✅ Confession berhasil di-approve.');
      return;
    }

    if (action === CONFESSION_REVIEW_BUTTON_IDS.deny) {
      const updated = await denyConfession(confessionId, null, interaction.user.id);

      if (!updated) {
        await interaction.reply({
          content: 'Confession tidak ditemukan.',
          ephemeral: true
        });
        return;
      }

      await disableReviewMessage(interaction, '❌ Confession ditolak.');
      return;
    }

    if (action === CONFESSION_REVIEW_BUTTON_IDS.denyReason) {
      await interaction.showModal(buildDenyReasonModal(confessionId));
      return;
    }

    if (action === CONFESSION_REVIEW_BUTTON_IDS.denyConfessban) {
      const updated = await denyConfessionWithAction(confessionId, 'confessbanned', null, interaction.user.id);

      if (!updated) {
        await interaction.reply({
          content: 'Confession tidak ditemukan.',
          ephemeral: true
        });
        return;
      }

      await disableReviewMessage(interaction, '⛔ Confession ditolak dan diblokir.');
      return;
    }

    if (action === CONFESSION_REVIEW_BUTTON_IDS.denyReport) {
      const updated = await denyConfessionWithAction(confessionId, 'reported', null, interaction.user.id);

      if (!updated) {
        await interaction.reply({
          content: 'Confession tidak ditemukan.',
          ephemeral: true
        });
        return;
      }

      await disableReviewMessage(interaction, '⚠️ Confession ditolak dan dilaporkan.');
    }
  }
};
