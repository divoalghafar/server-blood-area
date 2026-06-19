const { ChannelType } = require('discord.js');

const SETUP_SECTIONS = [
  {
    key: 'information',
    name: 'INFORMATION',
    channels: ['announce', 'info-role', 'take-role', 'booster', 'custom-role']
  },
  {
    key: 'tickets',
    name: 'TICKETS',
    channels: ['submit-report']
  },
  {
    key: 'general-chat',
    name: 'GENERAL CHAT',
    channels: ['general', 'global-chat', 'game-chat', 'media-share', 'bot-commands', 'confession']
  },
  {
    key: 'confession',
    name: 'CONFESSION',
    channels: ['acc-confession']
  }
];

async function syncSetupSections(guild, sectionKeys, action) {
  await guild.channels.fetch();

  const sections = resolveSections(sectionKeys);
  const summary = createSummary();

  for (const section of sections) {
    if (action === 'add') {
      await addSection(guild, section, summary);
    } else if (action === 'remove') {
      await removeSection(guild, section, summary);
    }
  }

  return summary;
}

function resolveSections(sectionKeys) {
  if (sectionKeys.includes('all')) {
    return SETUP_SECTIONS;
  }

  return SETUP_SECTIONS.filter((section) => sectionKeys.includes(section.key));
}

function createSummary() {
  return {
    createdCategories: [],
    createdChannels: [],
    deletedCategories: [],
    deletedChannels: [],
    existingItems: [],
    missingItems: []
  };
}

async function addSection(guild, section, summary) {
  const category = await ensureCategory(guild, section.name, summary);

  for (const channelName of section.channels) {
    await ensureTextChannel(guild, channelName, category.id, summary);
  }
}

async function removeSection(guild, section, summary) {
  for (const channelName of section.channels) {
    await deleteTextChannel(guild, channelName, summary);
  }

  await deleteCategoryIfEmpty(guild, section.name, summary);
}

async function ensureCategory(guild, categoryName, summary) {
  const existingCategory = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
  );

  if (existingCategory) {
    summary.existingItems.push(`Kategori: ${categoryName}`);
    return existingCategory;
  }

  const createdCategory = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory
  });

  summary.createdCategories.push(categoryName);
  return createdCategory;
}

async function ensureTextChannel(guild, channelName, parentId, summary) {
  const existingChannel = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === channelName
  );

  if (existingChannel) {
    summary.existingItems.push(`Channel: ${channelName}`);
    return existingChannel;
  }

  const createdChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId
  });

  summary.createdChannels.push(channelName);
  return createdChannel;
}

async function deleteTextChannel(guild, channelName, summary) {
  const channel = guild.channels.cache.find(
    (item) => item.type === ChannelType.GuildText && item.name === channelName
  );

  if (!channel) {
    summary.missingItems.push(`Channel: ${channelName}`);
    return;
  }

  await channel.delete();
  summary.deletedChannels.push(channelName);
}

async function deleteCategoryIfEmpty(guild, categoryName, summary) {
  const category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
  );

  if (!category) {
    summary.missingItems.push(`Kategori: ${categoryName}`);
    return;
  }

  const remainingChildren = guild.channels.cache.filter(
    (channel) => channel.parentId === category.id
  );

  if (remainingChildren.size > 0) {
    summary.existingItems.push(`Kategori masih punya channel lain: ${categoryName}`);
    return;
  }

  await category.delete();
  summary.deletedCategories.push(categoryName);
}

module.exports = {
  SETUP_SECTIONS,
  syncSetupSections
};
