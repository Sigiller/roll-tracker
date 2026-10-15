import { TRACKED_DIE_FACES } from "../constants.js";
import type { D20Value } from "../types/tracker.js";

/** One result of a dice term, e.g. one of the two dice of a `2d20kh` roll. */
export interface DieResultLike {
  /** The face rolled. */
  result: number;
}

/**
 * The parts of a Foundry dice term the tracker reads (structurally compatible with
 * `foundry.dice.terms.DiceTerm`).
 */
export interface DieTermLike {
  /** Number of faces of the die; missing for terms that aren't dice with a fixed face count. */
  faces?: number | null;
  /** Every result of the term, including dropped ones (for `kh`/`kl` rolls). */
  results: readonly DieResultLike[];
}

/** The parts of an evaluated Foundry `Roll` the tracker reads. */
export interface RollLike {
  /** Every dice term of the roll, including the ones nested in pools and parenthetical terms. */
  dice: readonly DieTermLike[];
}

/**
 * Every d20 result of a chat message's rolls, in order: all d20 terms of all rolls, so an attack against
 * several targets (one roll per target) counts each target's roll. All results of a term are kept,
 * including the dropped die of a fortune/misfortune (`2d20kh`/`2d20kl`) roll.
 */
export function getD20Results(rolls: readonly RollLike[]): D20Value[] {
  return rolls.flatMap((roll) =>
    roll.dice
      .filter((die) => die.faces === TRACKED_DIE_FACES)
      .flatMap((die) => die.results.map((result) => result.result))
  );
}
