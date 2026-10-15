import type { D20Value, StreakState } from "../types/tracker.js";

/** Input of {@link advanceStreak}. */
export interface StreakInput {
  /** The stored streak, if the user has one. */
  previous: StreakState | undefined;
  /** The user's most recent tracked roll before this message, if any. */
  lastRoll: D20Value | undefined;
  /** This message's d20 results, in order. */
  newNumbers: readonly D20Value[];
  /** Whether this message is a blind roll. */
  isBlind: boolean;
  /** The "Streak Threshold" setting: how many rolls make a streak worth announcing. */
  threshold: number;
}

/** Result of {@link advanceStreak}. */
export interface StreakResult {
  /** The streak to store. */
  streak: StreakState;
  /**
   * The streak to announce, or `null`. At most one per message: the longest run reached while adding its
   * numbers, even if a later number of the same message broke it.
   */
  announcement: StreakState | null;
}

/** Two rolls continue a streak when they are within 1 of each other. */
export function continuesStreak(previous: D20Value, current: D20Value): boolean {
  return Math.abs(current - previous) <= 1;
}

/**
 * Add a message's numbers to the user's streak, one at a time: each number is compared with the one before
 * it, which for the first number is the user's last tracked roll.
 */
export function advanceStreak({ previous, lastRoll, newNumbers, isBlind, threshold }: StreakInput): StreakResult {
  const streak: StreakState = {
    numbers: [...(previous?.numbers ?? [])],
    // A run that already included a blind roll, or continues with one, includes a blind roll
    includesBlind: Boolean(previous?.includesBlind) || isBlind,
  };
  let announcement: StreakState | null = null;
  let prevRoll = lastRoll;
  for (const current of newNumbers) {
    if (prevRoll !== undefined && continuesStreak(prevRoll, current)) {
      if (streak.numbers.length === 0) streak.numbers.push(prevRoll);
      streak.numbers.push(current);
      if (streak.numbers.length >= threshold) {
        announcement = { numbers: [...streak.numbers], includesBlind: streak.includesBlind };
      }
    } else {
      // The run is broken. A future run includes a blind roll only if it starts from this blind roll
      streak.numbers = [];
      streak.includesBlind = isBlind;
    }
    prevRoll = current;
  }
  return { streak, announcement };
}
