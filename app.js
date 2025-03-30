import { Client, GatewayIntentBits } from "discord.js";
import config from "./config.json" with { type: "json" };
import emoji from "./emoji.json" with { type: "json" };
import message from "./message.json" with { type: "json" };
import mongoose from "mongoose";
import { intervalToDuration } from "date-fns";
export { config, emoji, message };


// MongoDB setup
const connection = mongoose.createConnection(`mongodb://${config.mongodb.host}:${config.mongodb.port}/${config.mongodb.database}`, {
    user: config.mongodb.user,
    pass: config.mongodb.password,
    maxPoolSize: 3
});

export { connection };


// Discord.js Setup & Migrate
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
console.log('Trying to login Discord client...');
await client.login(config.discord.token);
console.log('Login! ' + client.user.tag);
(async () => {
    const { init: initDiscordInteraction } = await import("./src/discord.js");
    initDiscordInteraction();
})();

export { client };


// Function Setup

/**
 * @param {String} url
 * @returns {String}
 */
export function getServerUrl(url) {
    const baseUrl = config.url.gameServer;
    return (baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl) + '/' + (url.startsWith('/') ? url.substring(1) : url);
};

export function getYouTubeVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

export function formatDuration(ms) {
    const duration = intervalToDuration({ start: 0, end: ms });
    const parts = [];

    if (duration.days) parts.push(`${duration.days} Day${duration.days > 1 ? 's' : ''}`);
    if (duration.hours) parts.push(`${duration.hours} Hour${duration.hours > 1 ? 's' : ''}`);
    if (duration.minutes) parts.push(`${duration.minutes} Minute${duration.minutes > 1 ? 's' : ''}`);
    if (duration.seconds) parts.push(`${duration.seconds} Second${duration.seconds > 1 ? 's' : ''}`);

    return parts.length ? parts.join(' ') : '';
}

export function formatDHMSDuration(timeStr) {
    const timeUnits = {
        d: 1000 * 60 * 60 * 24,
        h: 1000 * 60 * 60,
        m: 1000 * 60,
        s: 1000
    };

    let totalMs = null;
    const regex = /(\d+)([dhms])/g;
    let match;

    while ((match = regex.exec(timeStr.replace(/[^0-9dhms]/g, ''))) !== null) {
        if (!totalMs) totalMs = 0;
        const value = parseInt(match[1], 10);
        const unit = match[2];

        if (timeUnits[unit]) {
            totalMs += value * timeUnits[unit];
        }
    }

    return totalMs;
}

/**
 * @param {keyof typeof message} key
 * @param  {...string} args
 */
export function messageFormat(key, ...args) {
    let result = message[key];
    for (let index = 0; index < args.length; index++) {
        result = result.replaceAll(`{${index}}`, args[index]);
    }
    return result;
}