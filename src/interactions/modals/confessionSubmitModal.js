const {
  CONFESSION_MODAL_IDS,
  findConfessionReviewChannelAsync,
  saveConfession,
  sendConfessionForReview
} = require('../../services/confessionService');

module.exports = {
  customId: CONFESSION_MODAL_IDS.submit,

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Confession hanya bisa digunakan di server.',
        ephemeral: true
      });
      return;
    }

    const message = interaction.fields.getTextInputValue('confession_message').trim();
    const targetUsername = interaction.fields.getTextInputValue('confession_target')?.trim() || '';

    const validationError = validateSubmit(message, targetUsername);
    if (validationError) {
      await interaction.reply({
        content: validationError,
        ephemeral: true
      });
      return;
    }

    const reviewChannel = await findConfessionReviewChannelAsync(interaction.guild);
    if (!reviewChannel) {
      await interaction.reply({
        content: 'Channel #acc-confession tidak ditemukan.',
        ephemeral: true
      });
      return;
    }

    const confession = await saveConfession({
      authorId: interaction.user.id,
      submissionType: 'submit',
      title: '',
      message,
      targetUsername: targetUsername || null
    });

    await sendConfessionForReview(reviewChannel, confession);

    await interaction.reply({
      content: '✅ Confession berhasil dikirim secara anonim.',
      ephemeral: true
    });
  }
};

function validateSubmit(message, targetUsername) {
  if (targetUsername.length > 100) return 'Tag username maksimal 100 karakter.';

  return null;
}
