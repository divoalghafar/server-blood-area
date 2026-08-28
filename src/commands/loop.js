const { SlashCommandBuilder } = require('discord.js');
const { toggleLoopMode, setLoopMode } = require('../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Mengatur mode loop musik.')
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Mode loop: off (tidak loop), one (loop lagu saat ini), all (loop seluruh queue)')
        .setRequired(false)
        .addChoices(
          { name: 'Off (Tidak Loop)', value: 'off' },
          { name: 'One (Loop Lagu Saat Ini)', value: 'one' },
          { name: 'All (Loop Seluruh Queue)', value: 'all' }
        )
    ),

  async execute(interaction) {
    const mode = interaction.options.getString('mode');

    let result;

    if (mode) {
      result = setLoopMode(interaction.guildId, mode);
    } else {
      result = toggleLoopMode(interaction.guildId);
    }

    await interaction.reply(result.message);
  }
};
