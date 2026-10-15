import { I18N_PREFIX, MODULE_ID, SETTING_KEYS } from "./constants.js";
import { localize } from "./i18n.js";
import type { StreakBehaviour } from "./types/tracker.js";

/** Game systems that have the "Don't Count Unlinked Rolls" setting. */
export type RestrictingSystem = "dnd5e" | "pf2e";

/** Whether the "Don't Count Unlinked Rolls" setting exists for a system. */
export function isRestrictingSystem(systemId: string | undefined): systemId is RestrictingSystem {
  return systemId === "dnd5e" || systemId === "pf2e";
}

/** Translation keys of a setting's name and hint (`ROLL-TRACKER.settings.<key>.Name` / `.Hint`). */
function labels(key: string): { name: string; hint: string } {
  return { name: `${I18N_PREFIX}.settings.${key}.Name`, hint: `${I18N_PREFIX}.settings.${key}.Hint` };
}

/** The player list shows the buttons, so it has to be redrawn when their visibility changes. */
function rerenderPlayers(): void {
  void ui.players?.render();
}

/** Register the module's world settings. Keys and defaults match earlier versions so stored values carry over. */
export function registerSettings(): void {
  const settings = game.settings;
  if (!settings) return;

  settings.register(MODULE_ID, SETTING_KEYS.gmSeePlayers, {
    ...labels(SETTING_KEYS.gmSeePlayers),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: rerenderPlayers,
  });

  settings.register(MODULE_ID, SETTING_KEYS.rollStorage, {
    ...labels(SETTING_KEYS.rollStorage),
    scope: "world",
    config: true,
    type: Number,
    range: { min: 10, max: 500, step: 10 },
    default: 50,
  });

  settings.register(MODULE_ID, SETTING_KEYS.playersSeePlayers, {
    ...labels(SETTING_KEYS.playersSeePlayers),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: rerenderPlayers,
  });

  settings.register(MODULE_ID, SETTING_KEYS.countHidden, {
    ...labels(SETTING_KEYS.countHidden),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  const streakChoices: Record<StreakBehaviour, string> = {
    hidden: localize(`settings.${SETTING_KEYS.streakBehaviour}.hidden`),
    disable: localize(`settings.${SETTING_KEYS.streakBehaviour}.disable`),
    shown: localize(`settings.${SETTING_KEYS.streakBehaviour}.shown`),
  };
  settings.register(MODULE_ID, SETTING_KEYS.streakBehaviour, {
    ...labels(SETTING_KEYS.streakBehaviour),
    scope: "world",
    config: true,
    type: String,
    choices: streakChoices,
    default: "hidden",
  });

  settings.register(MODULE_ID, SETTING_KEYS.streakThreshold, {
    ...labels(SETTING_KEYS.streakThreshold),
    scope: "world",
    config: true,
    type: Number,
    range: { min: 2, max: 5, step: 1 },
    default: 3,
  });

  const systemId = game.system?.id;
  if (isRestrictingSystem(systemId)) {
    settings.register(MODULE_ID, SETTING_KEYS.restrictCountedRolls, {
      ...labels(`${systemId}.${SETTING_KEYS.restrictCountedRolls}`),
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
    });
  }
}

/** Current values of the settings the tracker reads, typed. */
export const getSetting = {
  gmSeesPlayers: (): boolean => Boolean(game.settings?.get(MODULE_ID, SETTING_KEYS.gmSeePlayers)),
  playersSeeOwn: (): boolean => Boolean(game.settings?.get(MODULE_ID, SETTING_KEYS.playersSeePlayers)),
  rollStorage: (): number => Number(game.settings?.get(MODULE_ID, SETTING_KEYS.rollStorage) ?? 50),
  countBlindRolls: (): boolean => Boolean(game.settings?.get(MODULE_ID, SETTING_KEYS.countHidden)),
  streakBehaviour: (): StreakBehaviour => {
    const value = game.settings?.get(MODULE_ID, SETTING_KEYS.streakBehaviour);
    return value === "disable" || value === "shown" ? value : "hidden";
  },
  streakThreshold: (): number => Number(game.settings?.get(MODULE_ID, SETTING_KEYS.streakThreshold) ?? 3),
  /** `false` outside dnd5e and pf2e, where the setting isn't registered. */
  restrictCountedRolls: (): boolean =>
    isRestrictingSystem(game.system?.id) && Boolean(game.settings?.get(MODULE_ID, SETTING_KEYS.restrictCountedRolls)),
};
