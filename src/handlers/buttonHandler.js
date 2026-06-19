const fs = require('node:fs');
const path = require('node:path');

function loadButtons(client) {
  const buttonsPath = path.join(__dirname, '..', 'interactions', 'buttons');
  const buttonFiles = fs.readdirSync(buttonsPath).filter((file) => file.endsWith('.js'));

  client.buttonPatterns = [];

  for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);

    if ((!button?.customId && !Array.isArray(button?.customIds) && !Array.isArray(button?.customIdPrefixes)) || !button?.execute) {
      continue;
    }

    const ids = Array.isArray(button.customIds) ? button.customIds : [button.customId];

    for (const id of ids) {
      client.buttons.set(id, button);
    }

    const prefixes = Array.isArray(button.customIdPrefixes) ? button.customIdPrefixes : [];
    for (const prefix of prefixes) {
      client.buttonPatterns.push({ prefix, button });
    }
  }
}

module.exports = { loadButtons };
