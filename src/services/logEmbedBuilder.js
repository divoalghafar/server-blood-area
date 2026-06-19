const { Colors } = require('discord.js');
const { buildLogEmbed } = require('./loggingService');

function buildMemberJoinLog(member) {
  return buildLogEmbed({
    title: '✅ Member Join',
    color: Colors.Green,
    fields: [
      { name: 'User', value: member.user.tag, inline: false },
      { name: 'ID', value: member.id, inline: false }
    ]
  });
}

function buildMemberLeaveLog(member) {
  return buildLogEmbed({
    title: '❌ Member Leave',
    color: Colors.Red,
    fields: [
      { name: 'User', value: member.user.tag, inline: false },
      { name: 'ID', value: member.id, inline: false }
    ]
  });
}

function buildMessageDeleteLog(message) {
  return buildLogEmbed({
    title: '🗑️ Message Deleted',
    color: Colors.Red,
    fields: [
      { name: 'User', value: message.author?.tag || 'Unknown', inline: false },
      { name: 'Channel', value: message.channel?.name || 'Unknown', inline: false },
      { name: 'Isi Pesan', value: truncate(message.content || '[No content]', 1000), inline: false }
    ]
  });
}

function buildMessageEditLog(oldMessage, newMessage) {
  return buildLogEmbed({
    title: '✏️ Message Edited',
    color: Colors.Orange,
    fields: [
      { name: 'User', value: newMessage.author?.tag || oldMessage.author?.tag || 'Unknown', inline: false },
      { name: 'Channel', value: newMessage.channel?.name || oldMessage.channel?.name || 'Unknown', inline: false },
      { name: 'Sebelum', value: truncate(oldMessage.content || '[No content]', 1000), inline: false },
      { name: 'Sesudah', value: truncate(newMessage.content || '[No content]', 1000), inline: false }
    ]
  });
}

function buildRoleAddedLog(member, role) {
  return buildLogEmbed({
    title: '🎭 Role Ditambahkan',
    color: Colors.Green,
    fields: [
      { name: 'User', value: member.user.tag, inline: false },
      { name: 'Role', value: role.name, inline: false }
    ]
  });
}

function buildRoleRemovedLog(member, role) {
  return buildLogEmbed({
    title: '🎭 Role Dihapus',
    color: Colors.Red,
    fields: [
      { name: 'User', value: member.user.tag, inline: false },
      { name: 'Role', value: role.name, inline: false }
    ]
  });
}

function buildTicketCreatedLog(member, channelName) {
  return buildLogEmbed({
    title: '🎫 Ticket Created',
    color: Colors.Blue,
    fields: [
      { name: 'User', value: member.user.tag, inline: false },
      { name: 'Channel', value: channelName, inline: false }
    ]
  });
}

function buildTicketClosedLog(member, channelName) {
  return buildLogEmbed({
    title: '🔒 Ticket Closed',
    color: Colors.DarkRed,
    fields: [
      { name: 'User', value: member.user.tag, inline: false },
      { name: 'Channel', value: channelName, inline: false }
    ]
  });
}

function buildAnnouncementCreatedLog(announcement) {
  return buildLogEmbed({
    title: '📢 Announcement Created',
    color: Colors.Blurple,
    fields: [
      { name: 'Title', value: announcement.title, inline: false },
      { name: 'Created By', value: announcement.createdBy, inline: false }
    ]
  });
}

function buildConfessionCreatedLog(confession) {
  return buildLogEmbed({
    title: '📩 Confession Created',
    color: Colors.Purple,
    fields: [
      { name: 'ID Confession', value: confession.id, inline: false },
      { name: 'Tanggal', value: new Date(confession.createdAt).toLocaleString('id-ID'), inline: false }
    ]
  });
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

module.exports = {
  buildAnnouncementCreatedLog,
  buildConfessionCreatedLog,
  buildMemberJoinLog,
  buildMemberLeaveLog,
  buildMessageDeleteLog,
  buildMessageEditLog,
  buildRoleAddedLog,
  buildRoleRemovedLog,
  buildTicketClosedLog,
  buildTicketCreatedLog
};
