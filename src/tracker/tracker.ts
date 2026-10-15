import { DICE_ANIMATION_TIMEOUT_MS, MODULE_ID, SOCKET_NAME } from "../constants.js";
import { renderStreakCard } from "../chat/cards.js";
import { localize } from "../i18n.js";
import { getSetting, isRestrictingSystem } from "../settings.js";
import { getDiceSoNice } from "../types/dice-so-nice.js";
import { isLinkedToActor } from "../types/system-flags.js";
import type { D20Value, StreakState } from "../types/tracker.js";
import { getD20Results, type RollLike } from "./d20.js";
import { isRollCounted, type SystemRestriction } from "./eligibility.js";
import { KeyedQueue } from "./queue.js";
import { recordRolls } from "./record.js";
import { clearTrackerFlags, readTrackerFlags, writeTrackerFlags } from "./user-flags.js";

/** Socket message from a player asking the active GM to post their streak announcement. */
export interface StreakSocketRequest {
  type: "streak";
  /** The player who is on the streak; must be the user who sent the request. */
  userId: string;
  /** The streak's rolls, oldest first. */
  numbers: D20Value[];
  /** Whether to whisper the announcement to the GMs instead of posting it publicly. */
  whisper: boolean;
}

const queue = new KeyedQueue<string>((error) => console.error(`${MODULE_ID} | Failed to record a roll`, error));

/** The roll and the tracker state of one chat message, captured when the message is created. */
interface PendingRoll {
  user: User.Implementation;
  numbers: D20Value[];
  isBlind: boolean;
  inCombat: boolean;
  /** Resolves once the message's dice animation (if any) has finished. */
  animation: Promise<void>;
}

/**
 * Wait for Dice So Nice's animation of a message, so the roll isn't counted (and a streak announced)
 * before the players have seen it. Never waits longer than {@link DICE_ANIMATION_TIMEOUT_MS}.
 */
async function waitForDiceAnimation(messageId: string): Promise<void> {
  const diceSoNice = getDiceSoNice();
  if (!diceSoNice) return;
  // Dice So Nice marks the message as animating in its own createChatMessage hook, which may run after
  // ours: let every hook finish before asking it
  await new Promise((resolve) => setTimeout(resolve, 0));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise((resolve) => (timer = setTimeout(resolve, DICE_ANIMATION_TIMEOUT_MS)));
  try {
    await Promise.race([diceSoNice.waitFor3DAnimationByMessageID(messageId), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function systemRestriction(message: ChatMessage.Implementation): SystemRestriction {
  const system = game.system?.id;
  if (!isRestrictingSystem(system) || !getSetting.restrictCountedRolls()) return { applies: false };
  return { applies: true, linkedToActor: isLinkedToActor(message.flags, system) };
}

/**
 * Capture a new chat message's d20 rolls, if they count, and queue them for recording. Runs synchronously
 * inside the `createChatMessage` hook, so rolls are queued in the order their messages were created.
 *
 * Only the author's client records the roll: a user can't edit another user's flags.
 */
export function onCreateChatMessage(message: ChatMessage.Implementation): void {
  const author = message.author;
  if (!author || author.id !== game.userId || !message.isRoll) return;

  const numbers = getD20Results(message.rolls as readonly RollLike[]);
  const isBlind = Boolean(message.blind);
  const counted = isRollCounted({
    d20Count: numbers.length,
    isBlind,
    countBlindRolls: getSetting.countBlindRolls(),
    authorIsGM: author.isGM,
    systemRestriction: systemRestriction(message),
  });
  if (!counted) return;

  const pending: PendingRoll = {
    user: author,
    numbers,
    isBlind,
    // The encounter state when the roll was made, not when the queue gets to it
    inCombat: Boolean(game.combat),
    // Start waiting now: the animation may finish while earlier rolls are still being recorded
    animation: message.isContentVisible ? waitForDiceAnimation(message.id ?? "") : Promise.resolve(),
  };
  void queue.run(author.id ?? "", () => record(pending));
}

async function record({ user, numbers, isBlind, inCombat, animation }: PendingRoll): Promise<void> {
  await animation;
  const { update, announcement } = recordRolls({
    stored: readTrackerFlags(user),
    newNumbers: numbers,
    isBlind,
    inCombat,
    limit: getSetting.rollStorage(),
    streakThreshold: getSetting.streakThreshold(),
  });
  await writeTrackerFlags(user, update);
  if (announcement) announceStreak(user, announcement);
}

/** Remove a user's tracked rolls. Queued like a roll, so it can't interleave with one being recorded. */
export function clearRolls(userId: string): Promise<void> {
  return queue.run(userId, async () => {
    const user = game.users?.get(userId);
    if (user) await clearTrackerFlags(user);
  });
}

/** Resolves once every roll queued so far for a user on this client has been recorded. */
export function rollsSettled(userId: string): Promise<void> {
  return queue.settled(userId);
}

/** Ids of the GM users, the recipients of a whispered announcement. */
function gmIds(): string[] {
  return (game.users?.filter((u) => u.isGM).map((u) => u.id) ?? []).filter((id): id is string => Boolean(id));
}

/** Post a streak announcement. Players can't whisper as the module, so they ask the active GM to do it. */
function announceStreak(user: User.Implementation, streak: StreakState): void {
  const behaviour = getSetting.streakBehaviour();
  if (behaviour === "disable") return;
  // A streak that includes a blind roll is only whispered to GMs, as it could reveal that roll
  const whisper = streak.includesBlind || behaviour === "hidden";
  if (game.user?.isGM) {
    void postStreak(user, streak.numbers, whisper);
    return;
  }
  const request: StreakSocketRequest = { type: "streak", userId: user.id ?? "", numbers: streak.numbers, whisper };
  game.socket?.emit(SOCKET_NAME, request);
}

async function postStreak(user: User.Implementation, numbers: readonly D20Value[], whisper: boolean): Promise<void> {
  await ChatMessage.implementation.create({
    content: renderStreakCard({ name: user.name ?? "", numbers }, localize),
    speaker: { alias: localize("title") },
    whisper: whisper ? gmIds() : [],
  });
}

function isStreakRequest(data: unknown): data is StreakSocketRequest {
  if (typeof data !== "object" || data === null) return false;
  const r = data as Partial<StreakSocketRequest>;
  return (
    r.type === "streak" &&
    typeof r.userId === "string" &&
    Array.isArray(r.numbers) &&
    r.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 20) &&
    typeof r.whisper === "boolean"
  );
}

/**
 * Handle a player's streak request on GM clients. Only the active GM posts it, so it appears once even
 * with several GMs connected; the content is built here from validated data.
 */
export function onSocketMessage(data: unknown, senderId: string): void {
  if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) return;
  if (!isStreakRequest(data) || data.userId !== senderId) return;
  const user = game.users.get(data.userId);
  if (user) void postStreak(user, data.numbers, data.whisper);
}
