const { Client, Intents, MessageEmbed } = require('discord.js');
require('dotenv').config();
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

const PREFIX = '!'; // Change the prefix as needed
const logChannelId = '1217776785924554762'; // Channel ID where logs will be sent
const ticketChannelId = '123456789012345678'; // Channel ID where ticket submissions will be sent
const allowedRoles = ['1110518426578989067', '1146786830423957514'];
const allowedChannels = ['1206408569809805392', '1109831822130548867'];

class CustomRoleBot {
    constructor() {
        this.client = client;
        this.prefix = PREFIX;
        this.logChannelId = logChannelId;
        this.ticketChannelId = ticketChannelId;
        this.createdRoles = new Map(); // Map to store user IDs and their created roles

        this.client.once('ready', () => {
            console.log('Bot is ready');
        });

        this.client.on('messageCreate', this.handleMessage.bind(this));
        this.client.on('interactionCreate', this.handleInteraction.bind(this));

        this.setupConsoleLogging();
    }

    setupConsoleLogging() {
        const originalLog = console.log;
        console.log = (...args) => {
            const logMessage = args.join(' ');
            const logEmbed = new MessageEmbed()
                .setColor('#00ff00')
                .setTitle('Console Log')
                .setDescription('```' + logMessage + '```')
                .setTimestamp();
            const logChannel = this.client.channels.cache.get(this.logChannelId);
            if (logChannel && logChannel.isText()) {
                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
            }
            originalLog(...args);
        };
    }

    async handleMessage(message) {
        if (message.author.bot || !message.content.startsWith(this.prefix)) return;

        const args = message.content.slice(this.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'cmr') {
            if (!allowedChannels.includes(message.channel.id)) {
                const wrongChannelEmbed = new MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('❌ Wrong Channel')
                    .setDescription(`You can only use the command in <#1206408569809805392> or <#1109831822130548867>.`)
                    .setTimestamp();

                await message.channel.send({ embeds: [wrongChannelEmbed] });
                return;
            }

            if (!allowedRoles.some(role => message.member.roles.cache.has(role))) {
                const noRoleEmbed = new MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('❌ No Permission')
                    .setDescription('You do not have permission to use this command.')
                    .setTimestamp();

                await message.channel.send({ embeds: [noRoleEmbed] });
                return;
            }

            if (this.createdRoles.has(message.author.id)) {
                const alreadyCreatedEmbed = new MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('❌ Already Created')
                    .setDescription('You have already created a custom role. You can only create one custom role per user.')
                    .setTimestamp();

                await message.channel.send({ embeds: [alreadyCreatedEmbed] });
                return;
            }

            let roleName, roleColor;

            const roleNameMsg = await message.channel.send('📝 What should be the name of the custom role?');
            const filter = m => m.author.id === message.author.id;
            const roleNameCollector = message.channel.createMessageCollector({ filter, time: 60000 });

            roleNameCollector.on('collect', async (msg) => {
                roleName = msg.content;
                await msg.delete();
                await roleNameCollector.stop();
            });

            roleNameCollector.on('end', async () => {
                const roleColorMsg = await message.channel.send('🎨 What should be the color of the custom role? (Please provide in hex format, e.g., #FF0000)');
                const roleColorCollector = message.channel.createMessageCollector({ filter, time: 60000 });

                roleColorCollector.on('collect', async (msg) => {
                    roleColor = msg.content;
                    await msg.delete();
                    await roleColorCollector.stop();
                });

                roleColorCollector.on('end', async () => {
                    await roleColorMsg.delete();

                    if (!roleName || !roleColor) {
                        const formCancelledEmbed = new MessageEmbed()
                            .setColor('#ff0000')
                            .setTitle('❌ Form Submission Cancelled')
                            .setDescription('You did not provide all the required information. Please try again.')
                            .setTimestamp();

                        await message.channel.send({ embeds: [formCancelledEmbed] });
                        return;
                    }

                    // Create the custom role
                    const role = await message.guild.roles.create({
                        name: roleName,
                        color: roleColor,
                    });

                    // Assign the custom role to the user
                    try {
                        await message.member.roles.add(role);
                    } catch (error) {
                        console.error('Failed to assign role:', error);
                        const assignRoleErrorEmbed = new MessageEmbed()
                            .setColor('#ff0000')
                            .setTitle('❌ Role Assignment Failed')
                            .setDescription('Failed to assign the custom role. Please contact a server administrator.')
                            .setTimestamp();

                        await message.channel.send({ embeds: [assignRoleErrorEmbed] });
                        return;
                    }

                    // Position the custom role above the user's highest role
                    const memberHighestRole = message.member.roles.highest;
                    try {
                        await role.setPosition(memberHighestRole.position);
                    } catch (error) {
                        console.error('Failed to position role:', error);
                    }

                    // Update user in channel
                    const successEmbed = new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle('🎉 Custom Role Created')
                        .setDescription(`Your custom role ${role} has been created and assigned to you.`)
                        .setTimestamp();

                    await message.channel.send({ embeds: [successEmbed] });

                    // Suggestion for icon role
                    const suggestionEmbed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('🎨 Need an Icon Role?')
                        .setDescription('If you need an icon role, just DM <@961788342163349574> for assistance.')
                        .setTimestamp();

                    await message.channel.send({ embeds: [suggestionEmbed] });

                    // Log the action
                    const logsChannel = message.guild.channels.cache.get(this.logChannelId);
                    if (logsChannel) {
                        const logEmbed = new MessageEmbed()
                            .setColor('#00ff00')
                            .setTitle('Custom Role Created')
                            .setDescription(`User ${message.author.tag} created a custom role ${roleName}`)
                            .setTimestamp();

                        await logsChannel.send({ embeds: [logEmbed] });
                    }

                    // Update created roles map
                    this.createdRoles.set(message.author.id, roleName);
                });
            });
        }
    }

    async handleInteraction(interaction) {
        // Handle interaction logic
    }

    start() {
        this.client.login(process.env.TOKEN);
    }
}

const customRoleBot = new CustomRoleBot();
customRoleBot.start();

        // Inserted code for nodejs web functionality
        const express = require('express');
        const app = express();
        
        app.get('/', (req, res) => {
            res.send('Hello, Node.js Web!');
        });
        
        app.listen(3000, () => {
            console.log('Node.js Web server running on port 3000');
        });

