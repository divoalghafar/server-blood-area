const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');

// In-memory active giveaways map: messageId -> timeoutId (and metadata)
const activeGiveaways = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Buat giveaway — kirim embed, tunggu reaksi, pilih pemenang acak')
    .addStringOption((option) =>
      option.setName('keterangan').setDescription('Keterangan hadiah').setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('durasi')
        .setDescription('Durasi giveaway (angka, mis. 30)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('unit')
        .setDescription('Satuan durasi: Detik, Menit, atau Jam')
        .setRequired(false)
        .addChoices(
          { name: 'Detik', value: 'seconds' },
          { name: 'Menit', value: 'minutes' },
          { name: 'Jam', value: 'hours' }
        )
    )
    .addRoleOption((option) =>
      option
        .setName('role')
        .setDescription('Jika diisi, hanya member dengan role ini yang eligible')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const description = interaction.options.getString('keterangan');
    const duration = interaction.options.getInteger('durasi'); // number
    const unit = interaction.options.getString('unit') || 'minutes'; // seconds|minutes|hours
    const role = interaction.options.getRole('role');

    let channel = null;

    // Always publish to (or create) a channel named 'giveaway'
    if (!interaction.guild) return interaction.editReply('Giveaway hanya bisa dibuat di dalam server.');

    const found = interaction.guild.channels.cache.find(
      (c) => c.isTextBased() && c.name.toLowerCase() === 'giveaway'
    );

    if (found) {
      channel = found;
    } else {
      // Create channel if bot has permission
      const me = interaction.guild.members.me;
      if (!me || !me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.editReply('Tidak ada channel `giveaway` dan saya tidak punya permission untuk membuatnya. Berikan permission Manage Channels atau buat channel bernama `giveaway`.');
      }

      try {
        channel = await interaction.guild.channels.create({
          name: 'giveaway',
          type: ChannelType.GuildText,
          reason: `Create giveaway channel requested by ${interaction.user.tag}`
        });
      } catch (err) {
        console.error('Gagal membuat channel giveaway:', err);
        return interaction.editReply('Gagal membuat channel giveaway. Pastikan saya punya permission yang tepat.');
      }
    }

    const unitMultipliers = {
      seconds: 1,
      minutes: 60,
      hours: 3600
    };

    if (!unitMultipliers[unit]) {
      return interaction.editReply('Unit durasi tidak valid. Pilih salah satu: seconds, minutes, hours.');
    }

    const totalSeconds = duration * unitMultipliers[unit];
    const MAX_SECONDS = 7 * 24 * 3600; // 1 week

    if (duration <= 0 || totalSeconds > MAX_SECONDS) {
      return interaction.editReply('Durasi harus lebih besar dari 0 dan tidak lebih dari 1 minggu.');
    }

    const endAt = Date.now() + totalSeconds * 1000;

    const embed = new EmbedBuilder()
      .setTitle('🎉 Giveaway!')
      .setDescription(description)
      .addFields(
        { name: 'Hosted by', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Ends in', value: `${duration} ${unit}`, inline: true }
      )
      .setFooter({ text: `Hosted by ${interaction.user.tag}` })
      .setTimestamp(endAt);

    if (role) {
      embed.addFields({ name: 'Role requirement', value: `<@&${role.id}>`, inline: true });
    }

    try {
      const msg = await channel.send({ embeds: [embed] });
      await msg.react('🎉');

      // Save giveaway metadata
      const timeoutId = setTimeout(async () => {
        try {
          // Refetch message to ensure reactions are populated
          const fetched = await channel.messages.fetch(msg.id);
          const reaction = fetched.reactions.cache.get('🎉');

          let users = [];
          if (reaction) {
            const usersCollection = await reaction.users.fetch();
            users = usersCollection.filter((u) => !u.bot).map((u) => u);
          }

          // Filter by role if provided
          let eligible = users;
          if (role && eligible.length > 0) {
            const filtered = [];
            for (const u of eligible) {
              try {
                const member = await fetched.guild.members.fetch(u.id);
                if (member && member.roles.cache.has(role.id)) filtered.push(u);
              } catch (e) {
                // ignore fetch errors for a user
              }
            }
            eligible = filtered;
          }

          // Cleanup: remove original embed
          try {
            await fetched.delete();
          } catch (e) {
            // ignore
          }

          if (!eligible || eligible.length === 0) {
            await channel.send({ content: `Giveaway berakhir — tidak ada peserta yang valid.` });
            activeGiveaways.delete(msg.id);
            return;
          }

          const winner = eligible[Math.floor(Math.random() * eligible.length)];

          const announce = new EmbedBuilder()
            .setTitle('🎉 Giveaway Ended')
            .setDescription(`Selamat kepada <@${winner.id}> — kamu menang!`)
            .addFields(
              { name: 'Hosted by', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Prize', value: description, inline: true }
            )
            .setTimestamp();

          await channel.send({ content: `<@${winner.id}>`, embeds: [announce] });
          activeGiveaways.delete(msg.id);
        } catch (err) {
          console.error('Error finishing giveaway:', err);
          activeGiveaways.delete(msg.id);
        }
      }, totalSeconds * 1000);

      activeGiveaways.set(msg.id, { timeoutId, channelId: channel.id, hostId: interaction.user.id });

      await interaction.editReply(`Giveaway dibuat di <#${channel.id}> dan akan berakhir dalam ${duration} ${unit}.`);
    } catch (error) {
      console.error('Failed to create giveaway:', error);
      return interaction.editReply('Gagal membuat giveaway — periksa permission bot (SEND_MESSAGES, ADD_REACTIONS, MANAGE_MESSAGES).');
    }
  }
};
