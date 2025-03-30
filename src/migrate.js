import fs from 'fs';
import path from 'path';
import * as app from '../app.js';
import { refreshRequestId, Request, ServerConfig } from './database.js';


async function migrateConfig(config) {
    const message = config.close_message || app.message.defaultMessageRequestClosed;
    await ServerConfig.create({
        _id: config.guild_id,
        moderatorRoleId: config.moderator_role,
        cooldownBypassRoleId: config.bypass_role,
        openUntil: config.lock_req ? 0 : config.close_time,
        cooldown: config.slowmode * 1000,
        remainRequests: config.close_requests >= 2 ? (config.close_requests - 2) : 0,
        closeAnnounced: !!config.lock_req,
        request: {
            classic: {
                normal: {
                    enable: !!config.req_channel,
                    channel: config.req_channel || null,
                    videoRequired: config.require_video > 1,
                    noteRequired: config.require_description
                },
                demon: {
                    enable: !!config[config.type_simplify ? 'req_channel' : 'demon_req_channel'],
                    channel: config[config.type_simplify ? 'req_channel' : 'demon_req_channel'] || null,
                    videoRequired: config.require_video > 0,
                    noteRequired: config.require_description
                }
            },
            platformer: {
                normal: {
                    enable: !!config.plat_channel,
                    channel: config.plat_channel || null,
                    videoRequired: config.require_video > 1,
                    noteRequired: config.require_description
                },
                demon: {
                    enable: !!config[config.type_simplify ? 'plat_channel' : 'plat_demon_channel'],
                    channel: config[config.type_simplify ? 'plat_channel' : 'plat_demon_channel'] || null,
                    videoRequired: config.require_video > 0,
                    noteRequired: config.require_description
                }
            },
            result: {
                sentChannel: config.sent_channel,
                rejectChannel: config.deny_channel
            }
        },
        message: {
            requestClosed: message
        },
        migrateCheck: true
    });
}


async function migrateRequestAndReviews(requests, reviews) {
    const reqMap = {};
    for (const request of requests) {
        request.reviews = [];
        reqMap[request.request_id] = request;
    }
    for (const review of reviews) {
        if (reqMap[review.request_id]) {
            reqMap[review.request_id].reviews.push(review);
        }
    }

    for await (const request of Object.values(reqMap)) {
        const map = new Map();
        for (const review of request.reviews) {
            const userId = review.user_id;
            const date = +(new Date(review.vote_date * 1000));
            const note = review.reason ? review.reason : null;
            const type = review.request_rate < 0 ? review.request_rate : (review.request_rate + 1);
            const data = { type: type, date: date, note: note, messageUrl: null };
            map.set(userId, data);
        }
        await Request.create({
            _id: request.request_id,
            userId: request.sender_id,
            guildId: request.guild_id,
            levelId: request.level_id,
            levelInfo: {
                name: request.level_name,
                description: null,
                difficulties: [],
                demon: !!request.is_demon,
                platformer: !!request.is_platformer,
                uploader: null,
                legacy: {
                    difficulty: request.level_difficulty
                }
            },
            videoUrl: request.video_url || null,
            note: request.custom_description || null,
            extraQuestion: null,
            reviews: map,
            gdps: request.request_id < 10000,
            createdAt: new Date(request.request_date * 1000)
        });
    }
}


export async function start() {
    const targetPath = path.resolve('./migrate');
    if (!fs.existsSync(targetPath) || !fs.lstatSync(targetPath).isDirectory() || !fs.readdirSync(targetPath).length || (await ServerConfig.countDocuments()) > 5) {
        console.log('Skipped the old data migration. Just ignore this log.');
        return;
    }

    console.log('Start migrating...');
    const configs = JSON.parse(fs.readFileSync(path.resolve(targetPath, 'configs.json'), 'utf8')).rows;
    const requests = JSON.parse(fs.readFileSync(path.resolve(targetPath, 'requests.json'), 'utf8')).rows;
    const reviews = JSON.parse(fs.readFileSync(path.resolve(targetPath, 'reviews.json'), 'utf8')).rows;

    console.log('Migrating Configs...');
    for await (const config of configs) await migrateConfig(config);
    console.log('Migrating Requests...');
    await migrateRequestAndReviews(requests, reviews);
    console.log('Migrated.');
    await refreshRequestId();
}