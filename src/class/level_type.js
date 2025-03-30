import * as app from "../../app.js";
// eslint-disable-next-line no-unused-vars
import { ServerConfig } from "../database.js";

export default class LevelType {

    constructor(context, configSelector, emojiId, field) {
        /** @type {String} */
        this.context = context;

        /** @type {(serverConfig: import("mongoose").InferSchemaType<typeof ServerConfig.schema>) => any} returns ServerConfig.request.{classic|platformer}.{normal|demon} */
        this.configSelector = configSelector;

        /** @private */
        this.emojiId = emojiId;

        this.field = field;
    }

    getEmoji() {
        return app.emoji[this.emojiId];
    }

    /** @constant */
    static CLASSIC = new LevelType('Classic & Non-Demon', serverConfig => serverConfig.request.classic.normal, 'star', 'classic.normal');
    /** @constant */
    static CLASSIC_DEMON = new LevelType('Classic & Demon', serverConfig => serverConfig.request.classic.demon, 'star_demon', 'classic.demon');
    /** @constant */
    static PLATFORMER = new LevelType('Platformer & Non-Demon', serverConfig => serverConfig.request.platformer.normal, 'moon', 'platformer.normal');
    /** @constant */
    static PLATFORMER_DEMON = new LevelType('Platformer & Demon', serverConfig => serverConfig.request.platformer.demon, 'moon_demon', 'platformer.demon');

    static getType(isPlatformer, isDemon) {
        if (isPlatformer) return isDemon ? this.PLATFORMER_DEMON : this.PLATFORMER;
        else return isDemon ? this.CLASSIC_DEMON : this.CLASSIC;
    }

    static all() {
        return [LevelType.CLASSIC, LevelType.CLASSIC_DEMON, LevelType.PLATFORMER, LevelType.PLATFORMER_DEMON];
    }

}