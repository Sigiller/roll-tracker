/**
 * Design tokens. Colours reuse Foundry's CSS variables, so the window and the chat cards follow the
 * active light/dark theme; the literal values are fallbacks.
 */
export const rollTrackerTheme = {
  colourText: "var(--color-text-primary, #221f1f)",
  colourTextSubtle: "var(--color-text-subtle, #555)",
  colourHeading: "var(--color-text-emphatic, #000)",
  /** A good result for the user (high mean, many natural 20s). */
  colourGood: "var(--color-level-success, darkgreen)",
  /** A bad result for the user (low mean, many natural 1s). */
  colourBad: "var(--color-level-error, darkred)",
  /** Glow of the player list button on hover/focus. */
  colourButtonGlow: "var(--color-level-error, red)",
  spacingRow: "0.25rem",
  spacingSection: "0.5rem",
  fontSizeHeading: "var(--font-size-16, 1rem)",
} as const;

/** Type of the styled-components theme (see `styled.d.ts`). */
export type RollTrackerTheme = typeof rollTrackerTheme;
