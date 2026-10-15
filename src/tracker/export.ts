import type { D20Value } from "../types/tracker.js";
import { sortRolls } from "./record.js";
import { countValues } from "./stats.js";

/**
 * The R-friendly export file: one `value,count` line per rolled value, ascending by value, each line
 * ending with a newline. Empty for no rolls.
 */
export function toExportText(rolls: readonly D20Value[]): string {
  return [...countValues(sortRolls(rolls))].map(([value, count]) => `${value},${count}\n`).join("");
}
