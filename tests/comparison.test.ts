import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderComparisonCard, renderStatsCard, renderStreakCard } from "../src/chat/cards.js";
import { buildComparison, type PlayerStats } from "../src/tracker/comparison.js";
import { calculateStats } from "../src/tracker/stats.js";

const player = (userId: string, rolls: number[]): PlayerStats => ({ userId, name: userId.toUpperCase(), stats: calculateStats(rolls) });
/** Translation stub: returns the last part of the key, so markup assertions stay readable. */
const localize = (key: string) => (key === "streak.message" ? "{name} is on a streak!" : (key.split(".").at(-1) ?? key));

describe("buildComparison", () => {
  it("returns null when nobody has rolls", () => {
    assert.equal(buildComparison([player("a", [])], "sorted"), null);
  });

  it("ranks highest and lowest, keeping ties, and ignores users without rolls", () => {
    const c = buildComparison([player("a", [10, 12]), player("b", [5, 7]), player("c", [11, 11]), player("d", [])], "sorted");
    assert.ok(c);
    assert.deepEqual(c.rankings.mean.highest.map((s) => s.userId), ["a", "c"]);
    assert.deepEqual(c.rankings.mean.lowest.map((s) => s.userId), ["b"]);
    assert.equal(c.rankings.mean.average, 9);
  });

  it("picks the mode leader by count and by percentage", () => {
    const c = buildComparison([player("a", [3, 3, 3, 4, 5, 6, 7, 8]), player("b", [9, 9])], "combat");
    assert.ok(c);
    assert.equal(c.view, "combat");
    assert.equal(c.modeByCount.userId, "a");
    assert.equal(c.modeByCount.modeCount, 3);
    assert.equal(c.modeByPercentage.userId, "b");
    assert.equal(c.modeByPercentage.percentage, 100);
  });
});

describe("chat cards", () => {
  it("renders the stats card with the combat subheading only for combat stats", () => {
    const stats = calculateStats([16, 5, 16, 20, 13]);
    const all = renderStatsCard({ name: "Nia", stats, view: "sorted" }, localize);
    assert.match(all, /<h1 class="roll-tracker-card-heading">Nia<\/h1>/);
    assert.match(all, /mode \(2 instances\): <\/span>16/);
    assert.doesNotMatch(all, /combatstats/);
    assert.match(renderStatsCard({ name: "Nia", stats, view: "combat" }, localize), /combatstats/);
  });

  it("escapes user names", () => {
    const html = renderStreakCard({ name: "<img src=x onerror=alert(1)>", numbers: [10, 11] }, localize);
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; is on a streak!/);
    assert.match(html, /10, 11/);
  });

  it("joins tied names and formats tied modes in the comparison card", () => {
    const c = buildComparison([player("a", [10, 12]), player("b", [5, 5, 9, 9]), player("c", [11, 11])], "sorted");
    assert.ok(c);
    const html = renderComparisonCard(c, localize);
    assert.match(html, /<span class="roll-tracker-card-strong">A<\/span> and <span class="roll-tracker-card-strong">C<\/span> with 11\./);
    assert.match(html, /instances-of 5 or 9\./);
    assert.match(html, /title<\/h1>/);
  });
});
