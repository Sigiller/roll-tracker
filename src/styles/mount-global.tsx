import { createRoot } from "react-dom/client";
import { MODULE_ID } from "../constants.js";
import { GlobalStyles } from "./GlobalStyles.js";

/**
 * Mount the global styles once for the session: chat cards must be styled whenever a message is shown,
 * not only while a tracker window is open. styled-components injects the rules while the root is mounted.
 */
export function mountGlobalStyles(): void {
  const id = `${MODULE_ID}-global-styles`;
  if (document.getElementById(id)) return;
  const host = document.createElement("div");
  host.id = id;
  host.hidden = true;
  document.body.append(host);
  createRoot(host).render(<GlobalStyles />);
}
