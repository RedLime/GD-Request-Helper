import * as app from '../../app.js';
// eslint-disable-next-line no-unused-vars
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionContextType, SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, Colors, ChannelType } from "discord.js";
import Submission from '../class/submission.js';
import LevelRequest from '../class/request.js';
import ServerManager from '../class/server_manager.js';

/**
 * @typedef CommandExecutor
 * @property {SlashCommandBuilder} command
 * @property {function(ChatInputCommandInteraction): Promise<void>} execute
 */

/**
 * @type {CommandExecutor[]}
 */
export default [
    {
        command: new SlashCommandBuilder()
            .setName('about')
            .setDescription(`Shows bot's information`)
            .setContexts(InteractionContextType.Guild),
        async execute(interaction) {
            const embed = new EmbedBuilder()
                .setThumbnail(app.client.user.avatarURL())
                .setTitle('GD Request Helper')
                .setDescription('Manage your Geometry Dash Level Requests easily and conveniently!')
                .addFields(
                    {
                        name: 'Author',
                        value: 'RedLime (discord tag: `redlime`)',
                        inline: true
                    }
                );
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(app.config.url.server)
                        .setLabel('Support Server'),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(app.config.url.donate)
                        .setLabel('Donate To Developer'),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(app.config.url.repo)
                        .setLabel('GitHub Repository')
                );
            interaction.reply({ embeds: [embed], components: [row] });
        }
    },
    {
        command: new SlashCommandBuilder()
            .setName('help')
            .setDescription(`Show the guide for setting up the bot.`)
            .setContexts(InteractionContextType.Guild),
        async execute(interaction) {
            const embed = new EmbedBuilder()
                .setTitle('Guide for setup')
                .addFields(
                    { name: `How to setup`, value: app.message.noteSetup },
                    { name: `I'm using this bot for my GDPS server.`, value: app.message.noteGDPSMode }
                );
            const row = new ActionRowBuilder();
            row.addComponents(new ButtonBuilder().setCustomId(`config:${interaction.user.id}:1`).setStyle(ButtonStyle.Primary).setLabel('Open Configuration'));
            await interaction.reply({ embeds: [embed], components: [row] });
        }
    },
    {
        command: new SlashCommandBuilder()
            .setName('request-submit')
            .setDescription(`Send your level request to Moderators of this server`)
            .setContexts(InteractionContextType.Guild),
        async execute(interaction) {
            await Submission.createMessage(interaction);
        }
    },
    {
        command: new SlashCommandBuilder()
            .setName('request')
            .setDescription(`Check the request`)
            .setContexts(InteractionContextType.Guild)
            .addSubcommand(command => command
                .setName('get')
                .setDescription('Check the request by request ID')
                .addIntegerOption(option => option
                    .setName('id')
                    .setDescription('Request ID')
                    .setRequired(true)
                )
            )
            .addSubcommand(command => command
                .setName('allow-resubmit')
                .setDescription('Check the request by request ID')
                .addIntegerOption(option => option
                    .setName('id')
                    .setDescription('Request ID')
                    .setRequired(true)
                )
            ),
        async execute(interaction) {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand == 'get') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                await LevelRequest.generateRequestInfoById(interaction);
            } else {
                await interaction.deferReply();
                await LevelRequest.unfilterRequest(interaction);
            }
        }
    },
    {
        command: new SlashCommandBuilder()
            .setName('request-open')
            .setDescription(`Open the request`)
            .setContexts(InteractionContextType.Guild)
            .addSubcommand(command => command
                .setName('by-requests')
                .setDescription('Closes the request after the specified number of requests.')
                .addIntegerOption(option => option
                    .setName('count')
                    .setDescription('number of requests')
                    .setMinValue(1).setMaxValue(10000)
                    .setRequired(true)
                )
            )
            .addSubcommand(command => command
                .setName('by-time')
                .setDescription('Closes the request after a specified amount of time has passed.')
                .addIntegerOption(option => option
                    .setName('days')
                    .setDescription('duration of days')
                    .setMinValue(1).setMaxValue(30)
                    .setRequired(false)
                )
                .addIntegerOption(option => option
                    .setName('hours')
                    .setDescription('duration of hours')
                    .setMinValue(1).setMaxValue(23)
                    .setRequired(false)
                )
                .addIntegerOption(option => option
                    .setName('minutes')
                    .setDescription('duration of minutes')
                    .setMinValue(1).setMaxValue(59)
                    .setRequired(false)
                )
                .addIntegerOption(option => option
                    .setName('seconds')
                    .setDescription('duration of seconds')
                    .setMinValue(1).setMaxValue(59)
                    .setRequired(false)
                )
            )
            .addSubcommand(command => command
                .setName('by-time-requests')
                .setDescription('Closes the request after the specified number of requests or a specified amount of time has passed.')
                .addIntegerOption(option => option
                    .setName('count')
                    .setDescription('number of requests')
                    .setMinValue(1).setMaxValue(10000)
                    .setRequired(false)
                )
                .addIntegerOption(option => option
                    .setName('days')
                    .setDescription('duration of days')
                    .setMinValue(1).setMaxValue(30)
                    .setRequired(false)
                )
                .addIntegerOption(option => option
                    .setName('hours')
                    .setDescription('duration of hours')
                    .setMinValue(1).setMaxValue(23)
                    .setRequired(false)
                )
                .addIntegerOption(option => option
                    .setName('minutes')
                    .setDescription('duration of minutes')
                    .setMinValue(1).setMaxValue(59)
                    .setRequired(false)
                )
                .addIntegerOption(option => option
                    .setName('seconds')
                    .setDescription('duration of seconds')
                    .setMinValue(1).setMaxValue(59)
                    .setRequired(false)
                )
            )
            .addSubcommand(command => command
                .setName('until-close')
                .setDescription('Request will be not closed unless you close it manually.')
            ),
        async execute(interaction) {
            await interaction.deferReply();
            await ServerManager.tryOpenRequest(interaction);
        }
    },
    {
        command: new SlashCommandBuilder()
            .setName('request-close')
            .setDescription(`Close the request`)
            .setContexts(InteractionContextType.Guild),
        async execute(interaction) {
            await interaction.deferReply();
            await ServerManager.tryCloseRequest(interaction);
        }
    },
    {
        command: new SlashCommandBuilder()
            .setName('config')
            .setDescription(`Open a bot configuration`)
            .setContexts(InteractionContextType.Guild)
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
        async execute(interaction) {
            await interaction.deferReply();
            await ServerManager.generateConfigContext(interaction, (c) => interaction.editReply(c));
        }
    },
    {
        command: new SlashCommandBuilder()
            .setName('setup-button')
            .setDescription(`Send request submit button message in this channel`)
            .setContexts(InteractionContextType.Guild)
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
        async execute(interaction) {
            if (!interaction.channel || interaction.channel.type != ChannelType.GuildText) {
                await interaction.reply({ content: app.message.errorReviewUpdate + '\n' + app.messageFormat('errorChannelInvalid', interaction.channel.id), embeds: [], components: [], flags: MessageFlags.Ephemeral });
                return;
            }

            const permission = interaction.channel.permissionsFor(interaction.guild.members.me);
            if (!permission.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
                await interaction.reply({ content: app.message.errorReviewUpdate + '\n' + app.messageFormat('errorPermissionChannelMessage', interaction.channel.id), embeds: [], components: [], flags: MessageFlags.Ephemeral });
                return null;
            }

            const modal = new ModalBuilder().setCustomId('setup').setTitle('Setup Request Submit Button').addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('context').setMaxLength(1000).setRequired(false).setPlaceholder('Notice to users... (Support Discord Markdown)').setLabel('Notice (Optional)').setStyle(TextInputStyle.Paragraph)
            ));
            await interaction.showModal(modal);
        }
    },
    {
        command: new SlashCommandBuilder()
            .setName('data-deletion')
            .setDescription(`Delete your every requests data from database`),
        async execute(interaction) {
            const embed = new EmbedBuilder()
                .setTitle('Are you sure about delete all your requests?')
                .setDescription(`If you delete all of your requests from the database, all of requests what you have submitted will no longer be available.`)
                .setColor(Colors.Red);
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('delete-confirm')
                        .setStyle(ButtonStyle.Danger)
                        .setLabel('CONFIRM')
                );
            interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
        }
    }
];