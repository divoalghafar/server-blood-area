const {
  CONFESSION_DENY_REASON_MODAL_ID,
  denyConfessionWithAction,
  editReviewMessageByConfessionId
} = require('../../services/confessionService');

module.exports = {
  customIdPrefixes: [`${CONFESSION_DENY_REASON_MODAL_ID}:`],

  async execute(interaction) {
    const [, confessionId] = interaction.customId.split(':');
    const reason = interaction.fields.getTextInputValue('reason').trim();

    if (!confessionId) {
      await interaction.reply({
        content: 'ID confession tidak valid.',
        ephemeral: true
      });
      return;
    }

    const updated = await denyConfessionWithAction(confessionId, 'denied', reason, interaction.user.id);

    if (!updated) {
      await interaction.reply({
        content: 'Confession tidak ditemukan.',
        ephemeral: true
      });
      return;
    }

    await editReviewMessageByConfessionId(
      interaction.guild,
      confessionId,
      `❌ Confession ditolak.\nAlasan: ${reason}`
    );

    await interaction.reply({
      content: '✅ Confession berhasil ditolak dengan alasan.',
      ephemeral: true
    });
  }
};
