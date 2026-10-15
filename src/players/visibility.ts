/** What decides which player list entries get a Roll Tracker button. */
export interface ButtonVisibilityInput {
  /** Whether the current user is a GM. */
  isGM: boolean;
  /** The "See Player Roll Icons?" setting: a GM gets a button next to every user. */
  gmSeesPlayers: boolean;
  /** The "Can Players Access Tracked Rolls?" setting: a player gets a button next to their own name. */
  playersSeeOwn: boolean;
  /** The current user's id. */
  currentUserId: string;
  /** Ids of all users in the world. */
  userIds: readonly string[];
}

/**
 * Ids of the users whose player list entry gets a Roll Tracker button: every user for a GM with
 * "See Player Roll Icons?" on, otherwise the GM's own entry; a player's own entry if players may access
 * their rolls, otherwise none.
 */
export function trackerButtonUserIds(input: ButtonVisibilityInput): string[] {
  if (input.isGM) return input.gmSeesPlayers ? [...input.userIds] : [input.currentUserId];
  return input.playersSeeOwn ? [input.currentUserId] : [];
}
