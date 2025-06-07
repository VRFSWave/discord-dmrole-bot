require('dotenv').config();

const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID;
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

const app = express();

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Webserver running on port ${PORT}`);
});

const commands = [
  new SlashCommandBuilder()
    .setName('dmrole')
    .setDescription('DM all users with a specific role a custom message')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to DM')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands },
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'dmrole') {
    if (!interaction.member.roles.cache.has(OWNER_ROLE_ID)) {
      await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
      return;
    }

    const role = interaction.options.getRole('role');
    const message = interaction.options.getString('message');

    await interaction.reply({ content: `📨 Sending DMs to everyone in ${role.name}...`, ephemeral: true });

    let count = 0;
    for (const member of role.members.values()) {
      if (member.user.bot) continue;

      try {
        await member.send(message);
        count++;
      } catch (err) {
        console.log(`⚠️ Could not DM ${member.user.tag}`);
      }
    }

    await interaction.followUp({ content: `✅ Sent message to ${count} users with the role \`${role.name}\`.` });
  }
});

client.login(TOKEN);
