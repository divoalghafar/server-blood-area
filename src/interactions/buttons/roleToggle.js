const { getRoleDefinitionByCustomId, toggleRoleForMember } = require('../../utils/takeRoleSystem');

module.exports = {
  customIds: ['role_developer', 'role_designer', 'role_gamer', 'role_music', 'role_anime'],

  async execute(interaction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: 'Tombol ini hanya bisa dipakai di server.',
        ephemeral: true
      });
      return;
    }

    const roleDefinition = getRoleDefinitionByCustomId(interaction.customId);

    if (!roleDefinition) {
      await interaction.reply({
        content: 'Role tidak ditemukan.',
        ephemeral: true
      });
      return;
    }

    const result = await toggleRoleForMember(interaction, roleDefinition.roleName);

    await interaction.reply({
      content: result.action === 'added'
        ? '✅ Role berhasil ditambahkan'
        : '❌ Role berhasil dihapus',
      ephemeral: true
    });
  }
};
