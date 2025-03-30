import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import * as app from '../../app.js';
import LevelType from './level_type.js';

export default class LevelInfo {

    /**
     * @param {*} levelId
     * @returns returns fetched level info. if it's `null`, level doesn't exist. if it's `undefined`, server doesn't work.
     */
    static async fetchFromServer(levelId) {
        const fetchResult = await fetch(app.getServerUrl('/getGJLevels21.php'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': ''
            },
            body: new URLSearchParams({
                secret: "Wmfd2893gb7",
                type: 0,
                gameVersion: 22,
                binaryVersion: 42,
                str: levelId
            })
        }).catch(e => {
            console.log(e);
            return null;
        });

        if (!fetchResult?.ok) return undefined;

        const result = await fetchResult?.text().catch(() => null);
        if (!result) return undefined;
        if (result == -1) return null;

        const creators = Object.fromEntries(result.split('#')[1].split('|').map(data => {
            const user = data.split(':');
            return [user[0], {
                id: +user[2] || 0,
                name: user[1]
            }];
        }));
        const level = result.split('#')[0].split('|').map(data => {
            const levelData = {};
            const parts = data.split(':');
            for (let i = 0; i < parts.length - 1; i += 2) {
                levelData[parts[i]] = parts[i + 1];
            }
            return new LevelInfo(
                +levelData[1],
                levelData[2],
                Buffer.from(levelData[3], 'base64url').toString('utf8').substring(0, 512),
                creators[levelData[6]],
                +levelData[15] == 5,
                levelData[18] > 0,
                +levelData[39] || null
            );
        })[0];
        return level;
    }

    static getDifficultyId(difficulty) {
        if (difficulty == 1)
            return 'auto';
        if (difficulty == 2)
            return 'easy';
        if (difficulty == 3)
            return 'normal';
        if (difficulty == 4 || difficulty == 5)
            return 'hard';
        if (difficulty == 6 || difficulty == 7)
            return 'harder';
        if (difficulty == 8 || difficulty == 9)
            return 'insane';
        if (difficulty == 10)
            return 'easy_demon';
        if (difficulty == 11)
            return 'medium_demon';
        if (difficulty == 12)
            return 'hard_demon';
        if (difficulty == 13)
            return 'insane_demon';
        if (difficulty == 14)
            return 'extreme_demon';
        return 'unknown';
    }

    /**
     * @param {boolean} isDemon
     * @param {number[]} difficulties
     * @returns
     */
    static getDifficultyContext(isDemon, difficulties) {
        if (!difficulties.length) return null;

        const reward = this.isPlatformer ? app.emoji.moon : app.emoji.star;
        if (isDemon) return (difficulties.map(d => app.emoji[this.getDifficultyId(d)]).join('') || app.emoji.hard_demon) + ` ${reward}10`;
        else if (difficulties.length == 1) return `${app.emoji[this.getDifficultyId(difficulties[0])]} ${reward}${difficulties[0]}`;
        else return `${[...new Set(difficulties.map(d => this.getDifficultyId(d)))].map(d => app.emoji[d]).join('')} ${reward}${Math.min(...difficulties)}~${Math.max(...difficulties)}`;
    }

    constructor(id, name, description, uploader, isPlatformer, isRated, starRequested) {

        /** @type {number} */
        this.id = id;

        /** @type {string} */
        this.name = name;

        /** @type {string} */
        this.description = description;

        /** @type {{id: number?, name: string}} */
        this.uploader = uploader;

        /** @type {boolean} */
        this.isPlatformer = isPlatformer;

        /** @type {boolean} */
        this.isRated = isRated;

        /** @type {number?} */
        this.starRequested = starRequested;

    }

    getType(isDemon = this.starRequested == 10) {
        if (isDemon) return this.isPlatformer ? LevelType.PLATFORMER_DEMON : LevelType.CLASSIC_DEMON;
        return this.isPlatformer ? LevelType.PLATFORMER : LevelType.CLASSIC;
    }

}