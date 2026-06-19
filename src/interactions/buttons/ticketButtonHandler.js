const {
  TICKET_BUTTON_IDS,
  handleCancelClose,
  handleCloseTicket,
  handleConfirmClose,
  handleOpenTicket
} = require('../../services/ticketService');

module.exports = {
  customIds: [
    TICKET_BUTTON_IDS.open,
    TICKET_BUTTON_IDS.close,
    TICKET_BUTTON_IDS.confirmClose,
    TICKET_BUTTON_IDS.cancelClose
  ],

  async execute(interaction) {
    if (interaction.customId === TICKET_BUTTON_IDS.open) {
      return handleOpenTicket(interaction);
    }

    if (interaction.customId === TICKET_BUTTON_IDS.close) {
      return handleCloseTicket(interaction);
    }

    if (interaction.customId === TICKET_BUTTON_IDS.confirmClose) {
      return handleConfirmClose(interaction);
    }

    if (interaction.customId === TICKET_BUTTON_IDS.cancelClose) {
      return handleCancelClose(interaction);
    }
  }
};
