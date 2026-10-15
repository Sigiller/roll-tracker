import { createGlobalStyle } from "styled-components";
import { CARD_CLASS } from "../chat/cards.js";
import { MODULE_ID } from "../constants.js";
import { PLAYER_BUTTON_CLASS } from "../players/PlayerButton.js";
import { rollTrackerTheme as t } from "./theme.js";

/**
 * Rules for markup outside the module's React trees: chat cards (stored as static HTML in messages) and
 * the host of the player list button. Mounted once for the whole session (see `mountGlobalStyles`).
 */
export const GlobalStyles = createGlobalStyle`
  .${CARD_CLASS.card} {
    color: ${t.colourText};
  }
  .${CARD_CLASS.heading} {
    font-size: ${t.fontSizeHeading};
    font-weight: bold;
    margin: 0 0 0.4rem;
    border: none;
  }
  .${CARD_CLASS.subheading} {
    font-size: ${t.fontSizeHeading};
    text-align: center;
    margin: 0 0 0.4rem;
    border: none;
  }
  .${CARD_CLASS.statHeading} {
    margin: 0.2em;
    font-size: 1.15em;
    border: none;
  }
  .${CARD_CLASS.list} {
    margin: 0;
    padding-left: 1.25em;
    list-style-type: square;
  }
  .${CARD_CLASS.subList} {
    margin: 0;
    padding-left: 1.25em;
    list-style-type: circle;
  }
  .${CARD_CLASS.strong} {
    font-weight: bold;
  }
  .${CARD_CLASS.good} {
    color: ${t.colourGood};
  }
  .${CARD_CLASS.bad} {
    color: ${t.colourBad};
  }
  .${CARD_CLASS.italic} {
    font-style: italic;
  }

  /* The React host inside a player list entry takes no box of its own */
  .${PLAYER_BUTTON_CLASS} {
    display: contents;
  }

  /* Window frame of the tracker */
  .application.${MODULE_ID} .window-content {
    padding: 0.5rem;
  }
`;
