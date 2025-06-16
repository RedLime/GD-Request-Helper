import { Schema } from 'mongoose';
import * as app from '../app.js';

const map = (obj, def = {}) => {
    return {
        type: Map,
        of: new Schema(obj, { _id: false }),
        default: def
    };
};

export const ServerConfig = app.connection.model('config', new Schema({
    _id: String,
    gdpsMode: { type: Boolean, default: false },
    adminRoleId: { type: String, default: null },
    moderatorRoleId: { type: String, default: null },
    whitelistRoleId: { type: String, default: null },
    blockedRoleId: { type: String, default: null },
    cooldownBypassRoleId: { type: String, default: null },
    openUntil: { type: Number, default: 0 },
    cooldown: { type: Number, default: 0 },
    remainRequests: { type: Schema.Types.Int32, default: 0 },
    closeAnnounced: { type: Boolean, default: true, index: true },
    extraQuestion: {
        enable: { type: Boolean, default: false },
        required: { type: Boolean, default: false },
        context: { type: String, default: '' }
    },
    adminNotify: {
        openChannel: { type: String, default: null },
        closeChannel: { type: String, default: null }
    },
    request: {
        classic: {
            normal: {
                enable: { type: Boolean, default: true },
                channel: { type: String, default: null },
                videoRequired: { type: Boolean, default: false },
                noteRequired: { type: Boolean, default: false }
            },
            demon: {
                enable: { type: Boolean, default: true },
                channel: { type: String, default: null },
                videoRequired: { type: Boolean, default: true },
                noteRequired: { type: Boolean, default: false }
            }
        },
        platformer: {
            normal: {
                enable: { type: Boolean, default: true },
                channel: { type: String, default: null },
                videoRequired: { type: Boolean, default: false },
                noteRequired: { type: Boolean, default: false }
            },
            demon: {
                enable: { type: Boolean, default: true },
                channel: { type: String, default: null },
                videoRequired: { type: Boolean, default: true },
                noteRequired: { type: Boolean, default: false }
            }
        },
        result: {
            sentChannel: { type: String, default: null },
            rejectChannel: { type: String, default: null }
        }
    },
    message: {
        typeDisabled: { type: String, default: app.message.defaultMessageRequestDisabled },
        requestClosed: { type: String, default: app.message.defaultMessageRequestClosed },
        duringCooldown: { type: String, default: app.message.defaultMessageRequestCooldown }
    },
    migrateCheck: { type: Boolean, default: false }
}));


let MAX_REQUEST_ID = 0;
export const Request = app.connection.model('request', new Schema({
    _id: { type: Schema.Types.Int32, default: () => ++MAX_REQUEST_ID },
    state: { type: Schema.Types.Int32, default: 0 },
    userId: String,
    guildId: { type: String, index: true },
    levelId: Number,
    levelInfo: {
        name: String,
        description: String,
        difficulties: [Number],
        demon: Boolean,
        platformer: Boolean,
        // `uploader` is Nullable
        uploader: {
            name: String,
            id: Number
        },
        // `legacy` is Nullable
        legacy: {
            difficulty: String
        }
    },
    videoUrl: String,
    note: String,
    // `extraQuestion` is Nullable
    extraQuestion: {
        question: String,
        answer: String
    },
    reviews: map({
        type: Schema.Types.Int32,
        date: Number,
        note: String,
        messageUrl: String
    }),
    gdps: Boolean,
    checkFilter: { type: Boolean, default: true }
}, { timestamps: true }));
export async function refreshRequestId() {
    MAX_REQUEST_ID = (await Request.findOne({}).sort({ _id: -1 }).lean().exec())?._id || 0;
}
await refreshRequestId();


export const User = app.connection.model('user', new Schema({
    _id: String,
    lastSubmit: { type: Map, of: Number, default: {} },
    lastDeletion: { type: Number, default: 0 }
}, { timestamps: true }));