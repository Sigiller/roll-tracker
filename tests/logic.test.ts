import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getD20Results, type RollLike } from "../src/tracker/d20.js";
import { isRollCounted, type CountedRollCheck } from "../src/tracker/eligibility.js";
import { toExportText } from "../src/tracker/export.js";
import { keepLatest, recordRolls, shuffle, sortRolls } from "../src/tracker/record.js";
import { calculateStats } from "../src/tracker/stats.js";
import { advanceStreak } from "../src/tracker/streak.js";
import { trackerButtonUserIds } from "../src/players/visibility.js";
import { affectsTrackerWindow } from "../src/tracker/user-flags.js";
import { joinWithConjunction } from "../src/text.js";

const die = (faces: number, ...results: number[]) => ({ faces, results: results.map((result) => ({ result })) });
const roll = (...dice: ReturnType<typeof die>[]): RollLike => ({ dice });

describe("getD20Results", () => {
  it("returns the d20 result of a plain roll", () => {
    assert.deepEqual(getD20Results([roll(die(20, 14))]), [14]);
  });
  it("counts every target roll of a multi-target attack, in order", () => {
    assert.deepEqual(getD20Results([roll(die(20, 4)), roll(die(20, 17)), roll(die(20, 9))]), [4, 17, 9]);
  });
  it("counts a d20 that isn't the first die and ignores other dice", () => {
    assert.deepEqual(getD20Results([roll(die(6, 3), die(20, 12), die(8, 5))]), [12]);
  });
  it("keeps both results of a fortune roll", () => {
    assert.deepEqual(getD20Results([roll(die(20, 5, 16))]), [5, 16]);
  });
  it("returns nothing for damage rolls and rolls without dice", () => {
    assert.deepEqual(getD20Results([roll(die(8, 3, 7)), roll()]), []);
  });
});

describe("isRollCounted", () => {
  const base: CountedRollCheck = {
    d20Count: 1,
    isBlind: false,
    countBlindRolls: false,
    authorIsGM: false,
    systemRestriction: { applies: false },
  };
  it("counts a visible d20 roll", () => assert.equal(isRollCounted(base), true));
  it("skips a message without d20 results", () => assert.equal(isRollCounted({ ...base, d20Count: 0 }), false));
  it("skips a player's blind roll when blind rolls aren't counted", () => {
    assert.equal(isRollCounted({ ...base, isBlind: true }), false);
    assert.equal(isRollCounted({ ...base, isBlind: true, countBlindRolls: true }), true);
  });
  it("always counts a GM's blind roll", () => assert.equal(isRollCounted({ ...base, isBlind: true, authorIsGM: true }), true));
  it("applies the system's restriction to rolls linked to an actor", () => {
    assert.equal(isRollCounted({ ...base, systemRestriction: { applies: true, linkedToActor: false } }), false);
    assert.equal(isRollCounted({ ...base, systemRestriction: { applies: true, linkedToActor: true } }), true);
  });
});

describe("advanceStreak", () => {
  const input = { previous: undefined, lastRoll: undefined, isBlind: false, threshold: 3 };
  it("starts no streak from the very first roll", () => {
    assert.deepEqual(advanceStreak({ ...input, newNumbers: [10] }), { streak: { numbers: [], includesBlind: false }, announcement: null });
  });
  it("continues with rolls within 1 and announces at the threshold", () => {
    const two = advanceStreak({ ...input, lastRoll: 10, newNumbers: [11] });
    assert.deepEqual(two.streak.numbers, [10, 11]);
    assert.equal(two.announcement, null);
    const three = advanceStreak({ ...input, previous: two.streak, lastRoll: 11, newNumbers: [11] });
    assert.deepEqual(three.announcement, { numbers: [10, 11, 11], includesBlind: false });
  });
  it("announces once for a multi-target attack, with the longest run", () => {
    const r = advanceStreak({ ...input, lastRoll: 10, newNumbers: [11, 12, 11] });
    assert.deepEqual(r.announcement?.numbers, [10, 11, 12, 11]);
  });
  it("keeps the announcement when a later number of the same message breaks the run", () => {
    const r = advanceStreak({ ...input, lastRoll: 10, newNumbers: [11, 12, 3] });
    assert.deepEqual(r.announcement?.numbers, [10, 11, 12]);
    assert.deepEqual(r.streak, { numbers: [], includesBlind: false });
  });
  it("marks a run that includes a blind roll, and resets the mark when the run breaks", () => {
    const blind = advanceStreak({ ...input, lastRoll: 10, newNumbers: [11], isBlind: true });
    assert.equal(blind.streak.includesBlind, true);
    const after = advanceStreak({ ...input, previous: blind.streak, lastRoll: 11, newNumbers: [12] });
    assert.equal(after.streak.includesBlind, true);
    const broken = advanceStreak({ ...input, previous: after.streak, lastRoll: 12, newNumbers: [1] });
    assert.equal(broken.streak.includesBlind, false);
  });
});

describe("recordRolls", () => {
  const input = { stored: {}, isBlind: false, inCombat: false, limit: 50, streakThreshold: 3 };
  it("appends in order and rebuilds the sorted list from the chronological one", () => {
    const { update } = recordRolls({ ...input, stored: { unsorted: [7, 3], sorted: [99] }, newNumbers: [12, 1] });
    assert.deepEqual(update.unsorted, [7, 3, 12, 1]);
    assert.deepEqual(update.sorted, [1, 3, 7, 12]);
  });
  it("caps the chronological list at the limit, dropping the oldest", () => {
    const stored = { unsorted: Array.from({ length: 50 }, (_, i) => (i % 20) + 1) };
    const { update } = recordRolls({ ...input, stored, newNumbers: [20, 20] });
    assert.equal(update.unsorted.length, 50);
    assert.deepEqual(update.unsorted.slice(-2), [20, 20]);
    assert.deepEqual(update.unsorted.slice(0, 2), [3, 4]);
  });
  it("writes the combat list only for rolls made in an encounter", () => {
    assert.equal(recordRolls({ ...input, newNumbers: [5] }).update.combat, undefined);
    const { update } = recordRolls({ ...input, inCombat: true, stored: { combat: [2], combatOrdered: true }, newNumbers: [5] });
    assert.deepEqual(update.combat, [2, 5]);
    assert.equal(update.combatOrdered, true);
  });
  it("shuffles a legacy (sorted) combat list once before capping it", () => {
    const legacy = Array.from({ length: 164 }, (_, i) => (i % 20) + 1).sort((a, b) => a - b);
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const { update } = recordRolls({ ...input, inCombat: true, stored: { combat: legacy }, newNumbers: [10], random });
    assert.equal(update.combat?.length, 50);
    assert.equal(update.combat?.at(-1), 10);
    const low = update.combat?.slice(0, -1).filter((v) => v <= 10).length ?? 0;
    assert.ok(low > 12 && low < 37, `kept ${low} low values out of 49`);
  });
  it("continues the stored streak from the last stored roll", () => {
    const { announcement } = recordRolls({ ...input, stored: { unsorted: [9, 10], streak: { numbers: [9, 10], includesBlind: false } }, newNumbers: [11] });
    assert.deepEqual(announcement?.numbers, [9, 10, 11]);
  });
});

describe("record helpers", () => {
  it("sortRolls doesn't modify its input", () => {
    const rolls = [3, 1, 2];
    assert.deepEqual(sortRolls(rolls), [1, 2, 3]);
    assert.deepEqual(rolls, [3, 1, 2]);
  });
  it("keepLatest keeps the last N, or nothing for a limit below 1", () => {
    assert.deepEqual(keepLatest([1, 2, 3], 2), [2, 3]);
    assert.deepEqual(keepLatest([1, 2], 5), [1, 2]);
    assert.deepEqual(keepLatest([1, 2], 0), []);
  });
  it("shuffle keeps the same values", () => {
    assert.deepEqual(sortRolls(shuffle([5, 1, 4, 1, 3])), [1, 1, 3, 4, 5]);
  });
});

describe("calculateStats", () => {
  it("computes the statistics of unsorted rolls", () => {
    assert.deepEqual(calculateStats([16, 5, 16, 20, 13]), {
      mean: 14, median: 16, mode: [16], modeCount: 2, nat1s: 0, nat1sPercentage: 0, nat20s: 1, nat20sPercentage: 20, count: 5,
    });
  });
  it("averages the two middle values for an even count and lists tied modes ascending", () => {
    const stats = calculateStats([20, 15, 1, 15, 20, 2]);
    assert.equal(stats.median, 15);
    assert.deepEqual(stats.mode, [15, 20]);
    assert.equal(stats.modeCount, 2);
    assert.equal(calculateStats([1, 2]).median, 1.5);
  });
  it("returns zeros for no rolls", () => {
    assert.deepEqual(calculateStats([]), calculateStats(undefined));
    assert.equal(calculateStats([]).count, 0);
    assert.deepEqual(calculateStats([]).mode, []);
  });
});

describe("toExportText", () => {
  it("lists value,count lines ascending by value", () => assert.equal(toExportText([16, 5, 16, 20]), "5,1\n16,2\n20,1\n"));
  it("is empty for no rolls", () => assert.equal(toExportText([]), ""));
});

describe("trackerButtonUserIds", () => {
  const input = { isGM: false, gmSeesPlayers: true, playersSeeOwn: true, currentUserId: "me", userIds: ["gm", "me", "other"] };
  it("gives a GM a button for every user", () => assert.deepEqual(trackerButtonUserIds({ ...input, isGM: true, currentUserId: "gm" }), ["gm", "me", "other"]));
  it("gives a GM only their own button when See Player Roll Icons is off", () => {
    assert.deepEqual(trackerButtonUserIds({ ...input, isGM: true, gmSeesPlayers: false, currentUserId: "gm" }), ["gm"]);
  });
  it("gives a player only their own button, or none", () => {
    assert.deepEqual(trackerButtonUserIds(input), ["me"]);
    assert.deepEqual(trackerButtonUserIds({ ...input, playersSeeOwn: false }), []);
  });
});

describe("joinWithConjunction", () => {
  it("joins one, two and more items", () => {
    assert.equal(joinWithConjunction([], "and"), "");
    assert.equal(joinWithConjunction(["a"], "and"), "a");
    assert.equal(joinWithConjunction(["a", "b"], "or"), "a or b");
    assert.equal(joinWithConjunction(["a", "b", "c"], "and"), "a, b, and c");
  });
});

describe("affectsTrackerWindow", () => {
  it("refreshes on a change of the user's tracked rolls, including removals", () => {
    assert.equal(affectsTrackerWindow({ flags: { "roll-tracker": { unsorted: [3] } } }), true);
    assert.equal(affectsTrackerWindow({ flags: { "-=roll-tracker": null } }), true);
  });
  it("refreshes on a rename", () => assert.equal(affectsTrackerWindow({ name: "New name" }), true));
  it("ignores other changes", () => {
    assert.equal(affectsTrackerWindow({ flags: { "other-module": { x: 1 } } }), false);
    assert.equal(affectsTrackerWindow({ color: "#ff0000" }), false);
  });
});
