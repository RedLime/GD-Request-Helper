// eslint-disable-next-line no-unused-vars
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalSubmitInteraction } from "discord.js";
import Submission from "../class/submission.js";
import LevelRequest from "../class/request.js";
import ServerManager from "../class/server_manager.js";
import * as app from "../../app.js";

/**
 * @typedef ModalExecutor
 * @property {String} id
 * @property {function(ModalSubmitInteraction, ...string): Promise<void>} execute
 */

/**
 * @type {ModalExecutor[]}
 */
export default [
    {
        id: 'submit',
        async execute(interaction) {
            await Submission.receiveLevelIDModal(interaction);
        }
    },
    {
        id: 'submit-video',
        async execute(interaction, key) {
            await interaction.deferUpdate();
            await Submission.runFromCache(key, context => interaction.editReply(context), submission => submission.onSubmitVideoLink(interaction));
        }
    },
    {
        id: 'submit-note',
        async execute(interaction, key) {
            await interaction.deferUpdate();
            await Submission.runFromCache(key, context => interaction.editReply(context), submission => submission.onSubmitNote(interaction));
        }
    },
    {
        id: 'review',
        async execute(interaction, reqId, reviewId) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await LevelRequest.onReceiveReview(interaction, reqId, reviewId);
        }
    },
    {
        id: 'config-cooldown',
        async execute(interaction) {
            await ServerManager.onUpdateCooldown(interaction);
        }
    },
    {
        id: 'config-message',
        async execute(interaction, type) {
            await ServerManager.onMessageUpdateSubmit(interaction, type);
        }
    },
    {
        id: 'config-question',
        async execute(interaction) {
            await ServerManager.onAdditionalQuestionSubmit(interaction);
        }
    },
    {
        id: 'setup',
        async execute(interaction) {
            await interaction.deferUpdate();
            const context = interaction.fields.getTextInputValue('context') || null;
            const embeds = [];
            if (context?.trim()) {
                embeds.push(new EmbedBuilder().setDescription(context));
            }
            await interaction.channel.send({ embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('submit').setEmoji(app.emoji.sent_normal).setLabel('Submit the Level Request').setStyle(ButtonStyle.Primary))] });
        }
    }
];