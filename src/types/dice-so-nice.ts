/**
 * The part of the Dice So Nice API (`game.dice3d`) the tracker uses. Dice So Nice ships no types, so this
 * is the single cast point for it.
 */
export interface DiceSoNiceApi {
  /**
   * Resolves when the 3D animation of a chat message's rolls has finished. Resolves at once when the
   * message isn't being animated (no dice, animations off, "immediately display chat messages" on, or
   * initiative animations disabled), so it must be called after Dice So Nice's own `createChatMessage`
   * hook has marked the message.
   */
  waitFor3DAnimationByMessageID(messageId: string): Promise<boolean>;
}

/** The Dice So Nice API, or `undefined` when the module isn't active (or too old to have the method). */
export function getDiceSoNice(): DiceSoNiceApi | undefined {
  const api = (game as { dice3d?: Partial<DiceSoNiceApi> }).dice3d;
  return typeof api?.waitFor3DAnimationByMessageID === "function" ? (api as DiceSoNiceApi) : undefined;
}
