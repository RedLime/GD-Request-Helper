import { Request, ServerConfig, User } from "../database.js";
// eslint-disable-next-line no-unused-vars
import { ActionRowBuilder, BaseGuildTextChannel, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, CommandInteraction, EmbedBuilder, MessageFlags, ModalBuilder, ModalSubmitInteraction, PermissionsBitField, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import LevelType from "./level_type.js";
import * as app from "../../app.js";
import LevelInfo from "./level_info.js";
import LevelRequest from "./request.js";
import ServerManager from "./server_manager.js";
import BitChecker from "./bit_checker.js";


export class SubmissionState {
    constructor(id) {
        this.id = id;
    }

    static NONE = new SubmissionState(0);
    static CHOOSE_DEMON_DIFFICULTIES = new SubmissionState(1);
    static CHOOSE_DIFFICULTIES = new SubmissionState(2);
}


export class SubmissionRequirement extends BitChecker {

    static VIDEO = 1 << 0;
    static DIFFICULTY = 1 << 1;
    static NOTE = 1 << 2;

    getContexts() {
        const contexts = [];
        if (this.hasFlag(SubmissionRequirement.DIFFICULTY)) contexts.push(app.message.stateRequireDifficulty);
        if (this.hasFlag(SubmissionRequirement.VIDEO)) contexts.push(app.message.stateRequireVideo);
        if (this.hasFlag(SubmissionRequirement.NOTE)) contexts.push(app.message.stateRequireNote);
        return contexts;
    }

}


export default class Submission {

    /** @private @type {Record<string, {cooldown: number, data: Submission}>} */
    static caches = {};
    static {
        setInterval(() => {
            const keys = Object.keys(Submission.caches);
            for (const key of keys) {
                if (Submission.caches[key].cooldown-- == 0) delete Submission.caches[key];
            }
        }, 60 * 1000);
    }

    /**
     * @param {string} cacheKey
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} failureMessage
     * @param {(submission: Submission) => Promise<any>} worker
     */
    static async runFromCache(cacheKey, failureMessage, worker) {
        const submission = Submission.caches[cacheKey]?.data;
        if (!submission) return await failureMessage({ content: app.message.errorSubmitCacheOut, components: [], embeds: [] });
        else return await worker(submission);
    }

    /**
     * @param {import("discord.js").Interaction} interaction
     * @param {import("mongoose").InferSchemaType<typeof User.schema>} user
     * @param {import("mongoose").InferSchemaType<typeof ServerConfig.schema>} serverConfig
     * @param {LevelType?} type
     * @param {(context: import("discord.js").InteractionReplyOptions) => Promise<any>} followMessage
     * @returns {Promise<boolean>}
     */
    static async checkAvailableSubmission(interaction, user, serverConfig, followMessage, type = null) {
        if (serverConfig.migrateCheck) {
            await followMessage({ content: app.message.errorMigratedCheck, flags: MessageFlags.Ephemeral });
            return false;
        }

        if (serverConfig.openUntil < Date.now()) {
            await followMessage({ content: serverConfig.message.requestClosed, flags: MessageFlags.Ephemeral });
            return false;
        }

        if (serverConfig.blockedRoleId && interaction.member.roles.cache.has(serverConfig.blockedRoleId)) {
            await followMessage({ content: app.message.errorPermissionBlacklistRole, embeds: [], components: [], flags: MessageFlags.Ephemeral });
            return false;
        }

        if (serverConfig.whitelistRoleId && !interaction.member.roles.cache.has(serverConfig.whitelistRoleId)) {
            await followMessage({ content: app.message.errorPermissionWhitelistRole, embeds: [], components: [], flags: MessageFlags.Ephemeral });
            return false;
        }

        if (!serverConfig.cooldownBypassRoleId || !interaction.member.roles.cache.has(serverConfig.cooldownBypassRoleId)) {
            const lastSubmit = +(user.lastSubmit[interaction.guildId] ?? 0);
            if (lastSubmit && (Date.now() - lastSubmit) < serverConfig.cooldown) {
                await followMessage({ content: serverConfig.message.duringCooldown.replaceAll('{endTime}', `<t:${parseInt((lastSubmit + serverConfig.cooldown) / 1000)}:R>`), embeds: [], components: [], flags: MessageFlags.Ephemeral });
                return false;
            }
        }

        if (type) {
            const target = type.configSelector(serverConfig);

            if (!target.enable) {
                await followMessage({ content: serverConfig.message.typeDisabled.replaceAll('{type}', type.context), embeds: [], components: [], flags: MessageFlags.Ephemeral });
                return false;
            }

            if (!target.channel) {
                await followMessage({ content: app.message.errorSubmitCreate + '\n' + app.messageFormat('errorSubmitNoChannel', type.context), embeds: [], components: [], flags: MessageFlags.Ephemeral });
                return false;
            }

            const channel = await app.client.channels.fetch(target.channel, { force: false }).catch(() => null);
            if (!channel) {
                await followMessage({ content: app.message.errorSubmitCreate + '\n' + app.messageFormat('errorSubmitChannelNotExist', type.context), embeds: [], components: [], flags: MessageFlags.Ephemeral });
                return false;
            }

            if (channel.type != ChannelType.GuildText || !(channel instanceof BaseGuildTextChannel)) {
                await followMessage({ content: app.message.errorSubmitCreate + '\n' + app.messageFormat('errorChannelInvalid', channel.id), embeds: [], components: [], flags: MessageFlags.Ephemeral });
                return false;
            }

            const permission = channel.permissionsFor(interaction.guild.members.me);
            if (!permission.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
                await followMessage({ content: app.message.errorSubmitCreate + '\n' + app.messageFormat('errorPermissionChannelMessage', channel.id), embeds: [], components: [], flags: MessageFlags.Ephemeral });
                return false;
            }
        }

        return true;
    }

    /**
     * @param {CommandInteraction} interaction
     */
    static async createMessage(interaction) {
        const user = await User.findOneAndUpdate({ _id: interaction.user.id }, { _id: interaction.user.id }, { new: true, upsert: true }).lean().exec();
        const serverConfig = await ServerConfig.findOneAndUpdate({ _id: interaction.guildId }, { $setOnInsert: { _id: interaction.guildId } }, { new: true, upsert: true }).lean().exec();
        if (!await this.checkAvailableSubmission(interaction, user, serverConfig, (c) => interaction.reply(c))) return;

        const modal = new ModalBuilder()
            .setCustomId('submit')
            .setTitle('Submit your request');

        const levelIdInput = new TextInputBuilder()
            .setCustomId('levelId')
            .setLabel('Level ID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('123465789')
            .setMaxLength(11)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(levelIdInput));

        if (serverConfig.gdpsMode) {
            const levelNameInput = new TextInputBuilder()
                .setCustomId('levelName')
                .setLabel('Level Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Level Easy')
                .setMaxLength(20)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(levelNameInput));
        }

        const videoInput = new TextInputBuilder()
            .setCustomId('video')
            .setLabel('Showcase Video')
            .setMaxLength(100)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://www.youtube.com/watch?v=exampleurl')
            .setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(videoInput));

        if (serverConfig.extraQuestion.enable && serverConfig.extraQuestion.context) {
            const extraAnswerInput = new TextInputBuilder()
                .setCustomId('extra')
                .setLabel(serverConfig.extraQuestion.context.substring(0, 45))
                .setMaxLength(300)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('...')
                .setRequired(serverConfig.extraQuestion.required);
            modal.addComponents(new ActionRowBuilder().addComponents(extraAnswerInput));
        }

        const noteInput = new TextInputBuilder()
            .setCustomId('note')
            .setLabel('Additional Note to Moderator')
            .setMaxLength(300)
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('...')
            .setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(noteInput));

        interaction.showModal(modal);
    }

    /**
     * @param {ModalSubmitInteraction} interaction
     */
    static async receiveLevelIDModal(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const levelId = +interaction.fields.getTextInputValue('levelId').trim();
        const levelName = interaction.fields.fields.has('levelName') ? interaction.fields.getTextInputValue('levelName') : null;
        const video = interaction.fields.getTextInputValue('video');
        const videoId = app.getYouTubeVideoId(video);
        const extraAnswer = interaction.fields.fields.has('extra') ? (interaction.fields.getTextInputValue('extra') || null) : null;
        const note = interaction.fields.getTextInputValue('note') || null;

        if (!Number.isSafeInteger(levelId) || levelId <= 0) {
            interaction.editReply({ content: app.message.errorSubmitInvalidLevelId });
            return;
        }

        if (video && !videoId) {
            interaction.editReply({ content: app.message.errorSubmitInvalidVideo });
            return;
        }

        const request = await Request.findOne({ guildId: interaction.guildId, levelId: levelId, checkFilter: true });
        if (request) {
            const levelRequest = new LevelRequest(request);
            const reviews = levelRequest.userId != interaction.user.id ? '' : `\n### Reviews\n${levelRequest.getReviews() || 'None'}`;
            interaction.editReply({ content: `${app.message.errorSubmitAlreadySubmitted}\n### Level\n${levelRequest.level.name} \`[${levelRequest.level.id}]\`${reviews}` });
            return;
        }

        const serverConfig = await ServerConfig.findById(interaction.guildId).lean().exec();
        let submission;
        if (serverConfig.gdpsMode) {
            submission = new Submission(interaction, serverConfig, levelId, levelName, null);
        } else {
            const level = await LevelInfo.fetchFromServer(levelId);
            if (level == undefined) {
                interaction.editReply({ content: app.message.errorLevelInfoFetch });
                return;
            }
            if (level == null) {
                let message = app.message.errorLevelInfoNotExist;
                if (levelId < 1_000_000) message = message + `\n-# ` + app.message.warningPossiblyGDPSLevel;
                interaction.editReply({ content: message });
                return;
            }
            if (level.isRated) {
                interaction.editReply({ content: app.message.errorLevelInfoRated });
                return;
            }

            submission = new Submission(interaction, serverConfig, levelId, level.name, level);
        }

        submission.youtubeVidId = videoId;
        submission.note = note;
        submission.extraAnswer = extraAnswer;
        interaction.editReply(submission.generateContext());
        submission.updateCache();
    }

    /**
     * @param {import("discord.js").Interaction} interaction
     * @param {import("mongoose").InferSchemaType<typeof ServerConfig.schema>} serverConfig
     * @param {number} levelId
     * @param {string} levelName
     * @param {LevelInfo?} levelInfo
     * @param {string} youtubeVidId
     */
    constructor(interaction, serverConfig, levelId, levelName, levelInfo) {

        /** @type {string} */
        this.userId = interaction.user.id;

        /** @type {string} */
        this.guildId = interaction.guildId;

        /** @type {number} */
        this.levelId = levelId;

        /** @type {string} */
        this.levelName = levelName;

        /** @type {LevelInfo?} */
        this.levelInfo = levelInfo;

        /** @type {string?} */
        this.youtubeVidId = null;

        /** @type {string?} */
        this.note = null;

        /** @type {string?} */
        this.extraAnswer = null;

        /** @type {boolean} */
        this.isDemon = this.levelInfo?.starRequested == 10;

        /** @type {number[]} */
        this.difficulties = (this.levelInfo?.starRequested >= 1 && !this.isDemon) ? [this.levelInfo.starRequested] : [];

        /** @type {boolean} */
        this.isPlatformer = this.levelInfo ? !!this.levelInfo.isPlatformer : false;

        /** @type {SubmissionState} */
        this.state = SubmissionState.NONE;

        this.isGDPS = !this.levelInfo;

        this.config = serverConfig;

    }

    getContextId() {
        return `${this.guildId}-${this.userId}`;
    }

    getVideoThumbnailUrl() {
        return `https://img.youtube.com/vi/${this.youtubeVidId}/mqdefault.jpg`;
    }

    getVideoUrl() {
        return `https://www.youtube.com/watch?v=${this.youtubeVidId}`;
    }

    getLevelType() {
        return LevelType.getType(this.isPlatformer, this.isDemon);
    }

    isVideoRequired() {
        return this.getLevelType().configSelector(this.config).videoRequired;
    }

    isNoteRequired() {
        return this.getLevelType().configSelector(this.config).noteRequired;
    }

    /**
     * @returns {SubmissionRequirement}
     */
    getSubmitRequirement() {
        const requirement = new SubmissionRequirement();
        if (this.isVideoRequired() && !this.youtubeVidId) requirement.setFlag(SubmissionRequirement.VIDEO);
        if (this.isNoteRequired() && !this.note) requirement.setFlag(SubmissionRequirement.NOTE);
        if (!this.difficulties.length) requirement.setFlag(SubmissionRequirement.DIFFICULTY);
        return requirement;
    }

    updateCache() {
        Submission.caches[this.getContextId()] = { cooldown: 5, data: this };
    }

    /** @returns {import("discord.js").InteractionReplyOptions} */
    generateContext() {
        const requirement = this.getSubmitRequirement();

        const embeds = [], components = [];

        embeds.push(new EmbedBuilder()
            .setTitle(`${this.levelName} \`#${this.levelId}\``)
            .setDescription(this.levelInfo?.description || app.message.stateNoLevelDescription)
            .setThumbnail(this.getVideoThumbnailUrl())
            .addFields(this.levelInfo?.uploader ? { name: 'Uploader', value: (this.levelInfo.uploader.id ? `[${this.levelInfo.uploader.name}](${app.config.url.gdBrowser}/u/${this.levelInfo.uploader.id})` : this.levelInfo.uploader.name), inline: true } : [])
            .addFields(
                { name: 'Showcase Video', value: this.youtubeVidId ? `[YouTube](${this.getVideoUrl()})` : 'None', inline: true },
                { name: 'Difficulty & Type', value: (LevelInfo.getDifficultyContext(this.isDemon, this.difficulties) || 'None') + (!this.isPlatformer ? ` (Classic)` : ` (Platformer)`), inline: true },
                { name: 'Note', value: this.note || 'None', inline: false },
            )
            .addFields(this.extraAnswer ? { name: this.config.extraQuestion.context || '???', value: this.extraAnswer } : [])
            .addFields(!requirement.isEmpty() ? { name: ':warning: Requirements to submit', value: requirement.getContexts().map(c => `- ${c}`).join('\n') } : [])
            .setURL(this.isGDPS ? null : `${app.config.url.gdBrowser}/${this.levelInfo.id}`)
        );

        if (this.state == SubmissionState.NONE) {
            if (this.config.gdpsMode) {
                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`submit-type:${this.getContextId()}`).setEmoji(!this.isPlatformer ? app.emoji.moon : app.emoji.star).setLabel('Change to ' + (!this.isPlatformer ? 'Platformer Level' : 'Classic Level')).setStyle(ButtonStyle.Secondary)
                ));
            }
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`submit-difficulty:${this.getContextId()}`).setEmoji(this.isPlatformer ? app.emoji.moon : app.emoji.star).setLabel('Change Difficulty').setStyle(requirement.hasFlag(SubmissionRequirement.DIFFICULTY) ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`submit-video:${this.getContextId()}`).setEmoji(app.emoji.youtube).setLabel('Update Video Link').setStyle(requirement.hasFlag(SubmissionRequirement.VIDEO) ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`submit-note:${this.getContextId()}`).setEmoji(app.emoji.cp).setLabel('Update Note').setStyle(requirement.hasFlag(SubmissionRequirement.NOTE) ? ButtonStyle.Primary : ButtonStyle.Secondary)
            ));
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`submit-confirm:${this.getContextId()}`).setLabel('Submit').setStyle(ButtonStyle.Success).setDisabled(!requirement.isEmpty()),
            ));
        }
        const difficultyOptions = [];
        for (let i = 1; i <= 14; i++) {
            difficultyOptions.push(new StringSelectMenuOptionBuilder().setEmoji(app.emoji[LevelInfo.getDifficultyId(i)]).setLabel(`${LevelInfo.getDifficultyId(i).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}${i >= 10 ? '' : ` - ${i}`}`).setValue(String(i)));
        }
        if (this.state == SubmissionState.CHOOSE_DIFFICULTIES) {
            const options = difficultyOptions.slice(0, 9);
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`submit-difficulty:${this.getContextId()}`).setPlaceholder('Choose difficulty here...').setMinValues(1).setMaxValues(options.length).setOptions(...options),
            ));

            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`submit-difficulty-toggle:${this.getContextId()}`).setEmoji(app.emoji.hard_demon).setLabel('Change to Demon Difficulty').setStyle(ButtonStyle.Danger),
            ));
        }
        if (this.state == SubmissionState.CHOOSE_DEMON_DIFFICULTIES) {
            const options = difficultyOptions.slice(9, 14);
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`submit-difficulty:${this.getContextId()}`).setPlaceholder('Choose demon difficulty here...').setMinValues(1).setMaxValues(options.length).setOptions(...options),
            ));

            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`submit-difficulty-toggle:${this.getContextId()}`).setEmoji(app.emoji.hard).setLabel('Change to Non-Demon Difficulty').setStyle(ButtonStyle.Danger),
            ));
        }

        return { content: app.message.warningCorrectContents, embeds: embeds, components: components };
    }

    /** @param {ButtonInteraction} interaction */
    onOpenDifficulty(interaction) {
        this.state = this.isDemon ? SubmissionState.CHOOSE_DEMON_DIFFICULTIES : SubmissionState.CHOOSE_DIFFICULTIES;
        interaction.editReply(this.generateContext());
        this.updateCache();
    }

    /** @param {ButtonInteraction} interaction */
    onOpenVideoLink(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('submit-video:' + this.getContextId())
            .setTitle('Update Showcase Video Link');

        const videoInput = new TextInputBuilder()
            .setCustomId('video')
            .setLabel('Showcase Video')
            .setMaxLength(100)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://www.youtube.com/watch?v=exampleurl')
            .setRequired(this.isVideoRequired());
        modal.addComponents(new ActionRowBuilder().addComponents(videoInput));
        interaction.showModal(modal);
        this.updateCache();
    }

    /** @param {ButtonInteraction} interaction */
    onOpenNote(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('submit-note:' + this.getContextId())
            .setTitle('Update Request Note');

        const videoInput = new TextInputBuilder()
            .setCustomId('note')
            .setLabel('Additional Note to Moderator')
            .setMaxLength(300)
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('...')
            .setRequired(this.isNoteRequired());
        modal.addComponents(new ActionRowBuilder().addComponents(videoInput));
        interaction.showModal(modal);
        this.updateCache();
    }

    /** @param {ModalSubmitInteraction} interaction */
    onSubmitVideoLink(interaction) {
        const video = interaction.fields.getTextInputValue('video');
        const videoId = app.getYouTubeVideoId(video);
        if (video && !videoId) {
            interaction.followUp({ content: app.message.errorSubmitInvalidVideo, flags: MessageFlags.Ephemeral });
            return;
        }
        this.youtubeVidId = videoId;
        interaction.editReply(this.generateContext());
        this.updateCache();
    }

    /** @param {ModalSubmitInteraction} interaction */
    onSubmitNote(interaction) {
        const note = interaction.fields.getTextInputValue('note');
        this.note = note;
        interaction.editReply(this.generateContext());
        this.updateCache();
    }

    /** @param {ButtonInteraction} interaction */
    onToggleLevelType(interaction) {
        this.isPlatformer = !this.isPlatformer;
        interaction.editReply(this.generateContext());
        this.updateCache();
    }

    /** @param {ButtonInteraction} interaction */
    onToggleDifficultyType(interaction) {
        this.isDemon = !this.isDemon;
        this.difficulties = [];
        this.onOpenDifficulty(interaction);
    }

    /** @param {StringSelectMenuInteraction} interaction */
    onUpdateDifficulties(interaction) {
        const diffs = interaction.values.map(v => +v);
        this.difficulties = diffs;
        this.state = SubmissionState.NONE;
        interaction.editReply(this.generateContext());
        this.updateCache();
    }

    /** @param {ButtonInteraction} interaction */
    async onSubmit(interaction) {
        if (!this.getSubmitRequirement().isEmpty()) return;

        const user = await User.findById(this.userId).exec();
        const serverConfig = await ServerConfig.findById(this.guildId).exec();
        if (!await Submission.checkAvailableSubmission(interaction, user, serverConfig, (c) => interaction.editReply(c), this.getLevelType())) return;

        const channel = await app.client.channels.fetch(this.getLevelType().configSelector(serverConfig).channel, { force: false }).catch(() => null);
        if (!channel) return;

        const permission = channel.permissionsFor(interaction.guild.members.me);
        if (!permission.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
            await interaction.editReply({ content: app.message.errorSubmitCreate + '\n' + app.messageFormat('errorPermissionChannelMessage', channel.id), embeds: [], components: [] });
            return;
        }

        const levelRequest = await LevelRequest.create(this);

        await channel.send(levelRequest.generateContext());

        await ServerManager.onRequestSubmitted(serverConfig);
        user.lastSubmit.set(interaction.guildId, Date.now());
        await user.save();
        await interaction.editReply({ content: `### ${app.message.successSubmitCreate}\nLevel Info: ${this.levelName} (\`${this.levelId}\`)`, embeds: [], components: [] });
    }

}