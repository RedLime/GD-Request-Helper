import { ActivityType, Events, REST, Routes } from 'discord.js';
import * as app from '../app.js';
import commands from './discord/commands.js';
import modals from './discord/modals.js';
import buttons from './discord/buttons.js';
import menus from './discord/menus.js';
import { ServerConfig } from './database.js';
import ServerManager from './class/server_manager.js';
import status from "../status.json" with { type: "json" };

const rest = new REST().setToken(app.config.discord.token);
const newCommands = commands.map(c => {
    if (app.config.debug.enable) c.command.setName('dev-' + c.command.name);
    return c.command.toJSON();
});
await rest.put(app.config.debug.enable ? Routes.applicationGuildCommands(app.config.discord.id, app.config.debug.guildId) : Routes.applicationCommands(app.config.discord.id), { body: newCommands });
console.log(`Successfully created ${newCommands.length} application (/) commands.`);

export function init() {
    app.client.on(Events.InteractionCreate, async interaction => {
        try {
            if (interaction.isChatInputCommand()) await commands.find(c => c.command.name == interaction.commandName)?.execute(interaction);
            if (interaction.isModalSubmit()) {
                const customId = interaction.customId.split(':');
                await modals.find(m => m.id == customId[0])?.execute(interaction, ...customId.slice(1, customId.length));
            }
            if (interaction.isButton()) {
                const customId = interaction.customId.split(':');
                await buttons.find(m => m.id == customId[0])?.execute(interaction, ...customId.slice(1, customId.length));
            }
            if (interaction.isAnySelectMenu()) {
                const customId = interaction.customId.split(':');
                await menus.find(m => m.id == customId[0])?.execute(interaction, ...customId.slice(1, customId.length));
            }
        } catch (e) {
            console.error(e);
        }
    });

    app.client.on(Events.GuildCreate, async guild => {
        if (!ServerConfig.findById(guild.id)) await ServerConfig.create({ _id: guild.id });
    });

    setInterval(async () => {
        try {
            await ServerManager.checkCloseCycle();
            app.client.user.setActivity({ type: ActivityType.Custom, name: status[parseInt(Math.random() * status.length)].replace('{servers}', app.client.guilds.cache.size) });
        } catch (e) {
            console.error(e);
        }
    }, 30 * 1000);
}