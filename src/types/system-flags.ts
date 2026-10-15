import type { RestrictingSystem } from "../settings.js";

/** The dnd5e system's chat message flags the tracker reads: set on rolls made from an actor. */
export interface Dnd5eMessageFlags {
  roll?: {
    /** The roll's kind ("attack", "save", "skill", …); absent on plain `/r` rolls. */
    type?: string;
  };
}

/** The pf2e system's chat message flags the tracker reads: set on rolls made from an actor. */
export interface Pf2eMessageFlags {
  context?: {
    /** The roll's kind ("attack-roll", "saving-throw", …); absent on plain `/r` rolls. */
    type?: string;
  };
}

/** A chat message's system flags, keyed by system id. Single cast point for these untyped flags. */
interface SystemMessageFlags {
  dnd5e?: Dnd5eMessageFlags;
  pf2e?: Pf2eMessageFlags;
}

/** Whether a message's roll was made from an actor (an attack, save, check…), per the system's own flags. */
export function isLinkedToActor(flags: unknown, system: RestrictingSystem): boolean {
  const systemFlags = (flags ?? {}) as SystemMessageFlags;
  return system === "dnd5e" ? Boolean(systemFlags.dnd5e?.roll?.type) : Boolean(systemFlags.pf2e?.context?.type);
}
