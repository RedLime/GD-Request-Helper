import LevelRequest from "../class/request.js";
import ServerManager from "../class/server_manager.js";
import Submission from "../class/submission.js";

/**
 * @typedef SelectMenuExecutor
 * @property {String} id
 * @property {function(import('discord.js').AnySelectMenuInteraction, ...string): Promise<void>} execute
 */

/**
 * @type {SelectMenuExecutor[]}
 */
export default [
    {
        id: 'submit-difficulty',
        async execute(interaction, key) {
            await interaction.deferUpdate();
            await Submission.runFromCache(key, context => interaction.editReply(context), submission => submission.onUpdateDifficulties(interaction));
        }
    },
    {
        id: 'review-sent',
        async execute(interaction, reqId) {
            await LevelRequest.onSelectReview(interaction, reqId);
        }
    },
    {
        id: 'review-reject',
        async execute(interaction, reqId) {
            await LevelRequest.onSelectReview(interaction, reqId);
        }
    },
    {
        id: 'config',
        async execute(interaction, userId) {
            await ServerManager.onSelectOptionMenu(interaction, userId);
        }
    },
    {
        id: 'config-req-channel',
        async execute(interaction, userId, type) {
            await ServerManager.onChooseRequestChannelUpdate(interaction, userId, type);
        }
    },
    {
        id: 'config-result-channel',
        async execute(interaction, userId, type) {
            await ServerManager.onResultChannelUpdate(interaction, userId, type);
        }
    },
    {
        id: 'config-role',
        async execute(interaction, userId, action, type) {
            await ServerManager.onRoleUpdate(interaction, userId, action, type);
        }
    },
    {
        id: 'config-message',
        async execute(interaction, userId) {
            await ServerManager.onSelectMessageUpdate(interaction, userId);
        }
    },
    {
        id: 'config-logging',
        async execute(interaction, userId, type) {
            await ServerManager.onSelectLoggingChannel(interaction, userId, type);
        }
    },

    // For migrated stuff
    {
        id: 'sent',
        async execute(interaction, reqId) {
            await interaction.deferUpdate();
            await LevelRequest.generateRequestInfoById(interaction, +reqId);
        }
    }
];