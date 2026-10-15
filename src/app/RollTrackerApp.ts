import { createRoot, type Root } from "react-dom/client";
import { renderComparisonCard, renderStatsCard } from "../chat/cards.js";
import { I18N_PREFIX, MODULE_ID } from "../constants.js";
import { localize } from "../i18n.js";
import { buildComparison, type PlayerStats } from "../tracker/comparison.js";
import { toExportText } from "../tracker/export.js";
import { calculateStats } from "../tracker/stats.js";
import { clearRolls } from "../tracker/tracker.js";
import { affectsTrackerWindow, readTrackerFlags, rollsForView } from "../tracker/user-flags.js";
import type { RollView } from "../types/tracker.js";
import { renderRollTracker } from "./mount.js";

const { ApplicationV2, DialogV2 } = foundry.applications.api;

const ROOT_CLASS = `${MODULE_ID}-root`;

/** Id of the tracker window of a user; one window per user. */
function appId(userId: string): string {
  return `${MODULE_ID}-${userId}`;
}

/** Statistics of every user who has rolls in a view, for the comparison card. */
function allPlayerStats(view: RollView): PlayerStats[] {
  return (game.users?.contents ?? []).map((user) => ({
    userId: user.id ?? "",
    name: user.name ?? "",
    stats: calculateStats(rollsForView(readTrackerFlags(user), view)),
  }));
}

/** The tracker window of one user: their statistics, the view toggle and the Clear/Print buttons. */
export class RollTrackerApp extends ApplicationV2 {
  /** The user whose rolls this window shows. */
  readonly userId: string;

  /** Whether all tracked rolls or only combat rolls are shown. */
  #view: RollView = "sorted";

  /** This window's own React root; each user's window has one. */
  #reactRoot: Root | null = null;

  /** Id of the `updateUser` hook that refreshes the window when the user's rolls or name change. */
  #updateHookId: number | null = null;

  constructor(userId: string) {
    super({ id: appId(userId) });
    this.userId = userId;
  }

  static override DEFAULT_OPTIONS = {
    classes: [MODULE_ID],
    tag: "div",
    window: {
      title: `${I18N_PREFIX}.title`,
      icon: "fas fa-dice-d20",
      controls: [
        { icon: "fas fa-download", label: `${I18N_PREFIX}.form-button.download`, action: "export" },
        {
          icon: "fas fa-chart-simple",
          label: `${I18N_PREFIX}.comparison-card.title`,
          action: "compare",
          visible: () => Boolean(game.user?.isGM),
        },
      ],
    },
    position: { width: 320, height: "auto" as const },
    actions: {
      export: RollTrackerApp.#onExport,
      compare: RollTrackerApp.#onCompare,
    },
  };

  /** Open the window of a user, or bring it to the front if it is already open. */
  static async open(userId: string): Promise<void> {
    const existing = foundry.applications.instances.get(appId(userId));
    if (existing instanceof RollTrackerApp) {
      await existing.render({ force: true });
      existing.bringToFront();
      return;
    }
    await new RollTrackerApp(userId).render({ force: true });
  }

  protected override async _renderHTML(_context: object, _options: unknown): Promise<HTMLElement> {
    const root = document.createElement("div");
    root.className = ROOT_CLASS;
    return root;
  }

  protected override async _replaceHTML(result: HTMLElement, content: HTMLElement, _options: unknown): Promise<void> {
    if (content.querySelector(`:scope > .${ROOT_CLASS}`)) return;
    content.replaceChildren(result);
  }

  protected override async _onRender(context: object, options: unknown): Promise<void> {
    // @ts-expect-error ApplicationV2._onRender accepts DeepPartial render options at runtime.
    await super._onRender(context, options);
    const host = this.element.querySelector(`.${ROOT_CLASS}`);
    if (!(host instanceof HTMLElement)) return;
    this.#reactRoot ??= createRoot(host);
    this.#updateHookId ??= Hooks.on("updateUser", (user, changes) => {
      if (user.id === this.userId && affectsTrackerWindow(changes)) this.#renderContent();
    });
    this.#renderContent();
  }

  #renderContent(): void {
    const user = game.users?.get(this.userId);
    if (!this.#reactRoot || !user) return;
    renderRollTracker(this.#reactRoot, {
      userName: user.name ?? "",
      stats: calculateStats(rollsForView(readTrackerFlags(user), this.#view)),
      view: this.#view,
      onToggleView: () => {
        this.#view = this.#view === "sorted" ? "combat" : "sorted";
        this.#renderContent();
      },
      onClear: () => void this.#confirmClear(),
      onPrint: () => void this.#print(),
      localize,
    });
  }

  async #confirmClear(): Promise<void> {
    const confirmed = await DialogV2.confirm({
      window: { title: localize("confirms.clear_rolls.title") },
      content: `<p>${localize("confirms.clear_rolls.content")}</p>`,
    });
    if (confirmed) await clearRolls(this.userId);
    this.#renderContent();
  }

  async #print(): Promise<void> {
    const user = game.users?.get(this.userId);
    if (!user) return;
    const stats = calculateStats(rollsForView(readTrackerFlags(user), this.#view));
    await ChatMessage.implementation.create({
      content: renderStatsCard({ name: user.name ?? "", stats, view: this.#view }, localize),
    });
  }

  /** Header control: download the shown rolls as `value,count` lines. */
  static #onExport(this: RollTrackerApp): void {
    const user = game.users?.get(this.userId);
    const rolls = user ? rollsForView(readTrackerFlags(user), this.#view) : [];
    if (rolls.length === 0) {
      ui.notifications?.warn(localize("notifications.no-export-data"));
      return;
    }
    foundry.utils.saveDataToFile(toExportText(rolls), "text/plain", "roll-data.txt");
  }

  /** Header control (GM only): post the comparison of all users' rolls in the shown view. */
  static async #onCompare(this: RollTrackerApp): Promise<void> {
    const comparison = buildComparison(allPlayerStats(this.#view), this.#view);
    if (!comparison) {
      ui.notifications?.warn(localize("notifications.no-comparison-data"));
      return;
    }
    await ChatMessage.implementation.create({ content: renderComparisonCard(comparison, localize) });
  }

  protected override async _onClose(options: unknown): Promise<void> {
    if (this.#updateHookId !== null) Hooks.off("updateUser", this.#updateHookId);
    this.#updateHookId = null;
    this.#reactRoot?.unmount();
    this.#reactRoot = null;
    // @ts-expect-error ApplicationV2._onClose accepts DeepPartial render options at runtime.
    await super._onClose(options);
  }
}
