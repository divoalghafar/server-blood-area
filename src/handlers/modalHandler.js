const fs = require('node:fs');
const path = require('node:path');

function loadModals(client) {
  const modalsPath = path.join(__dirname, '..', 'interactions', 'modals');
  const modalFiles = fs.readdirSync(modalsPath).filter((file) => file.endsWith('.js'));

  client.modalPatterns = [];

  for (const file of modalFiles) {
    const filePath = path.join(modalsPath, file);
    const modal = require(filePath);

    if ((!modal?.customId && !Array.isArray(modal?.customIds) && !Array.isArray(modal?.customIdPrefixes)) || !modal?.execute) {
      continue;
    }

    const ids = Array.isArray(modal.customIds) ? modal.customIds : [modal.customId];

    for (const id of ids) {
      client.modals.set(id, modal);
    }

    const prefixes = Array.isArray(modal.customIdPrefixes) ? modal.customIdPrefixes : [];
    for (const prefix of prefixes) {
      client.modalPatterns.push({ prefix, modal });
    }
  }
}

module.exports = { loadModals };
