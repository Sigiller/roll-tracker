import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { clearGlobals, setGlobal } from "./helpers/globals.js";

/** A user document whose updates resolve after a random delay, like a server round trip. */
class FakeUser {
  flags: Record<string, Record<string, unknown>> = {};
  constructor(
    readonly id: string,
    readonly name: string,
    readonly isGM: boolean
  ) {}
  async update(data: { flags: Record<string, Record<string, unknown>> }): Promise<void> {
    const snapshot = structuredClone(data);
    await new Promise((r) => setTimeout(r, Math.random() * 15));
    for (const [scope, values] of Object.entries(snapshot.flags)) Object.assign((this.flags[scope] ??= {}), values);
  }
  async unsetFlag(scope: string, key: string): Promise<void> {
    await new Promise((r) => setTimeout(r, Math.random() * 5));
    delete this.flags[scope]?.[key];
  }
}

const settings: Record<string, unknown> = {};
const created: { content: string; whisper: string[] }[] = [];
const emitted: unknown[] = [];
const me = new FakeUser("me", "Player", false);
const other = new FakeUser("other", "Other", false);
const gm = new FakeUser("gm", "GM", true);
const users = Object.assign([me, other, gm], { get: (id: string) => [me, other, gm].find((u) => u.id === id), activeGM: gm });

function installGlobals(current: FakeUser): void {
  setGlobal("game", {
    userId: current.id,
    user: current,
    users,
    combat: null,
    system: { id: "dnd4e" },
    settings: { get: (_: string, key: string) => settings[key] },
    i18n: { localize: (k: string) => k, format: (k: string) => k },
    socket: { emit: (_: string, data: unknown) => emitted.push(data) },
  });
  setGlobal("ChatMessage", { implementation: { create: async (data: { content: string; whisper: string[] }) => created.push(data) } });
}

const { onCreateChatMessage, onSocketMessage, rollsSettled, clearRolls } = await import("../src/tracker/tracker.js");

let id = 0;
const die = (faces: number, ...results: number[]) => ({ faces, results: results.map((result) => ({ result })) });
function message(rolls: ReturnType<typeof die>[][], options: { author?: FakeUser; blind?: boolean; visible?: boolean } = {}) {
  return {
    id: `m${++id}`,
    isRoll: true,
    author: options.author ?? me,
    blind: options.blind ?? false,
    isContentVisible: options.visible ?? true,
    rolls: rolls.map((dice) => ({ dice })),
    flags: {},
  } as unknown as ChatMessage.Implementation;
}
const tracked = () => (me.flags["roll-tracker"] ?? {}) as { unsorted?: number[]; sorted?: number[]; combat?: number[]; streak?: { numbers: number[] } };
const d20 = () => 1 + Math.floor(Math.random() * 20);

beforeEach(() => {
  Object.assign(settings, { roll_storage: 50, count_hidden: true, streak_behaviour: "hidden", streak_threshold: 2 });
  me.flags = {};
  created.length = 0;
  emitted.length = 0;
  installGlobals(me);
});
afterEach(() => clearGlobals("game", "ChatMessage"));

describe("recording rolls", () => {
  it("keeps every roll of a burst of simultaneous messages, in order", async () => {
    const values = Array.from({ length: 120 }, d20);
    for (const v of values) onCreateChatMessage(message([[die(20, v)]]));
    await rollsSettled("me");
    assert.deepEqual(tracked().unsorted, values.slice(-50));
    assert.deepEqual(tracked().sorted, [...values.slice(-50)].sort((a, b) => a - b));
  });

  it("records every target roll of a multi-target attack", async () => {
    onCreateChatMessage(message([[die(20, 4)], [die(20, 17)], [die(20, 9)]]));
    await rollsSettled("me");
    assert.deepEqual(tracked().unsorted, [4, 17, 9]);
  });

  it("ignores other users' rolls and messages without a d20", async () => {
    onCreateChatMessage(message([[die(20, 11)]], { author: other }));
    onCreateChatMessage(message([[die(8, 3, 6)]]));
    await rollsSettled("me");
    await rollsSettled("other");
    assert.equal(tracked().unsorted, undefined);
    assert.deepEqual(other.flags, {});
  });

  it("skips a player's blind roll when blind rolls aren't counted", async () => {
    settings.count_hidden = false;
    onCreateChatMessage(message([[die(20, 11)]], { blind: true, visible: false }));
    await rollsSettled("me");
    assert.equal(tracked().unsorted, undefined);
  });

  it("uses the encounter state at the time of the roll", async () => {
    (game as unknown as { combat: object | null }).combat = { id: "c" };
    onCreateChatMessage(message([[die(20, 8)]]));
    (game as unknown as { combat: object | null }).combat = null;
    onCreateChatMessage(message([[die(20, 9)]]));
    await rollsSettled("me");
    assert.deepEqual(tracked().combat, [8]);
    assert.deepEqual(tracked().unsorted, [8, 9]);
  });

  it("clears after the rolls queued before it, and records the rolls after it", async () => {
    for (let i = 0; i < 10; i++) onCreateChatMessage(message([[die(20, d20())]]));
    void clearRolls("me");
    onCreateChatMessage(message([[die(20, 7)]]));
    await rollsSettled("me");
    assert.deepEqual(tracked().unsorted, [7]);
    assert.equal(tracked().streak?.numbers.length, 0);
  });
});

describe("Dice So Nice", () => {
  afterEach(() => mock.timers.reset());

  it("records a roll only once its animation has finished", async () => {
    let finish: (value: boolean) => void = () => undefined;
    Object.assign(game as object, { dice3d: { waitFor3DAnimationByMessageID: () => new Promise<boolean>((r) => (finish = r)) } });
    onCreateChatMessage(message([[die(20, 7)]]));
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(tracked().unsorted, undefined);
    finish(true);
    await rollsSettled("me");
    assert.deepEqual(tracked().unsorted, [7]);
  });

  it("records a roll whose animation never reports completion, after the timeout", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    Object.assign(game as object, { dice3d: { waitFor3DAnimationByMessageID: () => new Promise<boolean>(() => undefined) } });
    onCreateChatMessage(message([[die(20, 8)]]));
    let settled = false;
    void rollsSettled("me").then(() => (settled = true));
    // Advance mocked time (setImmediate isn't mocked, so it lets pending promise callbacks run in between)
    for (let elapsed = 0; !settled && elapsed < 60_000; elapsed += 1_000) {
      mock.timers.tick(1_000);
      await new Promise((r) => setImmediate(r));
    }
    assert.equal(settled, true);
    assert.deepEqual(tracked().unsorted, [8]);
  });
});

describe("streak announcements", () => {
  it("lets a GM whisper a streak to the GMs once per message", async () => {
    installGlobals(gm);
    gm.flags = {};
    onCreateChatMessage(message([[die(20, 10)]], { author: gm }));
    onCreateChatMessage(message([[die(20, 11)], [die(20, 12)]], { author: gm }));
    await rollsSettled("gm");
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(created.length, 1);
    assert.match(created[0]?.content ?? "", /10, 11, 12/);
    assert.deepEqual(created[0]?.whisper, ["gm"]);
  });

  it("makes a player ask the active GM, with data only", async () => {
    onCreateChatMessage(message([[die(20, 10)]]));
    onCreateChatMessage(message([[die(20, 10)]]));
    await rollsSettled("me");
    assert.deepEqual(emitted, [{ type: "streak", userId: "me", numbers: [10, 10], whisper: true }]);
    assert.equal(created.length, 0);
  });

  it("posts a request on the active GM only, and only for the sender's own streak", async () => {
    installGlobals(gm);
    onSocketMessage({ type: "streak", userId: "me", numbers: [10, 11], whisper: false }, "other");
    onSocketMessage({ type: "streak", userId: "me", numbers: [10, 99], whisper: false }, "me");
    onSocketMessage({ content: "<script>", speaker: {} }, "me");
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(created.length, 0);
    onSocketMessage({ type: "streak", userId: "me", numbers: [10, 11], whisper: false }, "me");
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(created.length, 1);
    assert.deepEqual(created[0]?.whisper, []);
  });
});
