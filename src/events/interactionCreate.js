const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        await interaction.reply({
          content: 'Command tidak ditemukan.',
          ephemeral: true
        });
        return;
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);

        const payload = {
          content: 'Terjadi kesalahan saat menjalankan command.',
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      }

      return;
    }

    if (interaction.isButton()) {
      const button = resolveButtonHandler(client, interaction.customId);

      if (!button) {
        await interaction.reply({
          content: 'Tombol tidak ditemukan.',
          ephemeral: true
        });
        return;
      }

      try {
        await button.execute(interaction, client);
      } catch (error) {
        console.error(error);

        const payload = {
          content: 'Terjadi kesalahan saat memproses tombol.',
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      }
    }

    if (interaction.isModalSubmit()) {
      const modal = resolveModalHandler(client, interaction.customId);

      if (!modal) {
        await interaction.reply({
          content: 'Modal tidak ditemukan.',
          ephemeral: true
        });
        return;
      }

      try {
        await modal.execute(interaction, client);
      } catch (error) {
        console.error(error);

        const payload = {
          content: 'Terjadi kesalahan saat memproses modal.',
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      }
    }
  }
};

function resolveButtonHandler(client, customId) {
  const exactMatch = client.buttons.get(customId);
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatch = client.buttonPatterns?.find((entry) => customId.startsWith(entry.prefix));
  return prefixMatch?.button || null;
}

function resolveModalHandler(client, customId) {
  const exactMatch = client.modals.get(customId);
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatch = client.modalPatterns?.find((entry) => customId.startsWith(entry.prefix));
  return prefixMatch?.modal || null;
}
