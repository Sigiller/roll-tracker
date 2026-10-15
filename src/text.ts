/**
 * Join items into an English-style list with a final conjunction: `"a"`, `"a and b"`, `"a, b, and c"`.
 * Empty for no items.
 */
export function joinWithConjunction(items: readonly string[], conjunction: string): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items.at(-1)}`;
}
