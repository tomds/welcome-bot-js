const fs = require('fs');

const Discord = require('discord.js');
const config = require('config');
const client = new Discord.Client();
const renderHelpText = require('./help');

// NOTE: When adding to a server, bot needs permission code 268512256, which is:
// - Manage roles
// - View channels
// - Send messages
// - Manage messages
// - Read message history
// https://discordapp.com/oauth2/authorize?client_id=<YOUR_ID_HERE>&scope=bot&permissions=268512256

const roleDefinitions = JSON.parse(fs.readFileSync('config/roles.json'));
const roleNames = Object.keys(roleDefinitions);
const discordRoleNames = Object.values(roleDefinitions).map(role => role.name);

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  if (client.guilds.size === 1) {
    const server = client.guilds.first();
    if (server.id === config.get('homeServer')) {
      client.homeServer = server;
      console.log(`Home server set as ${server.name}`);

      const nickname = client.homeServer.me.nickname || client.user.username;
      client.user.setPresence({game: {name: `@${nickname} help`}});
      return;
    }
  }

  throw 'Should only be connected to the home server!';
});

client.on('message', async message => {
  // Delete messages in welcome channel after a given time (if by non-mod/admin or bot)
  if (message.channel.id === config.get('welcomeChannel')) {
    if (config.get('deleteMessages') && !(message.member.hasPermission(Discord.Permissions.FLAGS.ADMINISTRATOR) || message.member.roles.find(role => role.name === 'Mods')) || message.author.bot) {
      message.delete(config.get('messageDeleteDelay'));
    }
  }

  if (message.author === message.client.user || message.author.bot) {
    return;
  }

  // If bot is mentioned in message, log it
  if (message.channel.type === 'dm' || message.mentions.users.get(message.client.user.id) || message.channel.id === config.get('welcomeChannel')) {
    logIncomingMessage(message);
  }

  if (message.channel.type === 'dm' || message.content.startsWith(`<@${message.client.user.id}> `) || message.channel.id === config.get('welcomeChannel')) {
    const args = message.content.toLowerCase().slice().split(/\s+/);
    const foundRoles = findRoles(args);

    if (args.includes('help')) {
      sendHelpMessage(message);
    } else if (foundRoles.length == 1) {
      const result = await setRole(message, foundRoles[0]);
      if (result) {
        sendReply(message, roleDefinitions[foundRoles[0]].successText);
      } else {
        sendReply(message, config.roleFailText);
      }
    } else if (message.channel.type === 'dm' || message.content.startsWith(`<@${message.client.user.id}> `)) {
      sendReply(message, config['dontUnderstandText']);
    } else if (message.channel.id === config.get('welcomeChannel')) {
      if (!(message.member.hasPermission(Discord.Permissions.FLAGS.ADMINISTRATOR) || message.member.roles.find(role => role.name === config.get('modsRoleName')))) {
        sendReply(message, config['dontUnderstandText']);
      }
    }
  }
});

function findRoles(args) {
  return roleNames.filter(role => args.includes(role));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

client.on('guildMemberAdd', async member => {
  if (!member.user.bot) {
    // When new user joins, wait a few minutes, and if they haven't managed to get a role yet, DM them
    console.log(`New member joined: ${member.user.tag}`);
    await delay(config.get('welcomeDmDelay'));

    if (!member.roles.find(role => discordRoleNames.includes(role.name))) {
      sendHelpMessage(member);
    }
  }
});

async function setRole(message, roleName) {
  let member, roleToAdd, rolesToDelete;

  roleToAdd = roleDefinitions[roleName].name;
  rolesToDelete = discordRoleNames.filter((role) => role !== roleToAdd);

  if (message.member) {  // Non-DM channel
    member = message.member;
    roleToAdd = message.member.guild.roles.find((role) => role.name === roleToAdd);
    rolesToDelete = message.member.guild.roles.filter((role) => rolesToDelete.includes(role.name));
  } else {  // DM
    // See if we already have a reference to the member
    const user = message.author;
    member = message.client.homeServer.member(user);

    // If not, fetch from server
    if (!member) {
      console.warn(`Unable to get member for user ${user} (${user.tag}). Fetching from API...`);
      try {
        member = await message.client.homeServer.fetchMember(user);
      } catch (error) {
        console.warn(`Unable to fetch member for user ${user} (${user.tag}) from API`);
        member = null;

        // Send message to bot owner to notify of failure
        if (config.get('notifyFailures')) {
          const owner = await message.client.fetchUser(config.get('owner'));
          owner.send(`Error: Unable to fetch member for user ${user} from API`);
        }
      }
    }

    // Get roles
    roleToAdd = message.client.homeServer.roles.find((role) => role.name === roleToAdd);
    rolesToDelete = message.client.homeServer.roles.filter((role) => rolesToDelete.includes(role.name));
  }

  if (member) {
    await member.addRole(roleToAdd);
    rolesToDelete.forEach(async role => await member.removeRole(role));

    return true;
  }
}

function logIncomingMessage(message) {
  if (config.get('debug')) {
    const destination = message.channel.type === 'dm' ? '' : `#${message.channel.name} `;
    console.log(`${destination}<- ${message.author.tag}: ${message.content}`);
  }
}

async function sendChannelMessage(channel, user, content) {
  const sentMessage = await channel.send(content);

  if (config.get('debug')) {
    const destination = user ? `${user.tag} (#${channel.name})` : `(#${channel.name})`;
    const contentToLog = truncateMessage(sentMessage.content);
    console.log(`-> ${destination}: ${contentToLog}`);
  }

  return sentMessage;
}

async function sendDm(user, content) {
  try {
    const sentMessage = await user.send(content);

    if (config.get('debug')) {
      const contentToLog = truncateMessage(sentMessage.content);
      console.log(`-> ${user.tag}: ${contentToLog}`);
    }

    return sentMessage;
  } catch (error) {
    console.log(`Failed to DM ${user.tag}: ${error}`);
  }
}

async function sendReply(message, content) {
  const sentMessage = await message.reply(content);

  if (config.get('debug')) {
    const destination = message.channel.type === 'dm' ? message.channel.recipient.tag : `${message.author.tag} (#${message.channel.name})`;
    const contentToLog = truncateMessage(sentMessage.content);
    console.log(`-> ${destination}: ${contentToLog}`);
  }

  return sentMessage;
}

function truncateMessage(content) {
  if (content.length > 90) {
    return content.substring(0, 90) + '...';
  } else {
    return content;
  }
}

async function sendHelpMessage(messageOrMember) {
  const welcomeChannel = client.channels.get(config.get('welcomeChannel'));
  const mainChannel = client.channels.get(config.get('mainChannel'));

  let message, user;
  if (messageOrMember.channel && messageOrMember.channel.type === 'dm') {
    user = messageOrMember.author;
  } else if (messageOrMember.author) {
    message = messageOrMember;
    user = messageOrMember.author;
  } else {
    user = messageOrMember.user;
  }

  const helpText = renderHelpText(user, welcomeChannel, mainChannel);
  if (message) {
    sendChannelMessage(message.channel, user, helpText);
  } else {
    sendDm(user, helpText);
  }
}

client.login(config.get('discordToken'));

// For heroku compatibility
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('O hai');
}).listen(process.env.PORT);
