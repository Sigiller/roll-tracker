import type { D20Value, RollStats } from "../types/tracker.js";
import { sortRolls } from "./record.js";

/** Statistics of an empty set of rolls. */
export const EMPTY_STATS: Readonly<RollStats> = Object.freeze({
  mean: 0,
  median: 0,
  mode: [],
  modeCount: 0,
  nat1s: 0,
  nat1sPercentage: 0,
  nat20s: 0,
  nat20sPercentage: 0,
  count: 0,
});

/** How many times each value was rolled, keyed by value. */
export function countValues(rolls: readonly D20Value[]): Map<D20Value, number> {
  const counts = new Map<D20Value, number>();
  for (const value of rolls) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

/** Share of `part` in `total` as a rounded percentage; 0 when `total` is 0. */
export function percentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Statistics of a set of rolls, in any order (the input is not modified). */
export function calculateStats(rolls: readonly D20Value[] | undefined): RollStats {
  const sorted = sortRolls(rolls ?? []);
  const count = sorted.length;
  if (count === 0) return { ...EMPTY_STATS, mode: [] };

  const sum = sorted.reduce((total, value) => total + value, 0);
  const middle = Math.floor(count / 2);
  const median = count % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;

  const counts = countValues(sorted);
  const modeCount = Math.max(...counts.values());
  const mode = [...counts].filter(([, n]) => n === modeCount).map(([value]) => value);

  const nat1s = counts.get(1) ?? 0;
  const nat20s = counts.get(20) ?? 0;
  return {
    mean: Math.round(sum / count),
    median,
    mode,
    modeCount,
    nat1s,
    nat1sPercentage: percentage(nat1s, count),
    nat20s,
    nat20sPercentage: percentage(nat20s, count),
    count,
  };
}
