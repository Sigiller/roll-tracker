import type { RollTrackerFlags, StreakBehaviour } from "./types/tracker.js";

declare module "fvtt-types/configuration" {
  /** World settings registered by this module (see `settings.ts`). */
  export interface SettingConfig {
    /** "See Player Roll Icons?": a GM sees a Roll Tracker button next to every user. */
    "roll-tracker.gm_see_players": boolean;
    /** "Can Players Access Tracked Rolls?": players see a button next to their own name. */
    "roll-tracker.players_see_players": boolean;
    /** "Max rolls stored": cap of each user's chronological and combat lists. */
    "roll-tracker.roll_storage": number;
    /** "Count Blind Rolls?": whether players' blind rolls are tracked (GMs' always are). */
    "roll-tracker.count_hidden": boolean;
    /** "Streak Behaviour": how streak announcements are shown. */
    "roll-tracker.streak_behaviour": StreakBehaviour;
    /** "Streak Threshold": how many consecutive rolls within 1 of each other are announced. */
    "roll-tracker.streak_threshold": number;
    /** "Don't Count Unlinked Rolls" (dnd5e and pf2e only): ignore rolls not linked to an actor. */
    "roll-tracker.restrict_counted_rolls": boolean;
  }

  export interface FlagConfig {
    /** Each user's tracked rolls. */
    User: {
      "roll-tracker": RollTrackerFlags;
    };
  }
}

export {};
