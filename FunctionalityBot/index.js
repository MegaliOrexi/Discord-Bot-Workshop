const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const Filter = require('leo-profanity');
require('dotenv').config({ path: '../.env' });

// Configure profanity filter
Filter.loadDictionary('en');
Filter.add(['skribbl', 'custom1', 'custom2']); // Add custom words
Filter.remove(['hell', 'assQDD']); // Remove false positives

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Track bot start time for uptime command
const startTime = Date.now();

// Slash Command Definitions
const commands = [
  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays information about a user')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to lookup')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Shows server stats'),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(opt => opt.setName('target').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for warning').setRequired(true)),

  new SlashCommandBuilder()
    .setName('remindme')
    .setDescription('Set a reminder (sent via DM)')
    .addStringOption(opt => opt.setName('time').setDescription('In seconds').setRequired(true))
    .addStringOption(opt => opt.setName('text').setDescription('Reminder text').setRequired(true)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a yes/no poll')
    .addStringOption(opt => opt.setName('question').setDescription('Your poll question').setRequired(true)),

  new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text (mock version)')
    .addStringOption(opt => opt.setName('text').setDescription('Text to translate').setRequired(true))
    .addStringOption(opt => opt.setName('lang').setDescription('Language to translate to').setRequired(true)),

  new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Shows bot uptime')
];

// Register Slash Commands
token = process.env.FUNCTIONALITY_BOT_TOKEN;
clientID = process.env.FUNCTIONALITY_CLIENT_ID;
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    console.log('Refreshing slash commands...');
    // old (global, ~1h propagation)
    // await rest.put(
    //   Routes.applicationCommands(process.env.FUNCTIONALITY_CLIENT_ID),
    //   { body: commands.map(c => c.toJSON()) }
    // );
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.FUNCTIONALITY_CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('Slash command registration failed:', err);
  }
})();

// Profanity Filter Middleware
client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (Filter.check(message.content)) {
    message.delete();
    message.channel.send({
      content: `${message.author} Keep it clean!`,
      embeds: [
        new EmbedBuilder()
          .setColor(0xFF0000)
          .setDescription(`**Violation:** ${Filter.clean(message.content)}`)
      ]
    });
  }
});

// Command Handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const { commandName, options } = interaction;

  try {
    switch (commandName) {
      case 'userinfo':
        await handleUserInfo(interaction, options.getUser('target'));
        break;
      case 'serverinfo':
        await handleServerInfo(interaction);
        break;
      case 'ping':
        await handlePing(interaction);
        break;
      case 'warn':
        await handleWarn(interaction, options.getUser('target'), options.getString('reason'));
        break;
      case 'remindme':
        await handleRemindMe(interaction, options.getString('time'), options.getString('text'));
        break;
      case 'poll':
        await handlePoll(interaction, options.getString('question'));
        break;
      case 'translate':
        await handleTranslate(interaction, options.getString('text'), options.getString('lang'));
        break;
      case 'uptime':
        await handleUptime(interaction);
        break;
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '❌ Something went wrong!', ephemeral: true });
  }
});

// Command Implementations
async function handleUserInfo(interaction, user) {
  const target = user || interaction.user;
  const member = await interaction.guild.members.fetch(target.id);
  const embed = new EmbedBuilder()
    .setColor(0x00AE86)
    .setTitle(`👤 User Info: ${target.username}`)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: 'Username', value: target.tag, inline: true },
      { name: 'ID', value: target.id, inline: true },
      { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Roles', value: member.roles.cache.map(r => r.name).join(', ').replace('@everyone', ' ') || 'None' }
    );
  await interaction.reply({ embeds: [embed] });
}

async function handleServerInfo(interaction) {
  const { guild } = interaction;
  const embed = new EmbedBuilder()
    .setColor(0x7289DA)
    .setTitle(`📊 Server Info: ${guild.name}`)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: 'Members', value: `${guild.memberCount}`, inline: true },
      { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
      { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
      { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true }
    );
  await interaction.reply({ embeds: [embed] });
}

async function handlePing(interaction) {
  const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(`🏓 Pong! Latency: ${latency}ms. API: ${Math.round(client.ws.ping)}ms.`);
}

async function handleWarn(interaction, user, reason) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    return interaction.reply({ content: '❌ You don’t have permission to warn users.', ephemeral: true });
  }
  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('⚠️ User Warned')
    .addFields(
      { name: 'User', value: user.tag, inline: true },
      { name: 'Reason', value: reason, inline: true },
      { name: 'Moderator', value: interaction.user.tag, inline: true }
    );
  await interaction.reply({ embeds: [embed] });
}

async function handleRemindMe(interaction, time, text) {
  const seconds = parseInt(time);
  if (isNaN(seconds) || seconds <= 0) {
    return interaction.reply({ content: '❌ Invalid time (in seconds).', ephemeral: true });
  }
  await interaction.reply(`⏰ Reminder set for ${seconds} seconds from now.`);
  setTimeout(() => {
    interaction.user.send(`🔔 Reminder: ${text}`).catch(() => {});
  }, seconds * 1000);
}

async function handlePoll(interaction, question) {
  const message = await interaction.reply({ content: `📊 **Poll:** ${question}`, fetchReply: true });
  await message.react('👍');
  await message.react('👎');
}

async function handleTranslate(interaction, text, lang) {
  // Mock translation (replace with actual API integration)
  const translated = `[${lang}] ${text}`;
  await interaction.reply({ content: `🔤 Translated: ${translated}` });
}

async function handleUptime(interaction) {
  const uptime = Date.now() - startTime;
  const seconds = Math.floor((uptime / 1000) % 60);
  const minutes = Math.floor((uptime / (1000 * 60)) % 60);
  const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

  await interaction.reply(`🕒 Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`);
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});


client.login(process.env.FUNCTIONALITY_BOT_TOKEN);
