import { statRows } from "../chat/cards.js";
import type { Localize } from "../i18n.js";
import type { RollStats, RollView } from "../types/tracker.js";
import { ActionButton, Heading, Panel, StatLabel, StatList, Subheading } from "./RollTracker.styles.js";

/** Props of {@link RollTrackerRoot}: what the tracker window shows and what its buttons do. */
export interface RollTrackerRootProps {
  /** Name of the user whose rolls are shown. */
  userName: string;
  /** Statistics of the shown rolls. */
  stats: RollStats;
  /** Which rolls are shown: all tracked rolls or only combat rolls. */
  view: RollView;
  /** Switch between all rolls and combat rolls. */
  onToggleView: () => void;
  /** Ask for confirmation, then remove the user's tracked rolls. */
  onClear: () => void;
  /** Post the shown statistics to chat. */
  onPrint: () => void;
  localize: Localize;
}

/** Content of the tracker window. */
export function RollTrackerRoot({ userName, stats, view, onToggleView, onClear, onPrint, localize }: RollTrackerRootProps) {
  return (
    <Panel>
      <Heading>{userName}</Heading>
      {view === "combat" && (
        <Subheading>
          <i className="fas fa-swords" /> {localize("form-label.combatstats")} <i className="fas fa-swords" />
        </Subheading>
      )}
      <StatList>
        {statRows(stats, localize).map((row) => (
          <li key={row.label}>
            <StatLabel>{row.label}: </StatLabel>
            {row.value}
          </li>
        ))}
      </StatList>
      <ActionButton type="button" onClick={onToggleView}>
        <i className="fas fa-swords" />
        {view === "combat" ? localize("form-button.toggle-all") : localize("form-button.toggle-combat")}
      </ActionButton>
      <ActionButton type="button" onClick={onClear}>
        <i className="fas fa-times" />
        {localize("form-button.clear")}
      </ActionButton>
      <ActionButton type="button" onClick={onPrint}>
        <i className="fas fa-eye" />
        {localize("form-button.print")}
      </ActionButton>
    </Panel>
  );
}
