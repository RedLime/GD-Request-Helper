// eslint-disable-next-line no-unused-vars
import { ActionRowBuilder, BaseGuildTextChannel, ChannelType, ChatInputCommandInteraction, Colors, CommandInteraction, EmbedBuilder, MessageFlags, ModalBuilder, ModalSubmitInteraction, PermissionsBitField, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Request, ServerConfig } from "../database.js";
// eslint-disable-next-line no-unused-vars
import Submission from "./submission.js";
import * as app from "../../app.js";
import LevelInfo from "./level_info.js";


export class LevelRequestState {
    constructor(id, status, description) {
        this.id = id;
        this.status = status;
        this.description = description;
    }

    static READY = new LevelRequestState(0, 'ready', null);
    static RATED = new LevelRequestState(1, 'rated', app.message.stateRequestRated);
    static STOLEN = new LevelRequestState(2, 'stolen', app.message.stateRequestStolen);
    static NONE = new LevelRequestState(2, 'none', app.message.stateRequestNotExist);

    static of(id) {
        switch (id) {
            case 1: return this.RATED;
            case 2: return this.STOLEN;
            case 3: return this.NONE;
            default: return this.READY;
        }
    }
}


export class ReviewType {
    constructor(id, type, title, update = null) {
        this.id = id;
        this.type = type;
        this.title = title;
        /** @type {LevelRequestState?} */
        this.updateState = update;
    }

    getEmoji() {
        return app.emoji[this.type];
    }

    createMenu() {
        const menu = new StringSelectMenuOptionBuilder().setEmoji(this.getEmoji()).setLabel(this.title).setValue(String(this.id));
        if (this.updateState) menu.setDescription(app.message.warningReviewUnavailable);
        return menu;
    }

    static SENT = new ReviewType(1, 'sent_normal', 'Sent only');
    static SENT_FEATURED = new ReviewType(2, 'sent_featured', 'Sent with Featured');
    static SENT_EPIC = new ReviewType(3, 'sent_epic', 'Sent with Epic');
    static SENT_LEGENDARY = new ReviewType(4, 'sent_legendary', 'Sent with Legendary');
    static SENT_MYTHIC = new ReviewType(5, 'sent_mythic', 'Sent with Mythic');
    static REJECT = new ReviewType(-1, 'reject_normal', 'Not Sent');
    static REJECT_SENT = new ReviewType(-2, 'reject_sent', 'Already Sent');
    static REJECT_ALREADY_RATED = new ReviewType(-3, 'reject_rated', 'Already Rated', LevelRequestState.RATED);
    static REJECT_STOLEN = new ReviewType(-4, 'reject_stolen', 'Stolen Level', LevelRequestState.STOLEN);
    static REJECT_NOT_EXIST = new ReviewType(-5, 'reject_none', 'Not Exist', LevelRequestState.NONE);

    static of(id) {
        const all = [this.SENT, this.SENT_FEATURED, this.SENT_EPIC, this.SENT_LEGENDARY, this.SENT_MYTHIC, this.REJECT, this.REJECT_SENT, this.REJECT_ALREADY_RATED, this.REJECT_STOLEN, this.REJECT_NOT_EXIST];
        for (const type of all) {
            if (type.id == id) return type;
        }
        return this.REJECT;
    }
}


export default class LevelRequest {

    /** @param {Submission} submission */
    static async create(submission) {
        const request = await Request.create({
            userId: submission.userId,
            guildId: submission.guildId,
            levelId: submission.levelId,
            levelInfo: {
                name: submission.levelName,
                description: submission.levelInfo?.description,
                difficulties: submission.difficulties,
                demon: submission.isDemon,
                platformer: submission.isPlatformer,
                uploader: submission.levelInfo?.uploader ? { name: submission.levelInfo.uploader.name, id: submission.levelInfo.uploader.id } : null,
                legacy: null
            },
            extraQuestion: submission.extraAnswer ? { question: submission.config.extraQuestion.context, answer: submission.extraAnswer } : null,
            note: submission.note,
            gdps: submission.config.gdpsMode,
            videoUrl: submission.getVideoUrl()
        });
        return new LevelRequest(request);
    }

    /**
     * @param {import("discord.js").Interaction} interaction
     * @param {import("mongoose").InferSchemaType<typeof ServerConfig.schema>} serverConfig
     * @param {boolean} isSent
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     */
    static async isAvailableReviewNotifyChannel(interaction, serverConfig, isSent, followMessage) {
        const channelId = serverConfig.request.result[isSent ? 'sentChannel' : 'rejectChannel'];
        const typeContext = isSent ? 'sent' : 'reject';
        if (!channelId) {
            await interaction.reply({ content: app.message.errorReviewUpdate + '\n' + app.messageFormat('errorReviewNoChannel', typeContext), flags: MessageFlags.Ephemeral });
            return null;
        }

        const channel = await app.client.channels.fetch(channelId, { force: false }).catch(() => null);
        if (!channel) {
            await followMessage({ content: app.message.errorReviewUpdate + '\n' + app.messageFormat('errorReviewChannelNotExist', typeContext), embeds: [], components: [], flags: MessageFlags.Ephemeral });
            return null;
        }

        if (channel.type != ChannelType.GuildText || !(channel instanceof BaseGuildTextChannel)) {
            await followMessage({ content: app.message.errorReviewUpdate + '\n' + app.messageFormat('errorChannelInvalid', channel.id), embeds: [], components: [], flags: MessageFlags.Ephemeral });
            return null;
        }

        const permission = channel.permissionsFor(interaction.guild.members.me);
        if (!permission.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
            await followMessage({ content: app.message.errorReviewUpdate + '\n' + app.messageFormat('errorPermissionChannelMessage', channel.id), embeds: [], components: [], flags: MessageFlags.Ephemeral });
            return null;
        }

        return channel;
    }

    /** @param {StringSelectMenuInteraction} interaction */
    static async onSelectReview(interaction, requestId) {
        const reviewType = ReviewType.of(+interaction.values[0]);
        const isSent = reviewType.id > 0;

        const requestData = await Request.findById(requestId);
        if (!requestData) {
            await interaction.reply({ content: app.messageFormat('errorRequestNotExist', requestId), flags: MessageFlags.Ephemeral });
            return;
        }

        const request = new LevelRequest(requestData);
        if (request.state != LevelRequestState.READY) {
            await interaction.reply({ content: app.message.errorReviewUnavailble, flags: MessageFlags.Ephemeral });
            return;
        }

        const serverConfig = await ServerConfig.findById(interaction.guildId).lean().exec();
        if (!serverConfig.moderatorRoleId) {
            await interaction.reply({ content: app.message.errorModeratorRoleNone, flags: MessageFlags.Ephemeral });
            return;
        }

        if (!interaction.member.roles.cache.has(serverConfig.moderatorRoleId)) {
            await interaction.reply({ content: app.messageFormat('errorPermissionModeratorRole', serverConfig.moderatorRoleId), flags: MessageFlags.Ephemeral });
            return;
        }

        if (!await LevelRequest.isAvailableReviewNotifyChannel(interaction, serverConfig, isSent, (c) => interaction.replied(c))) return;

        const modal = new ModalBuilder()
            .setCustomId(`review:${request.id}:${reviewType.id}`)
            .setTitle(`Request Review (${reviewType.title})`);

        const contextInput = new TextInputBuilder()
            .setCustomId('context')
            .setLabel(`Review (Optional)`)
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('You can use Discord Markdown for this!')
            .setMaxLength(500)
            .setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(contextInput));

        const imageInput = new TextInputBuilder()
            .setCustomId('image')
            .setLabel(`Attachment Image Link (Optional)`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://...')
            .setMaxLength(256)
            .setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(imageInput));

        await interaction.showModal(modal);
    }

    /** @param {ModalSubmitInteraction} interaction */
    static async onReceiveReview(interaction, requestId, reviewId) {
        const reviewType = ReviewType.of(reviewId);
        const requestData = await Request.findById(requestId);
        const imageAttachment = interaction.fields.getTextInputValue('image');
        const reviewContext = interaction.fields.getTextInputValue('context') || null;
        if (!requestData) {
            await interaction.editReply({ content: app.messageFormat('errorRequestNotExist', requestId) });
            return;
        }

        const request = new LevelRequest(requestData);
        if (request.state != LevelRequestState.READY) {
            await interaction.editReply({ content: app.message.errorReviewUnavailble });
            return;
        }

        const serverConfig = await ServerConfig.findById(interaction.guildId).lean().exec();
        const channel = await LevelRequest.isAvailableReviewNotifyChannel(interaction, serverConfig, reviewType.id > 0, (c) => interaction.replied(c));
        if (!channel) return;

        const embed = new EmbedBuilder().setDescription(`## ${app.emoji[reviewType.type]} ${reviewType.title}\n### ${request.isGDPS ? request.level.name : `[${request.level.name}](${app.config.url.gdBrowser}/${request.level.id})`} \`[${request.level.id}]\`${reviewContext ? `\n-# Review:\n${reviewContext}` : ''}\n-# Submitted by <@${request.userId}>, Reviewed by <@${interaction.user.id}>`);
        if (imageAttachment && URL.canParse(imageAttachment)) embed.setImage(imageAttachment);
        const message = await channel.send({ content: `-# ||<@${request.userId}>||`, embeds: [embed] });
        await request.addReview(interaction.user.id, reviewType, interaction.fields.getTextInputValue('context') || null, message.url);
        if (reviewType.updateState) await request.setState(reviewType.updateState);
        interaction.message.edit(request.generateContext());
        interaction.editReply({ content: app.message.successReviewUpdate });
    }

    /** @param {ChatInputCommandInteraction} interaction  */
    static async generateRequestInfoById(interaction, customId = null) {
        const id = customId || interaction.options.getInteger('id');

        const serverConfig = await ServerConfig.findById(interaction.guildId).lean().exec();
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

        const requestData = await Request.findById(id);
        if (!requestData) {
            interaction.editReply({ content: app.messageFormat('errorRequestNotExist', id) });
            return;
        }

        if (requestData.guildId != interaction.guildId && !app.config.debug.enable) {
            interaction.editReply({ content: app.message.errorRequestNotLegal });
            return;
        }

        const request = new LevelRequest(requestData);
        interaction.editReply(request.generateContext());
    }

    /** @param {ChatInputCommandInteraction} interaction  */
    static async unfilterRequest(interaction) {
        const id = interaction.options.getInteger('id');

        const serverConfig = await ServerConfig.findById(interaction.guildId).lean().exec();
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

        const requestData = await Request.findById(id);
        if (!requestData) {
            interaction.editReply({ content: app.messageFormat('errorRequestNotExist', id) });
            return;
        }

        if (requestData.guildId != interaction.guildId) {
            interaction.editReply({ content: app.message.errorRequestNotLegal });
            return;
        }

        requestData.checkFilter = false;
        await requestData.save();
        await interaction.editReply({ content: app.messageFormat('successRequestResubmit', requestData.levelId) });
    }

    /** @param {import("mongoose").HydratedDocument<import("mongoose").InferSchemaType<typeof Request.schema>>} requestData */
    constructor(requestData) {
        this.rawData = requestData.toJSON();
        /** @type {number} */
        this.id = this.rawData._id;
        this.userId = String(this.rawData.userId);
        this.state = LevelRequestState.of(this.rawData.state);
        this.reviews = this.rawData.reviews;
        this.level = {
            id: +this.rawData.levelId,
            name: String(this.rawData.levelInfo.name),
            description: this.rawData.levelInfo.description ? String(this.rawData.levelInfo.description) : null
        };
        this.isGDPS = !!this.rawData.gdps;
        this.youtubeVidId = app.getYouTubeVideoId(this.rawData.videoUrl);
    }

    getReviews() {
        const entries = Object.entries(this.reviews);
        let result = entries.slice(0, 5).map(([user, data]) => `- ${ReviewType.of(data.type).getEmoji()} <@${user}>${data.date ? ` <t:${parseInt(+data.date / 1000)}:R>` : ''}${data.messageUrl ? ` > ${data.messageUrl}` : ''}`).join('\n');
        if (entries.length > 5) result = result + `\n- and ${entries.length - 5} reviews more...`;
        return result;
    }

    /**
     * @param {String} user
     * @param {ReviewType} reviewType
     * @param {String} context
     */
    async addReview(user, reviewType, context, messageUrl) {
        const review = { type: reviewType.id, date: Date.now(), note: context, messageUrl: messageUrl };
        this.reviews[user] = review;
        await Request.updateOne({ _id: this.id }, { [`reviews.${user}`]: review });
    }

    /** @param {LevelRequestState} state */
    async setState(state) {
        if (this.state == state) return;
        this.state = state;
        await Request.updateOne({ _id: this.id }, { state: state.id });
    }

    getVideoThumbnailUrl() {
        return `https://img.youtube.com/vi/${this.youtubeVidId}/mqdefault.jpg`;
    }

    /** @returns {import("discord.js").InteractionReplyOptions} */
    generateContext() {
        const embeds = [], components = [];

        const levelInfo = `${this.level.name} (\`${this.level.id}\`)`;
        let levelDifficulty = LevelInfo.getDifficultyContext(this.rawData.levelInfo.demon, this.rawData.levelInfo.difficulties);
        if (!levelDifficulty) levelDifficulty = (this.rawData.levelInfo.legacy?.difficulty || 'None');
        embeds.push(new EmbedBuilder()
            .setTitle(levelInfo)
            .setURL(this.isGDPS ? null : `${app.config.url.gdBrowser}/${this.level.id}`)
            .setDescription(this.state.description)
            .setThumbnail(this.getVideoThumbnailUrl())
            .setFooter({ text: `Request ID: #${this.id}` })
            .setTimestamp(this.rawData.createdAt)
            .setColor(this.state != LevelRequestState.READY ? Colors.Red : this.reviews.size ? Colors.Green : Colors.Yellow)
            .addFields({ name: 'Level ID', value: `${this.level.id}`, inline: true })
            .addFields(this.level.description ? { name: 'Level Description', value: this.level.description || 'None', inline: false } : [])
            .addFields(
                { name: 'Submitted by', value: `<@${this.rawData.userId}>`, inline: true },
                { name: 'Difficulty & Type', value: levelDifficulty + (!this.rawData.levelInfo.isPlatformer ? ` (Classic)` : ` (Platformer)`), inline: true },
            )
            .addFields(this.youtubeVidId ? { name: 'Video', value: `[${app.emoji.youtube} YouTube](${this.rawData.videoUrl})`, inline: true } : [])
            .addFields(this.rawData.note ? { name: 'Note', value: this.rawData.note || 'None', inline: true } : [])
            .addFields(this.rawData.extraQuestion ? { name: this.rawData.extraQuestion.question || '???', value: this.rawData.extraQuestion.answer || 'None', inline: true } : [])
            .addFields({ name: 'Review(s)', value: this.getReviews() || 'None' })
        );

        if (this.state == LevelRequestState.READY) {
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`review-sent:${this.id}`)
                    .setPlaceholder('⭐ Select your sent type in here...')
                    .addOptions(
                        ReviewType.SENT.createMenu(),
                        ReviewType.SENT_FEATURED.createMenu(),
                        ReviewType.SENT_EPIC.createMenu(),
                        ReviewType.SENT_LEGENDARY.createMenu(),
                        ReviewType.SENT_MYTHIC.createMenu()
                    )
            ));
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`review-reject:${this.id}`)
                    .setPlaceholder('❌ Select your reject type in here...')
                    .addOptions(
                        ReviewType.REJECT.createMenu(),
                        ReviewType.REJECT_SENT.createMenu(),
                        ReviewType.REJECT_ALREADY_RATED.createMenu(),
                        ReviewType.REJECT_STOLEN.createMenu(),
                        ReviewType.REJECT_NOT_EXIST.createMenu()
                    )
            ));
        }

        return { embeds, components };
    }
}