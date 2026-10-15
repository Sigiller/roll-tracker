import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Localize } from "../i18n.js";
import { joinWithConjunction } from "../text.js";
import type { Comparison, ModeLeader, RankedStat, Standing } from "../tracker/comparison.js";
import type { D20Value, RollStats, RollView } from "../types/tracker.js";

/**
 * Chat card markup. A card is stored as HTML in the message, so it is rendered to static markup and styled
 * by class names (see `ChatCardStyles`), not by styled-components classes that only exist on the client
 * that rendered it.
 */
const CLASS = {
  card: "roll-tracker-card",
  heading: "roll-tracker-card-heading",
  subheading: "roll-tracker-card-subheading",
  statHeading: "roll-tracker-card-stat-heading",
  list: "roll-tracker-card-list",
  subList: "roll-tracker-card-sublist",
  strong: "roll-tracker-card-strong",
  good: "roll-tracker-card-good",
  bad: "roll-tracker-card-bad",
  italic: "roll-tracker-card-italic",
} as const;

/** Format a mode for display: `"16"`, `"15 or 20"`, `"3, 9, or 12"`; `"0"` when there are no rolls. */
export function formatMode(mode: readonly D20Value[], localize: Localize): string {
  return mode.length ? joinWithConjunction(mode.map(String), localize("comparison-card.misc.or")) : "0";
}

/** The "(N instances each)" label of a mode. */
export function modeLabel(stats: Pick<RollStats, "mode" | "modeCount">, localize: Localize): string {
  const unit = stats.modeCount === 1 ? localize("form-label.instance") : localize("form-label.instances");
  const each = stats.mode.length > 1 ? ` ${localize("form-label.each")}` : "";
  return `${localize("form-label.mode")} (${stats.modeCount} ${unit}${each})`;
}

/** The rows of a statistics list, shared by the tracker window and the stats chat card. */
export function statRows(stats: RollStats, localize: Localize): { label: string; value: string }[] {
  return [
    { label: localize("form-label.mean"), value: String(stats.mean) },
    { label: localize("form-label.median"), value: String(stats.median) },
    { label: modeLabel(stats, localize), value: formatMode(stats.mode, localize) },
    { label: localize("form-label.nat1s"), value: String(stats.nat1s) },
    { label: localize("form-label.nat20s"), value: String(stats.nat20s) },
    { label: localize("form-label.count"), value: String(stats.count) },
  ];
}

const CombatIcon = () => <i className="fas fa-swords" />;

/** Props of {@link StatsCard}. */
export interface StatsCardProps {
  /** Name of the user whose rolls are shown. */
  name: string;
  stats: RollStats;
  /** Which rolls the statistics cover; combat statistics get a "Combat Stats" subheading. */
  view: RollView;
  localize: Localize;
}

/** "Print to Chat": one user's statistics. */
export function StatsCard({ name, stats, view, localize }: StatsCardProps) {
  return (
    <div className={CLASS.card}>
      <h1 className={CLASS.heading}>{name}</h1>
      {view === "combat" && (
        <h2 className={CLASS.subheading}>
          <CombatIcon /> {localize("form-label.combatstats")} <CombatIcon />
        </h2>
      )}
      <ul className={CLASS.list}>
        {statRows(stats, localize).map((row) => (
          <li key={row.label}>
            <span className={CLASS.strong}>{row.label}: </span>
            {row.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Props of {@link StreakCard}. */
export interface StreakCardProps {
  /** Name of the user on the streak. */
  name: string;
  /** The streak's rolls, oldest first. */
  numbers: readonly D20Value[];
}

/** The streak announcement. */
export function StreakCard({ name, numbers, localize }: StreakCardProps & { localize: Localize }) {
  return (
    <div className={CLASS.card}>
      <strong>{localize("streak.message").replace("{name}", name)}</strong>
      <br />
      {numbers.join(", ")}
    </div>
  );
}

/** "Alice", "Alice and Bob", "Alice, Bob, and Carol", each name in bold. */
function Names({ standings, localize }: { standings: readonly { name: string }[]; localize: Localize }) {
  const and = localize("comparison-card.misc.and");
  const parts: ReactNode[] = [];
  standings.forEach((s, i) => {
    if (i > 0) parts.push(standings.length === 2 ? ` ${and} ` : i === standings.length - 1 ? `, ${and} ` : ", ");
    parts.push(
      <span key={`${s.name}-${i}`} className={CLASS.strong}>
        {s.name}
      </span>
    );
  });
  return <>{parts}</>;
}

/** "Alice and Bob with 14." — the users tied on a value, then the value. */
function StandingLine({ standings, suffix = "", localize }: { standings: readonly Standing[]; suffix?: string; localize: Localize }) {
  const value = standings[0]?.value ?? 0;
  return (
    <>
      <Names standings={standings} localize={localize} /> {localize("comparison-card.misc.with")} {value}
      {suffix}.
    </>
  );
}

/** A ranked statistic shown as highest/lowest lines. */
function HighLow({ stat, comparison, localize }: { stat: RankedStat; comparison: Comparison; localize: Localize }) {
  const ranking = comparison.rankings[stat];
  return (
    <ul className={CLASS.list}>
      <li>
        <span className={CLASS.good}>{localize("comparison-card.descriptors.highest")}: </span>
        <StandingLine standings={ranking.highest} localize={localize} />
      </li>
      <li>
        <span className={CLASS.bad}>{localize("comparison-card.descriptors.lowest")}: </span>
        <StandingLine standings={ranking.lowest} localize={localize} />
      </li>
    </ul>
  );
}

/** Most/fewest natural 1s or 20s, by raw count and by percentage. A natural 1 is bad, a natural 20 good. */
function NaturalRolls({ face, comparison, localize }: { face: 1 | 20; comparison: Comparison; localize: Localize }) {
  const raw = comparison.rankings[face === 1 ? "nat1s" : "nat20s"];
  const pct = comparison.rankings[face === 1 ? "nat1sPercentage" : "nat20sPercentage"];
  const mostClass = face === 1 ? CLASS.bad : CLASS.good;
  const fewestClass = face === 1 ? CLASS.good : CLASS.bad;
  const rows = [
    { label: "most", className: mostClass, rawStandings: raw.highest, pctStandings: pct.highest },
    { label: "fewest", className: fewestClass, rawStandings: raw.lowest, pctStandings: pct.lowest },
  ] as const;
  return (
    <ul className={CLASS.list}>
      {rows.map((row) => (
        <li key={row.label}>
          <span className={row.className}>{localize(`comparison-card.descriptors.${row.label}`)}: </span>
          <ul className={CLASS.subList}>
            <li>
              <span className={CLASS.italic}>{localize("comparison-card.descriptors.raw")}</span>:{" "}
              <StandingLine standings={row.rawStandings} localize={localize} />
            </li>
            <li>
              <span className={CLASS.italic}>{localize("comparison-card.descriptors.percentage")}</span>:{" "}
              <StandingLine standings={row.pctStandings} suffix="%" localize={localize} />
            </li>
          </ul>
        </li>
      ))}
    </ul>
  );
}

function ModeLines({ byCount, byPercentage, localize }: { byCount: ModeLeader; byPercentage: ModeLeader; localize: Localize }) {
  const mostFrequent = localize("comparison-card.mode.most-frequent");
  return (
    <ul className={CLASS.list}>
      <li>
        <span className={CLASS.italic}>{localize("comparison-card.descriptors.raw")}</span>:{" "}
        <span className={CLASS.strong}>{byCount.name}</span> {mostFrequent} {byCount.modeCount}{" "}
        {localize("comparison-card.mode.instances-of")} {formatMode(byCount.mode, localize)}.
      </li>
      <li>
        <span className={CLASS.italic}>{localize("comparison-card.descriptors.percentage")}</span>:{" "}
        <span className={CLASS.strong}>{byPercentage.name}</span> {mostFrequent} {byPercentage.percentage}% (
        {byPercentage.modeCount}) {localize("comparison-card.mode.of-their-rolls")} {formatMode(byPercentage.mode, localize)}.
      </li>
    </ul>
  );
}

/** The GM's comparison of all users' statistics. */
export function ComparisonCard({ comparison, localize }: { comparison: Comparison; localize: Localize }) {
  const heading = (key: string) => <h3 className={CLASS.statHeading}>{localize(`comparison-card.headers.${key}`)}</h3>;
  return (
    <div className={CLASS.card}>
      <h1 className={CLASS.heading}>
        {comparison.view === "combat" ? (
          <>
            <CombatIcon /> {localize("comparison-card.combat-title")} <CombatIcon />
          </>
        ) : (
          localize("comparison-card.title")
        )}
      </h1>
      {heading("mean")}
      <HighLow stat="mean" comparison={comparison} localize={localize} />
      {heading("median")}
      <HighLow stat="median" comparison={comparison} localize={localize} />
      {heading("mode")}
      <ModeLines byCount={comparison.modeByCount} byPercentage={comparison.modeByPercentage} localize={localize} />
      {heading("nat1s")}
      <NaturalRolls face={1} comparison={comparison} localize={localize} />
      {heading("nat20s")}
      <NaturalRolls face={20} comparison={comparison} localize={localize} />
    </div>
  );
}

/** HTML of the stats card, for a chat message's content. */
export function renderStatsCard(props: Omit<StatsCardProps, "localize">, localize: Localize): string {
  return renderToStaticMarkup(<StatsCard {...props} localize={localize} />);
}

/** HTML of the comparison card, for a chat message's content. */
export function renderComparisonCard(comparison: Comparison, localize: Localize): string {
  return renderToStaticMarkup(<ComparisonCard comparison={comparison} localize={localize} />);
}

/** HTML of the streak announcement, for a chat message's content. */
export function renderStreakCard(props: StreakCardProps, localize: Localize): string {
  return renderToStaticMarkup(<StreakCard {...props} localize={localize} />);
}

export { CLASS as CARD_CLASS };
