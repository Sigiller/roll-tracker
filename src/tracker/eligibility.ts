/**
 * Whether the game system limits counted rolls to the ones linked to an actor (an attack or a check rather
 * than a typed `/r 1d20`). Only dnd5e and pf2e have the "Don't Count Unlinked Rolls" setting.
 */
export type SystemRestriction =
  /** The system has no such setting, or it is turned off. */
  | { applies: false }
  /** The setting is on; `linkedToActor` tells whether this message's roll came from an actor. */
  | { applies: true; linkedToActor: boolean };

/** What decides whether a chat message's rolls are tracked. */
export interface CountedRollCheck {
  /** How many d20 results the message contains (see `getD20Results`). */
  d20Count: number;
  /** Whether the message is a blind roll. */
  isBlind: boolean;
  /** The "Count Blind Rolls?" world setting. */
  countBlindRolls: boolean;
  /** Whether the author is a GM. A GM's blind rolls are always counted. */
  authorIsGM: boolean;
  /** The system's restriction to rolls linked to an actor. */
  systemRestriction: SystemRestriction;
}

/** Whether a message's d20 results should be recorded for its author. */
export function isRollCounted(check: CountedRollCheck): boolean {
  if (check.d20Count === 0) return false;
  if (check.isBlind && !check.countBlindRolls && !check.authorIsGM) return false;
  if (check.systemRestriction.applies && !check.systemRestriction.linkedToActor) return false;
  return true;
}
