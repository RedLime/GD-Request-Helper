// eslint-disable-next-line no-unused-vars
import { ButtonInteraction } from "discord.js";
import * as app from '../../app.js';
import Submission from "../class/submission.js";
import ServerManager from "../class/server_manager.js";
import { Request, User } from "../database.js";
import LevelRequest from "../class/request.js";

/**
 * @typedef ButtonExecutor
 * @property {String} id
 * @property {function(ButtonInteraction, ...string): Promise<void>} execute
 */

/**
 * @type {ButtonExecutor[]}
 */
export default [
    {
        id: 'delete-confirm',
        async execute(interaction) {
            await interaction.deferUpdate();
            const user = await User.findById(interaction.user.id);
            if (!user) {
                await interaction.editReply({ content: app.messageFormat('successDataDeletion', 0), embeds: [], components: [] });
                return;
            }
            if (user.lastDeletion + (1000 * 60 * 60 * 24 * 14) > Date.now()) {
                await interaction.editReply({ content: app.message.errorDataDeletionCooldown, embeds: [], components: [] });
                return;
            }
            const result = await Request.deleteMany({ userId: interaction.user.id });
            user.lastDeletion = Date.now();
            await user.save();
            await interaction.editReply({ content: app.messageFormat('successDataDeletion', result.deletedCount), embeds: [], components: [] });
        }
    },
    {
        id: 'submit',
        async execute(interaction) {
            await Submission.createMessage(interaction);
        }
    },
    {
        id: 'submit-confirm',
        async execute(interaction, key) {
            await interaction.deferUpdate();
            await Submission.runFromCache(key, context => interaction.editReply(context), async submission => await submission.onSubmit(interaction));
        }
    },
    {
        id: 'submit-type',
        async execute(interaction, key) {
            await interaction.deferUpdate();
            await Submission.runFromCache(key, context => interaction.editReply(context), submission => submission.onToggleLevelType(interaction));
        }
    },
    {
        id: 'submit-difficulty',
        async execute(interaction, key) {
            await interaction.deferUpdate();
            await Submission.runFromCache(key, context => interaction.editReply(context), submission => submission.onOpenDifficulty(interaction));
        }
    },
    {
        id: 'submit-video',
        async execute(interaction, key) {
            await Submission.runFromCache(key, async context => {
                await interaction.deferUpdate();
                interaction.editReply(context);
            }, submission => submission.onOpenVideoLink(interaction));
        }
    },
    {
        id: 'submit-note',
        async execute(interaction, key) {
            await Submission.runFromCache(key, async context => {
                await interaction.deferUpdate();
                interaction.editReply(context);
            }, submission => submission.onOpenNote(interaction));
        }
    },
    {
        id: 'submit-difficulty-toggle',
        async execute(interaction, key) {
            await interaction.deferUpdate();
            await Submission.runFromCache(key, context => interaction.editReply(context), submission => submission.onToggleDifficultyType(interaction));
        }
    },
    {
        id: 'config',
        async execute(interaction, userId, page) {
            if (interaction.user.id != userId) return;
            await interaction.deferUpdate();
            await ServerManager.generateConfigContext(interaction, (c) => interaction.editReply(c), +page);
        }
    },
    {
        id: 'config-req-channel',
        async execute(interaction, userId, field, index) {
            await ServerManager.onSelectRequestChannelUpdate(interaction, userId, field, index);
        }
    },
    {
        id: 'config-result-channel',
        async execute(interaction, userId, type) {
            if (interaction.user.id != userId) return;
            await interaction.deferUpdate();
            await ServerManager.generateResultChannelsContext(interaction, (c) => interaction.editReply(c), type);
        }
    },
    {
        id: 'config-role',
        async execute(interaction, userId, action, type) {
            if (interaction.user.id != userId) return;

            if (action == 'remove') {
                await ServerManager.onRoleRemove(interaction, userId, type);
            } else {
                await interaction.deferUpdate();
                await ServerManager.generateRolesContext(interaction, (c) => interaction.editReply(c), type);
            }
        }
    },
    {
        id: 'config-question',
        async execute(interaction, userId, type) {
            await ServerManager.onSelectAdditionalQuestionUpdate(interaction, userId, type);
        }
    },
    {
        id: 'config-gdps',
        async execute(interaction, userId) {
            await ServerManager.onUpdateGDPSMode(interaction, userId);
        }
    },

    // For migrated stuff
    {
        id: 'sent',
        async execute(interaction, _, reqId) {
            await interaction.deferUpdate();
            await LevelRequest.generateRequestInfoById(interaction, +reqId);
        }
    },
    {
        id: 'reject',
        async execute(interaction, reqId) {
            await interaction.deferUpdate();
            await LevelRequest.generateRequestInfoById(interaction, +reqId);
        }
    }
];