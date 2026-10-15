import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { RollTrackerApp } from "../app/RollTrackerApp.js";
import { localize } from "../i18n.js";
import { getSetting } from "../settings.js";
import { rollTrackerTheme } from "../styles/theme.js";
import { PLAYER_BUTTON_CLASS, PlayerButton } from "./PlayerButton.js";
import { trackerButtonUserIds } from "./visibility.js";

/** React roots of the buttons currently mounted, by host element. */
const roots = new Map<HTMLElement, Root>();

/** Unmount the roots whose host was removed (the player list replaces its entries on every render). */
function unmountDetached(): void {
  for (const [host, root] of roots) {
    if (host.isConnected) continue;
    root.unmount();
    roots.delete(host);
  }
}

/**
 * Add the Roll Tracker buttons to a freshly rendered player list (`renderPlayers` hook). Each button is a
 * small React root mounted into a host appended to the user's entry.
 */
export function injectPlayerButtons(element: HTMLElement): void {
  unmountDetached();
  const currentUserId = game.userId;
  if (!currentUserId || !game.users) return;

  const userIds = trackerButtonUserIds({
    isGM: Boolean(game.user?.isGM),
    gmSeesPlayers: getSetting.gmSeesPlayers(),
    playersSeeOwn: getSetting.playersSeeOwn(),
    currentUserId,
    userIds: game.users.map((u) => u.id).filter((id): id is string => Boolean(id)),
  });

  const label = localize("button-title");
  for (const userId of userIds) {
    const entry = element.querySelector<HTMLElement>(`[data-user-id="${CSS.escape(userId)}"]`);
    if (!entry || entry.querySelector(`.${PLAYER_BUTTON_CLASS}`)) continue;
    const host = document.createElement("span");
    host.className = PLAYER_BUTTON_CLASS;
    entry.append(host);
    const root = createRoot(host);
    root.render(
      <ThemeProvider theme={rollTrackerTheme}>
        <PlayerButton label={label} onOpen={() => void RollTrackerApp.open(userId)} />
      </ThemeProvider>
    );
    roots.set(host, root);
  }
}
