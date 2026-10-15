import { I18N_PREFIX } from "./constants.js";

/** A translation key relative to `ROLL-TRACKER.`, e.g. `"form-label.mean"`. */
export type TranslationKey = string;

/** Translate a key relative to the module's prefix (`"form-label.mean"` → `ROLL-TRACKER.form-label.mean`). */
export function localize(key: TranslationKey): string {
  const full = `${I18N_PREFIX}.${key}`;
  return game.i18n?.localize(full) ?? full;
}

/** Translate a key relative to the module's prefix and fill in its `{placeholders}`. */
export function format(key: TranslationKey, data: Record<string, string | number>): string {
  const full = `${I18N_PREFIX}.${key}`;
  const strings = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
  return game.i18n?.format(full, strings) ?? full;
}

/** A translation function, passed to components and card renderers so they can be tested without Foundry. */
export type Localize = (key: TranslationKey) => string;
