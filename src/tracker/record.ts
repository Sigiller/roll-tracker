import type { D20Value, RollTrackerFlags, RollTrackerFlagsUpdate, StreakState } from "../types/tracker.js";
import { advanceStreak } from "./streak.js";

/** Input of {@link recordRolls}: the stored flags and one message's results. */
export interface RecordInput {
  /** The user's flags before this message. */
  stored: RollTrackerFlags;
  /** The message's d20 results, in order. */
  newNumbers: readonly D20Value[];
  /** Whether the message is a blind roll. */
  isBlind: boolean;
  /** Whether an encounter existed when the message was created. */
  inCombat: boolean;
  /** The "Max rolls stored" setting: the cap of the chronological and combat lists. */
  limit: number;
  /** The "Streak Threshold" setting. */
  streakThreshold: number;
  /** Source of randomness for the one-time shuffle of legacy combat lists; `Math.random` by default. */
  random?: () => number;
}

/** Result of {@link recordRolls}. */
export interface RecordResult {
  /** Flag values to write, in a single update. */
  update: RollTrackerFlagsUpdate;
  /** A streak to announce, or `null`. */
  announcement: StreakState | null;
}

/** Ascending numeric sort into a new array. */
export function sortRolls(rolls: readonly D20Value[]): D20Value[] {
  return [...rolls].sort((a, b) => a - b);
}

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** The last `limit` values (all of them when there are fewer). A limit below 1 keeps nothing. */
export function keepLatest<T>(values: readonly T[], limit: number): T[] {
  return limit >= 1 ? values.slice(-Math.floor(limit)) : [];
}

/**
 * Compute the flags after one message's rolls. The chronological list is the record: the sorted list is
 * rebuilt from it every time, so the two can't drift apart, and both are written together.
 */
export function recordRolls(input: RecordInput): RecordResult {
  const { stored, newNumbers, isBlind, inCombat, limit, streakThreshold, random } = input;
  const unsorted = keepLatest([...(stored.unsorted ?? []), ...newNumbers], limit);
  const { streak, announcement } = advanceStreak({
    previous: stored.streak,
    lastRoll: stored.unsorted?.at(-1),
    newNumbers,
    isBlind,
    threshold: streakThreshold,
  });
  const update: RollTrackerFlagsUpdate = { unsorted, sorted: sortRolls(unsorted), streak };
  if (inCombat) {
    // A list from an earlier version is sorted, so its roll order is unknown: shuffle it once so that the
    // cap drops old values at random instead of always dropping the lowest ones
    const previous = stored.combatOrdered ? stored.combat ?? [] : shuffle(stored.combat ?? [], random);
    update.combat = keepLatest([...previous, ...newNumbers], limit);
    update.combatOrdered = true;
  }
  return { update, announcement };
}
