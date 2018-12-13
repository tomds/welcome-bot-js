# Discord welcome bot

This bot is designed to welcome new members to your Discord server and allow them to choose a role for themselves without any moderators being involved. It runs in node.js using [discord.js](https://github.com/discordjs/discord.js).

**NOTE:** This bot will only run on ONE server, which you must add to the config. If you invite the bot to multiple servers, it won't run.

For the below examples, assume you have a "Red Team" and "Blue Team" role set up, which users can assign themselves by typing `red` or `blue` respectively in a message to the bot.

The bot expects you to have the following workflow set up:

1. User joins server, arrives in a "welcome" channel for new members, which contains instructions on how to set a role (that have been posted by an admin or mod as a normal message)
2. User sets their own role by typing the appropriate word into the welcome channel e.g. `red`, `blue`. They can also mention the bot with `@BotName#9999` in any channel or send it a PM.
3. Bot gives them the role that matches what they typed. If they type anything other than the name of one of the roles, it asks them to try again.
4. Bot deletes messages from new users after a certain amout of time, to keep the welcome channel clean and to make sure that future new users can see the welcome message (this can be switched off)
5. If user does not manage to set a role after a certain amount of time, the bot sends them a private message explaining what to do.
6. User now has a role and can proceed to chat in the other channels

Note: you may want to set the server permissions so that new users can ONLY post in the welcome channel until they have chosen a role, but it's up to you.

Users can also type `help` to the bot (in a PM, by mentioning it in a channel or by just typing `help` in the welcome channel) to get instructions on what to do.

## Install

```bash
git clone git@github.com:tomds/welcome-bot-js.git
cd welcome-bot-js
npm install
./setup.sh
```

Before you fire up the program, you will need to create a bot in the Discord developer portal and then edit the config file with the values from the portal.

## Create Discord bot application

1. Go to https://discordapp.com/developers/applications/ and click "New Application"
2. Click "Bot" in the left hand column and OK in the confirmation dialog
3. Give your bot a name and choose an avatar for it (if you want)
4. In the "Token" section, click the Copy button. You will need this later.
5. **IMPORTANT:** turn the "public" switch to OFF
6. Turn on the following permissions:
   - Manage roles
   - View channels
   - Send messages
   - Manage messages
   - Read message history

## Configure

Open up `config/default.json` and change the parameters as appropriate.

**Note:** you will need to copy and paste some IDs from your Discord server. To do this, you first need to turn on Developer Mode in your Discord client (User settings -> Appearance -> Advanced -> Developer Mode). Then when one of the below items requires a Discord ID, you can copy it by right-clicking the server, channel, user etc. in Discord and then "Copy ID".

```
{
    "discordToken": "",  # Paste the token here that you copied from the developer portal

    "homeServer": "",  # Discord ID of your server (right-click on your server, then "Copy ID")

    "owner": "",  # Your Discord user ID (right-click on your own name, then "Copy ID")

    "welcomeChannel": "", # Discord ID of your server's welcome channel

    "mainChannel": "",  # Discord ID of your server's main channel (usually the general chat area)

    "deleteMessages": false,  # Whether to delete messages in the welcome channel after a delay

    "messageDeleteDelay": 10000,  # Delay before deleting messages (in ms i.e. 10000 = 10 seconds)

    "welcomeDmDelay": 180000,  # Delay before PMing user with instructions if they haven't picked a role (in ms)

    "notifyFailures": true,  # Send a PM to the bot owner (you) if there are any problems settings user roles

    "debug": false,  # Print messages to the console that users send to the bot (beware privacy implications!)

    "modsRoleName": "Mods",  # The name of the role that you give to moderators

    "roleFailText": "Sorry, I couldn't add your role :disappointed:. Please see if one of the mods can help.",

    "dontUnderstandText": "Sorry, I don't understand. Please type the name of the role you want (or `help` if you're stuck)."
}
```

## Set up roles

Create the roles on your Discord server, then add the details to `config/roles.json`. For example, if you had two roles `Red Team` and `Blue Team`, and you wanted users to choose a role by typing `red` or `blue` respectively, your file would look like this:

```json
{
  "red": {
    "name": "Red Team",
    "successText": "OK, you are now on the red team!"
  },
  "blue": {
    "name": "Blue Team",
    "successText": "OK, you are now on the blue team!"
  }
}
```

You will also note that you can customise the message that the bot sends to the user once it has successfully set their role, and this can vary by role.

## Edit help text (optional)

You can optionally customise the help message that the bot sends to the user when they type `help` (or if they fail to choose a role within a certain amount of time) by editing `help.js`.

## Invite bot to server

Now you need to go back to the Discord developer portal page for your bot and copy the Client ID from the "General Information" tab. Once you've done this, paste it into this URL, replacing the bit that says `<CLIENT_ID>`:

```
https://discordapp.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot&permissions=268512256
```

Then copy the URL and paste it into a web browser. Choose your server from the dropdown and click OK.

## Run the bot!

Your bot is now ready to run:

```
node .
```

You should then see something like:

```
Logged in as WelcomeBotJs#9999
Home server set as MyServer
```

The bot should now be online in your Discord server and you should be able to send it a message containing one of your short role names e.g. `red`, `blue`. If it changes your role and sends you a success message then it's working!
