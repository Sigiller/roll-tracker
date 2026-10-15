/**
 * Domain types of the roll tracker. They are plain data, free of Foundry types, so the logic that works on
 * them can be unit-tested outside Foundry.
 */

/**
 * The face shown by one d20: an integer from 1 to 20. A plain number at the type level; values outside the
 * range never reach the tracker because they only come from d20 terms of evaluated rolls.
 */
export type D20Value = number;

/**
 * Which set of a user's rolls is shown or compared.
 * - `"sorted"`: all tracked rolls (the most recent ones, up to the "Max rolls stored" setting).
 * - `"combat"`: only rolls made while an encounter existed on the roller's viewed scene.
 *
 * The values double as flag keys ({@link RollTrackerFlags.sorted}, {@link RollTrackerFlags.combat}) and
 * were persisted by earlier versions, which is why "all rolls" is called `"sorted"`.
 */
export type RollView = "sorted" | "combat";

/** A run of consecutive rolls where each one is within 1 of the roll before it. */
export interface StreakState {
  /**
   * The rolls of the current run, oldest first. Empty while there is no run; holds at least two numbers
   * once a run has started (the roll that started it and the one that continued it).
   */
  numbers: D20Value[];
  /**
   * Whether any roll of the current run (or, with no run, the latest roll) was a blind roll. A streak that
   * includes a blind roll is only whispered to GMs, since announcing it would reveal that roll.
   */
  includesBlind: boolean;
}

/**
 * Everything the module stores on a User document, under `flags["roll-tracker"]`. Every key is optional:
 * a user who never rolled has none, and Clear Data removes them all.
 */
export interface RollTrackerFlags {
  /**
   * The user's tracked rolls in the order they were made, oldest first, capped at the "Max rolls stored"
   * setting (the oldest are dropped first). This is the record the other lists are derived from.
   */
  unsorted?: D20Value[];
  /**
   * The same values as {@link unsorted}, sorted ascending. Rebuilt from `unsorted` on every roll, never
   * edited on its own; kept as a separate flag because earlier versions read it directly.
   */
  sorted?: D20Value[];
  /**
   * Rolls made while an encounter existed, capped like {@link unsorted}. In roll order once
   * {@link combatOrdered} is set; earlier versions stored this list sorted and without a cap.
   */
  combat?: D20Value[];
  /**
   * Marks {@link combat} as being in roll order. Absent on lists written by earlier versions, which are
   * shuffled once before the cap is applied so the cap doesn't always drop the lowest values.
   */
  combatOrdered?: boolean;
  /** The current streak of the user's rolls. */
  streak?: StreakState;
  /**
   * Export file contents cached by earlier versions. No longer written (the export is built when the
   * Download button is pressed); still removed by Clear Data.
   */
  export?: string;
}

/** The flag values written after a roll: always the chronological and sorted lists and the streak. */
export interface RollTrackerFlagsUpdate {
  unsorted: D20Value[];
  sorted: D20Value[];
  streak: StreakState;
  /** Only written for rolls made in an encounter. */
  combat?: D20Value[];
  /** Written together with {@link combat}. */
  combatOrdered?: true;
}

/** Statistics of one set of rolls, as shown in the tracker window and the chat cards. */
export interface RollStats {
  /** Arithmetic mean, rounded to the nearest integer. */
  mean: number;
  /** Median; the mean of the two middle values (so possibly x.5) when the count is even. */
  median: number;
  /** The most frequent values, ascending. Several values when they tie; `[]` when there are no rolls. */
  mode: D20Value[];
  /** How many times each value in {@link mode} was rolled. */
  modeCount: number;
  /** Number of natural 1s. */
  nat1s: number;
  /** Natural 1s as a percentage of all rolls, rounded to an integer. */
  nat1sPercentage: number;
  /** Number of natural 20s. */
  nat20s: number;
  /** Natural 20s as a percentage of all rolls, rounded to an integer. */
  nat20sPercentage: number;
  /** Number of rolls the statistics were computed from. */
  count: number;
}

/** How the streak announcement is shown, from the "Streak Behaviour" world setting. */
export type StreakBehaviour = "disable" | "hidden" | "shown";
