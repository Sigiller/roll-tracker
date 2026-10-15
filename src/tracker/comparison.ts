import type { D20Value, RollStats, RollView } from "../types/tracker.js";
import { percentage } from "./stats.js";

/** One user's statistics, the input of the comparison card. */
export interface PlayerStats {
  userId: string;
  /** Display name of the user. */
  name: string;
  stats: RollStats;
}

/** One user's value of a compared statistic. */
export interface Standing {
  userId: string;
  name: string;
  /** The statistic's value for this user. */
  value: number;
  /** How many rolls the user's statistics are based on. */
  rolls: number;
}

/** The users with the highest and lowest value of one statistic (several when they tie). */
export interface StatRanking {
  /** Users sharing the highest value, in input order. */
  highest: Standing[];
  /** Users sharing the lowest value, in input order. */
  lowest: Standing[];
  /** Mean of the statistic across all compared users, rounded. */
  average: number;
}

/** The user whose mode appears most often, by raw count or by share of their rolls. */
export interface ModeLeader {
  userId: string;
  name: string;
  /** The user's most frequent values (several when they tie). */
  mode: D20Value[];
  /** How many times each of those values was rolled. */
  modeCount: number;
  /** How many rolls the user made. */
  rolls: number;
  /** {@link modeCount} as a percentage of {@link rolls}. */
  percentage: number;
}

/** The statistics that are ranked highest/lowest on the comparison card. */
export type RankedStat = "mean" | "median" | "nat1s" | "nat1sPercentage" | "nat20s" | "nat20sPercentage";

/** Everything the comparison card shows. */
export interface Comparison {
  /** Which rolls were compared. */
  view: RollView;
  /** Highest/lowest standings per ranked statistic. */
  rankings: Record<RankedStat, StatRanking>;
  /** The user whose mode appears most often in raw count. Ties go to the first user in input order. */
  modeByCount: ModeLeader;
  /** The user whose mode makes up the largest share of their rolls. Ties go to the first user. */
  modeByPercentage: ModeLeader;
}

/** A list with at least one element. */
type NonEmpty<T> = readonly [T, ...T[]];

function isNonEmpty<T>(items: readonly T[]): items is NonEmpty<T> {
  return items.length > 0;
}

const RANKED_STATS: readonly RankedStat[] = ["mean", "median", "nat1s", "nat1sPercentage", "nat20s", "nat20sPercentage"];

/** Rank all players on one numeric score, keeping every player tied for the top and for the bottom. */
function rank(players: readonly PlayerStats[], score: (stats: RollStats) => number): StatRanking {
  const standings = players.map<Standing>((p) => ({
    userId: p.userId,
    name: p.name,
    value: score(p.stats),
    rolls: p.stats.count,
  }));
  const values = standings.map((s) => s.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return {
    highest: standings.filter((s) => s.value === max),
    lowest: standings.filter((s) => s.value === min),
    average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  };
}

function modeLeader(players: NonEmpty<PlayerStats>, score: (stats: RollStats) => number): ModeLeader {
  let best = players[0];
  for (const p of players) if (score(p.stats) > score(best.stats)) best = p;
  const { stats } = best;
  return {
    userId: best.userId,
    name: best.name,
    mode: stats.mode,
    modeCount: stats.modeCount,
    rolls: stats.count,
    percentage: percentage(stats.modeCount, stats.count),
  };
}

/**
 * Compare the players who have at least one roll in the chosen view. Returns `null` when nobody has, as
 * there is nothing to compare.
 */
export function buildComparison(allPlayers: readonly PlayerStats[], view: RollView): Comparison | null {
  const players = allPlayers.filter((p) => p.stats.count > 0);
  if (!isNonEmpty(players)) return null;
  const rankings = Object.fromEntries(RANKED_STATS.map((stat) => [stat, rank(players, (s) => s[stat])])) as Record<
    RankedStat,
    StatRanking
  >;
  return {
    view,
    rankings,
    modeByCount: modeLeader(players, (s) => s.modeCount),
    modeByPercentage: modeLeader(players, (s) => percentage(s.modeCount, s.count)),
  };
}
