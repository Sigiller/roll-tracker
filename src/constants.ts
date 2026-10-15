/** Package id: settings namespace, flag scope, CSS class prefix and template of the socket name. */
export const MODULE_ID = "roll-tracker";

/** Socket channel used by players to ask a GM to post a streak announcement. */
export const SOCKET_NAME = `module.${MODULE_ID}` as const;

/** Prefix of every translation key in `lang/en.json`. */
export const I18N_PREFIX = "ROLL-TRACKER";

/** Number of faces of the die this module tracks. */
export const TRACKED_DIE_FACES = 20;

/**
 * Keys of the flags stored on each User document under the `roll-tracker` scope. The values are persisted
 * in worlds, so they must not change: see {@link RollTrackerFlags} for what each one holds.
 */
export const FLAG_KEYS = {
  sorted: "sorted",
  unsorted: "unsorted",
  combat: "combat",
  combatOrdered: "combatOrdered",
  streak: "streak",
  export: "export",
} as const;

/** Keys of the world settings, as persisted by earlier versions of the module. */
export const SETTING_KEYS = {
  gmSeePlayers: "gm_see_players",
  playersSeePlayers: "players_see_players",
  rollStorage: "roll_storage",
  countHidden: "count_hidden",
  streakBehaviour: "streak_behaviour",
  streakThreshold: "streak_threshold",
  restrictCountedRolls: "restrict_counted_rolls",
} as const;

/** How long to wait for Dice So Nice to report the end of an animation before recording a roll anyway. */
export const DICE_ANIMATION_TIMEOUT_MS = 15_000;
