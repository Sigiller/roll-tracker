import { FLAG_KEYS, MODULE_ID } from "../constants.js";
import type { D20Value, RollTrackerFlags, RollTrackerFlagsUpdate, RollView, StreakState } from "../types/tracker.js";

function numberList(value: unknown): D20Value[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is number => typeof v === "number") : undefined;
}

function streakState(value: unknown): StreakState | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { numbers, includesBlind } = value as Partial<StreakState>;
  return { numbers: numberList(numbers) ?? [], includesBlind: Boolean(includesBlind) };
}

/**
 * A user's tracker flags, validated: lists keep only numbers and missing keys stay missing. Flags were
 * written by earlier versions too, so they aren't trusted to match {@link RollTrackerFlags} exactly.
 */
export function readTrackerFlags(user: User.Implementation): RollTrackerFlags {
  const raw = (user.flags as Record<string, unknown>)[MODULE_ID];
  if (typeof raw !== "object" || raw === null) return {};
  const flags = raw as Record<string, unknown>;
  const out: RollTrackerFlags = {};
  const unsorted = numberList(flags[FLAG_KEYS.unsorted]);
  const sorted = numberList(flags[FLAG_KEYS.sorted]);
  const combat = numberList(flags[FLAG_KEYS.combat]);
  const streak = streakState(flags[FLAG_KEYS.streak]);
  if (unsorted) out.unsorted = unsorted;
  if (sorted) out.sorted = sorted;
  if (combat) out.combat = combat;
  if (flags[FLAG_KEYS.combatOrdered] === true) out.combatOrdered = true;
  if (streak) out.streak = streak;
  const exported = flags[FLAG_KEYS.export];
  if (typeof exported === "string") out.export = exported;
  return out;
}

/** The rolls of one view: all tracked rolls (the chronological list) or the combat rolls. */
export function rollsForView(flags: RollTrackerFlags, view: RollView): D20Value[] {
  return (view === "combat" ? flags.combat : flags.unsorted) ?? [];
}

/**
 * Whether a User update changes what the user's tracker window shows: their tracked rolls (any key under
 * `flags["roll-tracker"]`, including deletions) or their name, which is the window's heading.
 */
export function affectsTrackerWindow(changes: object): boolean {
  const { name, flags } = changes as { name?: unknown; flags?: Record<string, unknown> };
  if (name !== undefined) return true;
  if (!flags) return false;
  return Object.keys(flags).some((key) => key === MODULE_ID || key === `-=${MODULE_ID}`);
}

/** Write the flags of one recorded message in a single document update. */
export async function writeTrackerFlags(user: User.Implementation, update: RollTrackerFlagsUpdate): Promise<void> {
  await user.update({ flags: { [MODULE_ID]: update } } as User.UpdateData);
}

/** Remove every tracker flag of a user. */
export async function clearTrackerFlags(user: User.Implementation): Promise<void> {
  for (const key of Object.values(FLAG_KEYS)) {
    await user.unsetFlag(MODULE_ID, key);
  }
}
