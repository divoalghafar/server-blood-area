function buildWelcomeEmbed(member, channels = {}) {
  return [
    `<a:HeadAdmin:1519018353598009534>  Welcome To **${member.guild.name}!**`,
    '',
    'Sebelum mulai, pastikan kamu cek:',
    '',
    `<a:panahmerah:1519024104882049194> **pengumuman** : ${channels.announce || '#announce'}`,
    `<a:panahmerah:1519024104882049194> **peraturan** : ${channels.rules || '#rules'}`,
    `<a:panahmerah:1519024104882049194> **verif female** : ${channels.girlsVerify || '#girls-verify'}`,
    '',
    'Selamat bergabung dan have fun!'
  ].join('\n');
}

function buildLeaveEmbed(member) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle('😢 Sampai Jumpa')
    .setDescription(`${member.user.username} telah meninggalkan server.\n\nSemoga sukses di tempat lain.`)
    .setTimestamp();
}

module.exports = {
  buildLeaveEmbed,
  buildWelcomeEmbed
};
