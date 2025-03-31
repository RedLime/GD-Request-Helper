// eslint-disable-next-line no-unused-vars
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelSelectMenuBuilder, ChannelSelectMenuInteraction, ChannelType, ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, ModalBuilder, ModalSubmitInteraction, PermissionsBitField, RoleSelectMenuBuilder, RoleSelectMenuInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { ServerConfig } from "../database.js";
import * as app from '../../app.js';
import LevelType from "./level_type.js";
import BitChecker from "./bit_checker.js";


export class ConfigureRequirement extends BitChecker {

    static MODERATOR_ROLE = 1 << 0;
    static CLASSIC_CHANNEL_NOT_SELECTED = 1 << 1;
    static CLASSIC_DEMON_CHANNEL_NOT_SELECTED = 1 << 2;
    static PALTFORMER_CHANNEL_NOT_SELECTED = 1 << 3;
    static PALTFORMER_DEMON_CHANNEL_NOT_SELECTED = 1 << 4;
    static CLASSIC_CHANNEL_INVALID = 1 << 5;
    static CLASSIC_DEMON_CHANNEL_INVALID = 1 << 6;
    static PALTFORMER_CHANNEL_INVALID = 1 << 7;
    static PALTFORMER_DEMON_CHANNEL_INVALID = 1 << 8;
    static CLASSIC_CHANNEL_PERMISSION = 1 << 9;
    static CLASSIC_DEMON_CHANNEL_PERMISSION = 1 << 10;
    static PALTFORMER_CHANNEL_PERMISSION = 1 << 11;
    static PALTFORMER_DEMON_CHANNEL_PERMISSION = 1 << 12;
    static SENT_CHANNEL_NOT_SELECTED = 1 << 13;
    static REJECT_CHANNEL_NOT_SELECTED = 1 << 14;
    static SENT_CHANNEL_INVALID = 1 << 15;
    static REJECT_CHANNEL_INVALID = 1 << 16;
    static SENT_CHANNEL_PERMISSION = 1 << 17;
    static REJECT_CHANNEL_PERMISSION = 1 << 18;

    /** @param {Configure} serverConfig  */
    getContexts(serverConfig) {
        const contexts = new Set();
        if (this.hasFlag(ConfigureRequirement.CLASSIC_CHANNEL_NOT_SELECTED)) contexts.add(`[Page: 1] ${app.messageFormat('warningSelectRequestChannel', LevelType.CLASSIC.context)}`);
        if (this.hasFlag(ConfigureRequirement.CLASSIC_DEMON_CHANNEL_NOT_SELECTED)) contexts.add(`[Page: 1] ${app.messageFormat('warningSelectRequestChannel', LevelType.CLASSIC_DEMON.context)}`);
        if (this.hasFlag(ConfigureRequirement.PALTFORMER_CHANNEL_NOT_SELECTED)) contexts.add(`[Page: 1] ${app.messageFormat('warningSelectRequestChannel', LevelType.PLATFORMER.context)}`);
        if (this.hasFlag(ConfigureRequirement.PALTFORMER_DEMON_CHANNEL_NOT_SELECTED)) contexts.add(`[Page: 1] ${app.messageFormat('warningSelectRequestChannel', LevelType.PLATFORMER_DEMON.context)}`);
        if (this.hasFlag(ConfigureRequirement.CLASSIC_CHANNEL_INVALID)) contexts.add(`[Page: 1] ${app.messageFormat('warningInvalidRequestChannel', LevelType.CLASSIC.context)}`);
        if (this.hasFlag(ConfigureRequirement.CLASSIC_DEMON_CHANNEL_INVALID)) contexts.add(`[Page: 1] ${app.messageFormat('warningInvalidRequestChannel', LevelType.CLASSIC_DEMON.context)}`);
        if (this.hasFlag(ConfigureRequirement.PALTFORMER_CHANNEL_INVALID)) contexts.add(`[Page: 1] ${app.messageFormat('warningInvalidRequestChannel', LevelType.PLATFORMER.context)}`);
        if (this.hasFlag(ConfigureRequirement.PALTFORMER_DEMON_CHANNEL_INVALID)) contexts.add(`[Page: 1] ${app.messageFormat('warningInvalidRequestChannel', LevelType.PLATFORMER_DEMON.context)}`);
        if (this.hasFlag(ConfigureRequirement.CLASSIC_CHANNEL_PERMISSION)) contexts.add(`[Page: 1] ${app.messageFormat('errorPermissionChannelMessage', LevelType.CLASSIC.configSelector(serverConfig).channel)}`);
        if (this.hasFlag(ConfigureRequirement.CLASSIC_DEMON_CHANNEL_PERMISSION)) contexts.add(`[Page: 1] ${app.messageFormat('errorPermissionChannelMessage', LevelType.CLASSIC_DEMON.configSelector(serverConfig).channel)}`);
        if (this.hasFlag(ConfigureRequirement.PALTFORMER_CHANNEL_PERMISSION)) contexts.add(`[Page: 1] ${app.messageFormat('errorPermissionChannelMessage', LevelType.PLATFORMER.configSelector(serverConfig).channel)}`);
        if (this.hasFlag(ConfigureRequirement.PALTFORMER_DEMON_CHANNEL_PERMISSION)) contexts.add(`[Page: 1] ${app.messageFormat('errorPermissionChannelMessage', LevelType.PLATFORMER_DEMON.configSelector(serverConfig).channel)}`);
        if (this.hasFlag(ConfigureRequirement.SENT_CHANNEL_NOT_SELECTED)) contexts.add(`[Page: 1] ${app.message.warningSelectSentChannel}`);
        if (this.hasFlag(ConfigureRequirement.REJECT_CHANNEL_NOT_SELECTED)) contexts.add(`[Page: 1] ${app.message.warningSelectRejectChannel}`);
        if (this.hasFlag(ConfigureRequirement.SENT_CHANNEL_INVALID)) contexts.add(`[Page: 1] ${app.message.warningInvalidSentChannel}`);
        if (this.hasFlag(ConfigureRequirement.REJECT_CHANNEL_INVALID)) contexts.add(`[Page: 1] ${app.message.warningInvalidRejectChannel}`);
        if (this.hasFlag(ConfigureRequirement.SENT_CHANNEL_INVALID)) contexts.add(`[Page: 1] ${app.messageFormat('errorPermissionChannelMessage', serverConfig.request.result.sentChannel)}`);
        if (this.hasFlag(ConfigureRequirement.REJECT_CHANNEL_INVALID)) contexts.add(`[Page: 1] ${app.messageFormat('errorPermissionChannelMessage', serverConfig.request.result.rejectChannel)}`);
        if (this.hasFlag(ConfigureRequirement.MODERATOR_ROLE)) contexts.add(`[Page: 2] ${app.message.warningSelectModeratorRole}`);
        return [...contexts];
    }

}


export default class ServerManager {

    /** @typedef {import("mongoose").HydratedDocument<import("mongoose").InferSchemaType<typeof ServerConfig.schema>>} Configure */
    /** @typedef {ChatInputCommandInteraction | StringSelectMenuInteraction | ButtonInteraction | ModalSubmitInteraction} ChatBaseInteraction */

    static MAX_CONFIGURE_PAGE = 4;
    static ERROR_MESSAGE_TYPE = {
        'typeDisabled': 'When request has disabled',
        'requestClosed': 'When request has closed',
        'duringCooldown': 'When in request cooldown'
    };
    static ERROR_MESSAGE_PLACEHOLDER = {
        'typeDisabled': app.message.defaultMessageRequestDisabled,
        'requestClosed': app.message.defaultMessageRequestClosed,
        'duringCooldown': app.message.defaultMessageRequestCooldown
    };
    static ROLE_TYPE = {
        'moderator': { emoji: app.emoji.moderator, name: 'Moderator Role', field: 'moderatorRoleId' },
        'whitelist': { emoji: app.emoji.friends, name: 'Request Whitelist Role', field: 'whitelistRoleId' },
        'blacklist': { emoji: app.emoji.blocked, name: 'Request Blacklist Role', field: 'blockedRoleId' },
        'bypass': { emoji: app.emoji.allow, name: 'Cooldown Bypass Role', field: 'cooldownBypassRoleId' },
    };
    static RESULT_CHANNEL_TYPE = {
        'sent': { emoji: app.emoji.sent_normal, name: 'Sent Channel', field: 'sentChannel' },
        'reject': { emoji: app.emoji.deny, name: 'Reject Channel', field: 'rejectChannel' },
    };

    /** @param {ChatInputCommandInteraction} interaction  */
    static async tryOpenRequest(interaction) {
        const serverConfig = await ServerConfig.findById(interaction.guildId).exec();
        if (!serverConfig) {
            await interaction.editReply({ content: app.message.errorServerNotInit });
            return;
        }

        if (!serverConfig.moderatorRoleId) {
            await interaction.editReply({ content: app.message.errorModeratorRoleNone });
            return;
        }

        if (!interaction.member.roles.cache.has(serverConfig.moderatorRoleId)) {
            await interaction.editReply({ content: app.messageFormat('errorPermissionModeratorRole', serverConfig.moderatorRoleId) });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        let closeTime = Number.MAX_SAFE_INTEGER;
        let closeRequests = 0;
        if (subcommand == 'by-requests' || subcommand == 'by-time-requests') {
            closeRequests = interaction.options.getInteger('count');
        }
        if (subcommand == 'by-time' || subcommand == 'by-time-requests') {
            closeTime = Date.now();
            const afterTime = closeTime;
            closeTime += (interaction.options.getInteger('days', false) || 0) * 24 * 60 * 60 * 1000;
            closeTime += (interaction.options.getInteger('hours', false) || 0) * 60 * 60 * 1000;
            closeTime += (interaction.options.getInteger('minutes', false) || 0) * 60 * 1000;
            closeTime += (interaction.options.getInteger('seconds', false) || 0) * 1000;
            if (closeTime == afterTime && !closeRequests) {
                await interaction.editReply({ content: app.message.errorNoArgument });
                return;
            }
        }

        const result = await this.openRequest(interaction, serverConfig, closeTime, closeRequests);
        const flag = serverConfig.adminNotify.openChannel ? MessageFlags.Ephemeral : undefined;
        await interaction.editReply({ content: app.messageFormat('successRequestOpen', result.join(' or ')), flags: flag });
    }

    /**
     * @param {ChatInputCommandInteraction?} interaction
     * @param {import("mongoose").HydratedDocument<import("mongoose").InferSchemaType<typeof ServerConfig.schema>>} serverConfig
     * @param {number} closeTime
     * @param {number} closeRequests
     */
    static async openRequest(interaction, serverConfig, closeTime, closeRequests) {
        const conditions = [];
        if (closeRequests) conditions.push(`after ${closeRequests} requests`);
        if (closeTime != Number.MAX_SAFE_INTEGER) conditions.push(`at <t:${parseInt(closeTime / 1000)}:f>`);
        if (!conditions.length) conditions.push(`close manually`);

        serverConfig.openUntil = closeTime;
        serverConfig.remainRequests = closeRequests;
        serverConfig.closeAnnounced = false;

        const channel = await app.client.channels.fetch(serverConfig.adminNotify.openChannel, { force: false }).catch(() => null);
        if (!channel || channel.type != ChannelType.GuildText) {
            serverConfig.set('adminNotify.openChannel', null);
            await serverConfig.save();
            return conditions;
        }
        await serverConfig.save();

        channel.send({ content: `Request is opened now. Until: ${conditions.join(' or ')}\n${interaction ? `-# Triggered by: <@${interaction.user.id}>` : ''}`, allowedMentions: { users: [] } });
        return conditions;
    }

    /** @param {ChatInputCommandInteraction} interaction  */
    static async tryCloseRequest(interaction) {
        const serverConfig = await ServerConfig.findById(interaction.guildId).exec();
        if (!serverConfig) {
            await interaction.editReply({ content: app.message.errorServerNotInit });
            return;
        }

        if (!serverConfig.moderatorRoleId) {
            await interaction.editReply({ content: app.message.errorModeratorRoleNone });
            return;
        }

        if (!interaction.member.roles.cache.has(serverConfig.moderatorRoleId)) {
            await interaction.editReply({ content: app.messageFormat('errorPermissionModeratorRole', serverConfig.moderatorRoleId) });
            return;
        }

        await this.closeRequest(null, serverConfig, 'manual');
        const flag = serverConfig.adminNotify.closeChannel ? MessageFlags.Ephemeral : undefined;
        await interaction.editReply({ content: app.message.successRequestClose, flags: flag });
    }

    /**
     * @param {ChatInputCommandInteraction?} interaction
     * @param {import("mongoose").HydratedDocument<import("mongoose").InferSchemaType<typeof ServerConfig.schema>>} serverConfig
     * @param {'time'|'count'|'manual'} type
     */
    static async closeRequest(interaction, serverConfig, type) {
        serverConfig.openUntil = 0;
        serverConfig.remainRequests = 0;
        serverConfig.closeAnnounced = true;

        const channel = await app.client.channels.fetch(serverConfig.adminNotify.closeChannel, { force: false }).catch(() => null);
        if (!channel || channel.type != ChannelType.GuildText) {
            serverConfig.set('adminNotify.closeChannel', null);
            await serverConfig.save();
            return;
        }
        await serverConfig.save();

        const closeContext = {
            'time': 'Request close time has arrived',
            'count': 'The specified number of requests were received.',
            'manual': 'Manually.'
        };

        channel.send({ content: `Request is closed now. Closed by: ${closeContext[type]}\n${interaction ? `-# Triggered by: <@${interaction.user.id}>` : ''}`, allowedMentions: { users: [] } });
    }

    /** @param {Configure} serverConfig */
    static async onRequestSubmitted(serverConfig) {
        if (serverConfig.remainRequests > 0) {
            serverConfig.remainRequests -= 1;
            if (serverConfig.remainRequests <= 0) {
                await this.closeRequest(null, serverConfig, 'count');
            } else {
                await serverConfig.save();
            }
        }
    }

    static async checkCloseCycle() {
        const serverConfigs = await ServerConfig.find({ closeAnnounced: false, openUntil: { $lt: Date.now() } }).exec();
        for await (const serverConfig of serverConfigs) {
            await this.closeRequest(null, serverConfig, 'time');
        }
    }

    /** @param {Configure} serverConfig */
    static getRequestChannelsState(serverConfig) {
        let string = '';
        for (const type of LevelType.all()) {
            const configure = type.configSelector(serverConfig);
            const requires = [];
            if (configure.videoRequired) requires.push('Video');
            if (configure.noteRequired) requires.push('Note');
            string = string + `- ${type.getEmoji()} **${type.context}**: ${!configure.channel ? app.message.stateNoSelectedChannel : `<#${configure.channel}> ${configure.enable ? `${app.emoji.allow} Enabled` : `${app.emoji.deny} Disabled`}${requires.length ? ` (Required ${requires.join('/')})` : ''}`}\n`;
        }
        return string.substring(0, string.length - 1);
    }

    /** @param {Configure} serverConfig */
    static getResultChannelsState(serverConfig) {
        return Object.values(this.RESULT_CHANNEL_TYPE).map(channel => `- **${channel.emoji} ${channel.name}:** ${serverConfig.request.result[channel.field] ? `<#${serverConfig.request.result[channel.field]}>` : app.message.stateNoSelectedChannel}`).join('\n');
    }

    /** @param {Configure} serverConfig */
    static getRolesState(serverConfig) {
        return Object.values(this.ROLE_TYPE).map(role => `- **${role.emoji} ${role.name}:** ${serverConfig[role.field] ? `<@&${serverConfig[role.field]}>` : 'None'}`).join('\n');
    }

    /** @param {Configure} serverConfig */
    static getMessagesState(serverConfig) {
        return `- **${this.ERROR_MESSAGE_TYPE['requestClosed']}:** \`\`\`${serverConfig.message.requestClosed}\`\`\`` + '\n' +
            `- **${this.ERROR_MESSAGE_TYPE['typeDisabled']}:** \`\`\`${serverConfig.message.typeDisabled}\`\`\`` + '\n' +
            `- **${this.ERROR_MESSAGE_TYPE['duringCooldown']}:** \`\`\`${serverConfig.message.duringCooldown}\`\`\``;
    }

    static getAdditionalQuestionState(serverConfig) {
        return `- **Enabled:** ${serverConfig.extraQuestion.enable ? `${app.emoji.allow} Yes` : `${app.emoji.deny} No`}` + '\n' +
            `- **Question:** ${serverConfig.extraQuestion.context ? `\`${serverConfig.extraQuestion.context}\`` : 'None'}` + '\n' +
            `- **Required:** ${serverConfig.extraQuestion.required ? `${app.emoji.allow} Yes` : `${app.emoji.deny} No`}`;
    }

    static getLoggingsState(serverConfig) {
        return `- **Request open:** ${serverConfig.adminNotify.openChannel ? `<#${serverConfig.adminNotify.openChannel}>` : 'None'}` + '\n' +
            `- **Request close:** ${serverConfig.adminNotify.closeChannel ? `<#${serverConfig.adminNotify.closeChannel}>` : 'None'}`;
    }

    static getGDPSState(serverConfig) {
        return serverConfig.gdpsMode ? `${app.emoji.allow} Yes (In-game server check is DISABLED)` : `${app.emoji.deny} No (In-game server check is ENABLED)`;
    }

    /**
     * @param {ChatBaseInteraction} interaction
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     * @param {number} page
     */
    static async generateConfigContext(interaction, followMessage, page = 1) {
        const serverConfig = await ServerConfig.findOneAndUpdate({ _id: interaction.guildId }, { $setOnInsert: { _id: interaction.guildId } }, { new: true, upsert: true }).lean().exec();
        const embeds = [], components = [];

        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config:${interaction.user.id}:${page - 1}`).setEmoji(app.emoji.page_prev).setLabel('Prev Page').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
            new ButtonBuilder().setCustomId(`config:${interaction.user.id}:${page + 1}`).setEmoji(app.emoji.page_next).setLabel('Next Page').setStyle(ButtonStyle.Secondary).setDisabled(page >= this.MAX_CONFIGURE_PAGE)
        ));

        const optionMenu = new StringSelectMenuBuilder()
            .setCustomId(`config:${interaction.user.id}`)
            .setPlaceholder('Select an option to change on this menu...');

        const embed = new EmbedBuilder().setColor(Colors.Aqua).setTitle('Request Configurations').setFooter({ text: `Current Page: ${page}/${this.MAX_CONFIGURE_PAGE}` });
        embeds.push(embed);
        if (page == 1) {
            embed.addFields(
                {
                    name: `Request Status`,
                    value: `- Request **${serverConfig.openUntil ? `${app.emoji.allow} Opened` : `${app.emoji.deny} Closed`}**${serverConfig.openUntil && serverConfig.openUntil != Number.MAX_SAFE_INTEGER ? ` until at <t:${parseInt(serverConfig.openUntil / 1000)}:f>` : ''}\n` +
                        `- **Remaining requests to be closed:** ${serverConfig.remainRequests || '-'}\n` +
                        `- **Request cooldown:** ${serverConfig.cooldown ? app.formatDuration(serverConfig.cooldown) : 'None'}\n`
                },
                {
                    name: `Request Channels`,
                    value: this.getRequestChannelsState(serverConfig)
                },
                {
                    name: `Result Channels`,
                    value: this.getResultChannelsState(serverConfig)
                }
            );
            optionMenu.addOptions(
                new StringSelectMenuOptionBuilder().setValue('cooldown').setLabel('Request Cooldown'),
                new StringSelectMenuOptionBuilder().setValue('req-channels').setLabel('Request Channels'),
                new StringSelectMenuOptionBuilder().setValue('result-channels').setLabel('Result Channels'),
            );
        }
        if (page == 2) {
            embed.addFields(
                {
                    name: `Roles`,
                    value: this.getRolesState(serverConfig)
                },
                {
                    name: `Additional Question Field`,
                    value: this.getAdditionalQuestionState(serverConfig)
                },
            );
            optionMenu.addOptions(
                new StringSelectMenuOptionBuilder().setValue('roles').setLabel('Roles'),
                new StringSelectMenuOptionBuilder().setValue('question').setLabel('Additional Question Field'),
            );
        }
        if (page == 3) {
            embed.addFields(
                {
                    name: `Messages`,
                    value: this.getMessagesState(serverConfig)
                },
                {
                    name: `Logging Channels`,
                    value: this.getLoggingsState(serverConfig)
                }
            );
            optionMenu.addOptions(
                new StringSelectMenuOptionBuilder().setValue('messages').setLabel('Messages'),
                new StringSelectMenuOptionBuilder().setValue('loggings').setLabel('Logging Channels')
            );
        }
        if (page == 4) {
            embed.addFields(
                {
                    name: `GDPS Mode`,
                    value: this.getGDPSState(serverConfig)
                }
            );
            optionMenu.addOptions(
                new StringSelectMenuOptionBuilder().setValue('gdps').setLabel('GDPS Mode'),
            );
        }
        const requirement = await this.getRequirement(interaction, serverConfig);
        if (!requirement.isEmpty()) {
            embeds.push(new EmbedBuilder().setColor(Colors.Red).setTitle(`${app.emoji.exclamation} Basic Requirements`).setDescription(requirement.getContexts(serverConfig).map(c => `- ${c}`).join('\n')));
        }
        components.push(new ActionRowBuilder().addComponents(optionMenu));

        if (serverConfig.migrateCheck) {
            await ServerConfig.updateOne({ _id: serverConfig._id }, { migrateCheck: false });
        }

        await followMessage({ embeds, components });
    }

    /**
     * @param {Configure} serverConfig
     */
    static async getRequirement(interaction, serverConfig) {
        const requirement = new ConfigureRequirement();
        if (!serverConfig.moderatorRoleId) requirement.setFlag(ConfigureRequirement.MODERATOR_ROLE);
        for await (const type of LevelType.all()) {
            const configure = type.configSelector(serverConfig);
            if (!configure.enable) continue;

            if (!configure.channel) {
                if (type == LevelType.CLASSIC) requirement.setFlag(ConfigureRequirement.CLASSIC_CHANNEL_NOT_SELECTED);
                if (type == LevelType.CLASSIC_DEMON) requirement.setFlag(ConfigureRequirement.CLASSIC_DEMON_CHANNEL_NOT_SELECTED);
                if (type == LevelType.PLATFORMER) requirement.setFlag(ConfigureRequirement.PALTFORMER_CHANNEL_NOT_SELECTED);
                if (type == LevelType.PLATFORMER_DEMON) requirement.setFlag(ConfigureRequirement.PALTFORMER_DEMON_CHANNEL_NOT_SELECTED);
                continue;
            }

            const channel = await app.client.channels.fetch(configure.channel, { force: false }).catch(() => null);
            if (!channel || channel.type != ChannelType.GuildText) {
                if (type == LevelType.CLASSIC) requirement.setFlag(ConfigureRequirement.CLASSIC_CHANNEL_INVALID);
                if (type == LevelType.CLASSIC_DEMON) requirement.setFlag(ConfigureRequirement.CLASSIC_DEMON_CHANNEL_INVALID);
                if (type == LevelType.PLATFORMER) requirement.setFlag(ConfigureRequirement.PALTFORMER_CHANNEL_INVALID);
                if (type == LevelType.PLATFORMER_DEMON) requirement.setFlag(ConfigureRequirement.PALTFORMER_DEMON_CHANNEL_INVALID);
                continue;
            }
            const permission = channel.permissionsFor(interaction.guild.members.me);
            if (!permission.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
                if (type == LevelType.CLASSIC) requirement.setFlag(ConfigureRequirement.CLASSIC_CHANNEL_PERMISSION);
                if (type == LevelType.CLASSIC_DEMON) requirement.setFlag(ConfigureRequirement.CLASSIC_DEMON_CHANNEL_PERMISSION);
                if (type == LevelType.PLATFORMER) requirement.setFlag(ConfigureRequirement.PALTFORMER_CHANNEL_PERMISSION);
                if (type == LevelType.PLATFORMER_DEMON) requirement.setFlag(ConfigureRequirement.PALTFORMER_DEMON_CHANNEL_PERMISSION);
            }
        }

        if (!serverConfig.request.result.sentChannel) {
            requirement.setFlag(ConfigureRequirement.SENT_CHANNEL_NOT_SELECTED);
        } else {
            const channel = await app.client.channels.fetch(serverConfig.request.result.sentChannel, { force: false }).catch(() => null);
            if (!channel || channel.type != ChannelType.GuildText) {
                requirement.setFlag(ConfigureRequirement.SENT_CHANNEL_INVALID);
            } else {
                const permission = channel.permissionsFor(interaction.guild.members.me);
                if (!permission.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
                    requirement.setFlag(ConfigureRequirement.SENT_CHANNEL_INVALID);
                }
            }
        }

        if (!serverConfig.request.result.rejectChannel) {
            requirement.setFlag(ConfigureRequirement.REJECT_CHANNEL_NOT_SELECTED);
        } else {
            const channel = await app.client.channels.fetch(serverConfig.request.result.rejectChannel, { force: false }).catch(() => null);
            if (!channel || channel.type != ChannelType.GuildText) {
                requirement.setFlag(ConfigureRequirement.REJECT_CHANNEL_INVALID);
            } else {
                const permission = channel.permissionsFor(interaction.guild.members.me);
                if (!permission.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
                    requirement.setFlag(ConfigureRequirement.REJECT_CHANNEL_INVALID);
                }
            }
        }

        return requirement;
    }

    /**
     * @param {ChatBaseInteraction} interaction
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     * @param {number?} updateType
     */
    static async generateRequestChannelsContext(interaction, followMessage, updateType = null) {
        const serverConfig = await ServerConfig.findById(interaction.guildId);
        const embeds = [], components = [];

        embeds.push(new EmbedBuilder().setTitle('Request Channels Configuration').setDescription(this.getRequestChannelsState(serverConfig)).setColor(Colors.Aqua)
            .addFields(updateType == null ? [] : { name: `Current Selected Request Type`, value: `- ${LevelType.all()[updateType].getEmoji()} ${LevelType.all()[updateType].context}` }));

        if (updateType == null) {
            const levelTypes = LevelType.all();
            for (let index = 0; index < levelTypes.length; index++) {
                const type = levelTypes[index];
                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`config-req-channel:${interaction.user.id}:choose:${index}`).setEmoji(type.getEmoji()).setLabel('Change Channel').setStyle(type.configSelector(serverConfig).channel ? ButtonStyle.Primary : ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`config-req-channel:${interaction.user.id}:enable:${index}`).setEmoji(type.getEmoji()).setLabel((type.configSelector(serverConfig).enable ? 'Disable' : 'Enable') + ' Request').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`config-req-channel:${interaction.user.id}:video:${index}`).setEmoji(type.getEmoji()).setLabel((type.configSelector(serverConfig).videoRequired ? 'Disable' : 'Enable') + ' Video Require').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`config-req-channel:${interaction.user.id}:note:${index}`).setEmoji(type.getEmoji()).setLabel((type.configSelector(serverConfig).noteRequired ? 'Disable' : 'Enable') + ' Note Require').setStyle(ButtonStyle.Secondary)
                ));
            }
        } else {
            components.push(new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId(`config-req-channel:${interaction.user.id}:${updateType}`).setChannelTypes(ChannelType.GuildText).setPlaceholder(`Choose the channel for ${LevelType.all()[updateType].context} request...`)
            ));
        }
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config:${interaction.user.id}:1`).setEmoji(app.emoji.page_prev).setLabel('Back').setStyle(ButtonStyle.Success),
        ));

        await followMessage({ embeds, components });
    }

    /**
     * @param {ChatBaseInteraction} interaction
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     * @param {string?} updateType
     */
    static async generateResultChannelsContext(interaction, followMessage, updateType = null) {
        const serverConfig = await ServerConfig.findById(interaction.guildId);
        const embeds = [], components = [];

        const selectedType = this.RESULT_CHANNEL_TYPE[updateType];
        embeds.push(new EmbedBuilder().setTitle('Request Result Channels Configuration').setDescription(this.getResultChannelsState(serverConfig)).setColor(Colors.Aqua)
            .addFields(!selectedType ? [] : { name: `Current Selected Type`, value: `- ${selectedType.emoji} ${selectedType.name}` }));

        if (!selectedType) {
            const row = new ActionRowBuilder();
            for (const [key, channel] of Object.entries(this.RESULT_CHANNEL_TYPE)) {
                row.addComponents(new ButtonBuilder().setCustomId(`config-result-channel:${interaction.user.id}:${key}`).setEmoji(channel.emoji).setLabel(`Change ${channel.name}`).setStyle(serverConfig.request.result[channel.field] ? ButtonStyle.Primary : ButtonStyle.Danger));
            }
            components.push(row);
        } else {
            components.push(new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId(`config-result-channel:${interaction.user.id}:${updateType}`).setChannelTypes(ChannelType.GuildText).setPlaceholder(`Choose the ${selectedType.name}...`)
            ));
        }
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config:${interaction.user.id}:1`).setEmoji(app.emoji.page_prev).setLabel('Back').setStyle(ButtonStyle.Success),
        ));

        await followMessage({ embeds, components });
    }

    /**
     * @param {ChatBaseInteraction} interaction
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     * @param {string?} type
     */
    static async generateRolesContext(interaction, followMessage, type = null) {
        const serverConfig = await ServerConfig.findById(interaction.guildId);
        const embeds = [], components = [];

        const selectedRole = this.ROLE_TYPE[type];
        embeds.push(new EmbedBuilder().setTitle('Request Roles Configuration').setDescription(this.getRolesState(serverConfig)).setColor(Colors.Aqua)
            .addFields(!selectedRole ? [] : { name: `Current Selected Role Type`, value: `- ${selectedRole.emoji} ${selectedRole.name}` }));

        if (!selectedRole) {
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`config-role:${interaction.user.id}:edit:moderator`).setEmoji(this.ROLE_TYPE.moderator.emoji).setLabel('Change Moderator Role').setStyle(serverConfig.moderatorRoleId ? ButtonStyle.Primary : ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`config-role:${interaction.user.id}:remove:moderator`).setEmoji(app.emoji.remove).setLabel('Remove Moderator Role').setStyle(ButtonStyle.Secondary).setDisabled(!serverConfig.moderatorRoleId),
            ));
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`config-role:${interaction.user.id}:edit:whitelist`).setEmoji(this.ROLE_TYPE.whitelist.emoji).setLabel('Change Whitelist Role').setStyle(serverConfig.whitelistRoleId ? ButtonStyle.Secondary : ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`config-role:${interaction.user.id}:remove:whitelist`).setEmoji(app.emoji.remove).setLabel('Remove Whitelist Role').setStyle(ButtonStyle.Secondary).setDisabled(!serverConfig.whitelistRoleId),
            ));
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`config-role:${interaction.user.id}:edit:blacklist`).setEmoji(this.ROLE_TYPE.blacklist.emoji).setLabel('Change Blacklist Role').setStyle(serverConfig.blockedRoleId ? ButtonStyle.Secondary : ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`config-role:${interaction.user.id}:remove:blacklist`).setEmoji(app.emoji.remove).setLabel('Remove Blacklist Role').setStyle(ButtonStyle.Secondary).setDisabled(!serverConfig.blockedRoleId),
            ));
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`config-role:${interaction.user.id}:edit:bypass`).setEmoji(this.ROLE_TYPE.bypass.emoji).setLabel('Change Bypass Role').setStyle(serverConfig.cooldownBypassRoleId ? ButtonStyle.Secondary : ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`config-role:${interaction.user.id}:remove:bypass`).setEmoji(app.emoji.remove).setLabel('Remove Bypass Role').setStyle(ButtonStyle.Secondary).setDisabled(!serverConfig.cooldownBypassRoleId),
            ));
        } else {
            components.push(new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder().setCustomId(`config-role:${interaction.user.id}:${type}`).setPlaceholder(`Choose the role for ${selectedRole.name}...`)
            ));
        }
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config:${interaction.user.id}:2`).setEmoji(app.emoji.page_prev).setLabel('Back').setStyle(ButtonStyle.Success),
        ));

        await followMessage({ embeds, components });
    }

    /**
     * @param {ChatBaseInteraction} interaction
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     */
    static async generateAdditionalQuestionContext(interaction, followMessage) {
        const serverConfig = await ServerConfig.findById(interaction.guildId);
        const embeds = [], components = [];

        embeds.push(new EmbedBuilder().setTitle('Request Additional Question Configuration').setDescription(this.getAdditionalQuestionState(serverConfig)).setColor(Colors.Aqua));

        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config-question:${interaction.user.id}:enable`).setEmoji(serverConfig.extraQuestion.enable ? app.emoji.deny : app.emoji.allow).setLabel((serverConfig.extraQuestion.enable ? 'Disable' : 'Enable') + ' Question').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`config-question:${interaction.user.id}:required`).setEmoji(serverConfig.extraQuestion.required ? app.emoji.deny : app.emoji.allow).setLabel((serverConfig.extraQuestion.required ? 'Disable' : 'Enable') + ' Requirement').setStyle(ButtonStyle.Secondary)
        ));
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config-question:${interaction.user.id}:question`).setLabel('Change the question').setStyle(ButtonStyle.Primary),
        ));
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config:${interaction.user.id}:2`).setEmoji(app.emoji.page_prev).setLabel('Back').setStyle(ButtonStyle.Success),
        ));

        await followMessage({ embeds, components });
    }

    /**
     * @param {ChatBaseInteraction} interaction
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     */
    static async generateMessagesContext(interaction, followMessage) {
        const serverConfig = await ServerConfig.findById(interaction.guildId);
        const embeds = [], components = [];

        embeds.push(new EmbedBuilder().setTitle('Request Messages Configuration').setDescription(this.getMessagesState(serverConfig)).setColor(Colors.Aqua)
            .addFields({ name: 'Formats', value:
                `- \`{type}\`: for ${this.ERROR_MESSAGE_TYPE['typeDisabled']}` + '\n' +
                `  - Type of the level request. e.g: \`${LevelType.CLASSIC.context}\`` + '\n' +
                `- \`{endTime}\`: for ${this.ERROR_MESSAGE_TYPE['duringCooldown']}` + '\n' +
                `  - Remain time of user's request cooldown. e.g: <t:${parseInt(Date.now() / 1000) + (60 * 5)}:R>`
            }));

        components.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(`config-message:${interaction.user.id}`).setPlaceholder(`Choose the type of message...`).addOptions(
                new StringSelectMenuOptionBuilder().setValue('requestClosed').setLabel(`Change message - ${this.ERROR_MESSAGE_TYPE['requestClosed']}`),
                new StringSelectMenuOptionBuilder().setValue('typeDisabled').setLabel(`Change message - ${this.ERROR_MESSAGE_TYPE['typeDisabled']}`).setDescription('Message when you had disabled specific type of the request'),
                new StringSelectMenuOptionBuilder().setValue('duringCooldown').setLabel(`Change message - ${this.ERROR_MESSAGE_TYPE['duringCooldown']}`)
            )
        ));
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config:${interaction.user.id}:3`).setEmoji(app.emoji.page_prev).setLabel('Back').setStyle(ButtonStyle.Success),
        ));

        await followMessage({ embeds, components });
    }

    /**
     * @param {ChatBaseInteraction} interaction
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     */
    static async generateLoggingsContext(interaction, followMessage) {
        const serverConfig = await ServerConfig.findById(interaction.guildId);
        const embeds = [], components = [];

        embeds.push(new EmbedBuilder().setTitle('Request Logging Configuration').setDescription(this.getLoggingsState(serverConfig)).setColor(Colors.Aqua));

        components.push(new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder().setCustomId(`config-logging:${interaction.user.id}:open`).setChannelTypes(ChannelType.GuildText).setPlaceholder(`Select to change request open logging channel...`)
        ));
        components.push(new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder().setCustomId(`config-logging:${interaction.user.id}:close`).setChannelTypes(ChannelType.GuildText).setPlaceholder(`Select to change request close logging channel...`)
        ));
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config:${interaction.user.id}:3`).setEmoji(app.emoji.page_prev).setLabel('Back').setStyle(ButtonStyle.Success),
        ));

        await followMessage({ embeds, components });
    }

    /**
     * @param {ChatBaseInteraction} interaction
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     */
    static async generateGDPSContext(interaction, followMessage) {
        const serverConfig = await ServerConfig.findById(interaction.guildId);
        const embeds = [], components = [];

        embeds.push(new EmbedBuilder().setTitle('GDPS Mode Configuration').setDescription(this.getGDPSState(serverConfig)).setColor(Colors.Aqua)
            .addFields({ name: 'What is GDPS Mode?', value: app.message.noteGDPSMode }));

        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config-gdps:${interaction.user.id}`).setEmoji(serverConfig.gdpsMode ? app.emoji.moderator : app.emoji.auto).setLabel((serverConfig.gdpsMode ? 'Deactive' : 'Active') + ' GDPS Mode').setStyle(ButtonStyle.Danger)
        ));
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config:${interaction.user.id}:4`).setEmoji(app.emoji.page_prev).setLabel('Back').setStyle(ButtonStyle.Success),
        ));

        await followMessage({ embeds, components });
    }

    /** @param {StringSelectMenuInteraction} interaction */
    static async onSelectOptionMenu(interaction, userId) {
        if (interaction.user.id != userId) return;

        const option = interaction.values[0];

        if (option == 'cooldown') {
            const modal = new ModalBuilder()
                .setCustomId('config-cooldown')
                .setTitle('Update Request Cooldown')
                .addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('cooldown').setLabel('Cooldown ([0d 0h 0m 0s] Format)')
                        .setPlaceholder(`Ex) '2h 30m', '1d 12h' / Type '0s' to disable cooldown.`).setStyle(TextInputStyle.Short).setMaxLength(15).setRequired(true)
                ));
            await interaction.showModal(modal);
        }

        if (option == 'req-channels') {
            await interaction.deferUpdate();
            await this.generateRequestChannelsContext(interaction, c => interaction.editReply(c));
        }

        if (option == 'result-channels') {
            await interaction.deferUpdate();
            await this.generateResultChannelsContext(interaction, c => interaction.editReply(c));
        }

        if (option == 'roles') {
            await interaction.deferUpdate();
            await this.generateRolesContext(interaction, c => interaction.editReply(c));
        }

        if (option == 'messages') {
            await interaction.deferUpdate();
            await this.generateMessagesContext(interaction, c => interaction.editReply(c));
        }

        if (option == 'question') {
            await interaction.deferUpdate();
            await this.generateAdditionalQuestionContext(interaction, c => interaction.editReply(c));
        }

        if (option == 'loggings') {
            await interaction.deferUpdate();
            await this.generateLoggingsContext(interaction, c => interaction.editReply(c));
        }

        if (option == 'gdps') {
            await interaction.deferUpdate();
            await this.generateGDPSContext(interaction, c => interaction.editReply(c));
        }
    }

    /** @param {ModalSubmitInteraction} interaction */
    static async onUpdateCooldown(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const cooldown = app.formatDHMSDuration(interaction.fields.getTextInputValue('cooldown'));

        if (cooldown === null || !Number.isSafeInteger(cooldown)) {
            await interaction.editReply({ content: app.message.errorInvalidFormat });
            return;
        }

        if (cooldown > 1000 * 60 * 60 * 24 * 365) {
            await interaction.editReply({ content: app.message.errorTooLarge });
            return;
        }

        await ServerConfig.updateOne({ _id: interaction.guildId }, { cooldown: cooldown });
        await interaction.editReply({ content: `Updated request cooldown to ${cooldown ? app.formatDuration(cooldown) : 'disabled'}.` });
        await this.generateConfigContext(interaction, (c) => interaction.message.edit(c), 1);
    }

    /**
     * @param {ButtonInteraction} interaction
     * @param {string} userId
     * @param {'choose' | 'enable' | 'video'} field
     * @param {number} typeIndex
     */
    static async onSelectRequestChannelUpdate(interaction, userId, field, typeIndex) {
        if (interaction.user.id != userId) return;

        await interaction.deferUpdate();
        if (field == 'choose') {
            await this.generateRequestChannelsContext(interaction, (c) => interaction.editReply(c), typeIndex);
        } else {
            const levelType = LevelType.all()[typeIndex];
            const keyName = `request.${levelType.field}.${field == 'video' ? 'videoRequired' : field == 'note' ? 'noteRequired' : field}`;
            await ServerConfig.updateOne({ _id: interaction.guildId }, [{ $set: { [keyName]: { $not: `$${keyName}` } } }]);
            await this.generateRequestChannelsContext(interaction, (c) => interaction.editReply(c));
        }
    }

    /**
     * @param {ChannelSelectMenuInteraction} interaction
     * @param {string} userId
     * @param {number} typeIndex
     */
    static async onChooseRequestChannelUpdate(interaction, userId, typeIndex) {
        if (interaction.user.id != userId) return;

        await interaction.deferUpdate();
        const channel = interaction.channels.firstKey();
        const levelType = LevelType.all()[typeIndex];
        const keyName = `request.${levelType.field}.channel`;
        await ServerConfig.updateOne({ _id: interaction.guildId }, { [keyName]: channel });
        await this.generateRequestChannelsContext(interaction, (c) => interaction.editReply(c));
    }

    /**
     * @param {ChannelSelectMenuInteraction} interaction
     * @param {string} userId
     * @param {string} type
     */
    static async onResultChannelUpdate(interaction, userId, type) {
        if (interaction.user.id != userId) return;

        await interaction.deferUpdate();
        const channel = interaction.channels.firstKey();
        const channelType = this.RESULT_CHANNEL_TYPE[type];
        if (!channelType) return;
        const keyName = `request.result.${channelType.field}`;
        await ServerConfig.updateOne({ _id: interaction.guildId }, { [keyName]: channel });
        await this.generateResultChannelsContext(interaction, (c) => interaction.editReply(c));
    }

    /**
     * @param {ButtonInteraction} interaction
     * @param {string} userId
     * @param {string} type
     */
    static async onRoleRemove(interaction, userId, type) {
        if (interaction.user.id != userId) return;

        await interaction.deferUpdate();
        const target = this.ROLE_TYPE[type];
        if (!target) return;
        await ServerConfig.updateOne({ _id: interaction.guildId }, { [target.field]: null });
        await this.generateRolesContext(interaction, (c) => interaction.editReply(c));
    }

    /**
     * @param {RoleSelectMenuInteraction} interaction
     * @param {string} userId
     * @param {string} type
     */
    static async onRoleUpdate(interaction, userId, type) {
        if (interaction.user.id != userId) return;

        await interaction.deferUpdate();
        const selectedRole = interaction.roles.firstKey();
        const target = this.ROLE_TYPE[type];
        if (!target) return;
        await ServerConfig.updateOne({ _id: interaction.guildId }, { [target.field]: selectedRole });
        await this.generateRolesContext(interaction, (c) => interaction.editReply(c));
    }

    /**
     * @param {StringSelectMenuInteraction} interaction
     * @param {string} userId
     */
    static async onSelectMessageUpdate(interaction, userId) {
        if (interaction.user.id != userId) return;

        const serverConfig = await ServerConfig.findById(interaction.guildId);
        const type = interaction.values[0];
        const modal = new ModalBuilder()
            .setCustomId(`config-message:${type}`)
            .setTitle(`Update Message (${this.ERROR_MESSAGE_TYPE[type]})`)
            .addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('message').setLabel('Message').setPlaceholder(this.ERROR_MESSAGE_PLACEHOLDER[type]).setValue(serverConfig.get(`message.${type}`)).setMinLength(3).setMaxLength(200).setStyle(TextInputStyle.Short).setRequired(true)
            ));
        await interaction.showModal(modal);
    }

    /**
     * @param {ModalSubmitInteraction} interaction
     * @param {string} type
     */
    static async onMessageUpdateSubmit(interaction, type) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const message = interaction.fields.getTextInputValue('message');

        await ServerConfig.updateOne({ _id: interaction.guildId }, { [`message.${type}`]: message });
        await interaction.editReply({ content: `Updated request error message ${this.ERROR_MESSAGE_TYPE[type]} to:\n\`\`\`${message}\`\`\`` });
        await this.generateMessagesContext(interaction, (c) => interaction.message.edit(c));
    }

    /**
     * @param {ButtonInteraction} interaction
     * @param {string} userId
     * @param {'enable'|'required'|'question'} type
     */
    static async onSelectAdditionalQuestionUpdate(interaction, userId, type) {
        if (interaction.user.id != userId) return;

        if (type == 'question') {
            const serverConfig = await ServerConfig.findById(interaction.guildId);
            const question = new TextInputBuilder().setCustomId('question').setLabel('Question').setMinLength(3).setMaxLength(45).setRequired(true).setStyle(TextInputStyle.Short);
            if (serverConfig.extraQuestion.context) question.setValue(serverConfig.extraQuestion.context);
            const modal = new ModalBuilder()
                .setCustomId(`config-question`)
                .setTitle('Update Additinal Question')
                .addComponents(new ActionRowBuilder().addComponents(question));
            await interaction.showModal(modal);
        } else {
            await interaction.deferUpdate();
            const keyName = `extraQuestion.${type}`;
            await ServerConfig.updateOne({ _id: interaction.guildId }, [{ $set: { [keyName]: { $not: `$${keyName}` } } }]);
            await this.generateAdditionalQuestionContext(interaction, (c) => interaction.editReply(c));
        }
    }

    /** @param {ModalSubmitInteraction} interaction */
    static async onAdditionalQuestionSubmit(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const question = interaction.fields.getTextInputValue('question');

        await ServerConfig.updateOne({ _id: interaction.guildId }, { 'extraQuestion.context': question });
        await interaction.editReply({ content: `Updated additional question to \`${question}\`` });
        await this.generateAdditionalQuestionContext(interaction, (c) => interaction.message.edit(c));
    }

    /**
     * @param {ChannelSelectMenuInteraction} interaction
     * @param {string} userId
     * @param {string} type
     */
    static async onSelectLoggingChannel(interaction, userId, type) {
        if (interaction.user.id != userId) return;

        const channel = interaction.channels.first();
        if (channel.type != ChannelType.GuildText) return;

        const permission = channel.permissionsFor(interaction.guild.members.me);
        if (!permission.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
            await interaction.reply({ content: `Failed to update logging channel.\n${app.messageFormat('errorPermissionChannelMessage', channel.id)}`, embeds: [], components: [], flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferUpdate();
        const keyName = `adminNotify.${type}Channel`;
        await ServerConfig.updateOne({ _id: interaction.guildId }, { [keyName]: channel });
        await this.generateLoggingsContext(interaction, (c) => interaction.editReply(c));
    }

    /**
     * @param {ButtonInteraction} interaction
     * @param {string} userId
     */
    static async onUpdateGDPSMode(interaction, userId) {
        if (interaction.user.id != userId) return;

        await interaction.deferUpdate();
        const keyName = `gdpsMode`;
        await ServerConfig.updateOne({ _id: interaction.guildId }, [{ $set: { [keyName]: { $not: `$${keyName}` } } }]);
        await this.generateGDPSContext(interaction, (c) => interaction.editReply(c));
    }

}