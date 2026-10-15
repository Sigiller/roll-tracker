import { SOCKET_NAME } from "./constants.js";
import { injectPlayerButtons } from "./players/player-list.js";
import { registerSettings } from "./settings.js";
import { mountGlobalStyles } from "./styles/mount-global.js";
import { onCreateChatMessage, onSocketMessage } from "./tracker/tracker.js";

Hooks.once("init", () => {
  registerSettings();
  mountGlobalStyles();
});

Hooks.once("ready", () => {
  // Players' streak announcements are posted by the active GM
  game.socket?.on(SOCKET_NAME, (data: unknown, senderId: string) => onSocketMessage(data, senderId));
});

// Whenever a chat message is created, record its d20 rolls if they count
Hooks.on("createChatMessage", (message) => onCreateChatMessage(message));

// Add the Roll Tracker buttons to the player list
Hooks.on("renderPlayers", (_app, element) => injectPlayerButtons(element));
