# Roll Tracker

Tracks the d20 rolls each user makes and shows their statistics in a window opened from the player list.

![Access Roll Tracker](https://i.imgur.com/TdGtQic.png)

- **Statistics**: mean, median, mode, natural 1s and 20s, and the number of rolls counted, for all tracked rolls or only for rolls made during an encounter. The window updates as new rolls come in.
- **Print to Chat** posts a user's statistics; the GM can post a **comparison card** ranking all users.
- **Download** exports the shown rolls as an R-friendly text file (`value,count` lines).
- **Streaks**: consecutive rolls within 1 of each other are announced, publicly or whispered to the GMs. A streak that includes a blind roll is always whispered.

![Dialog](https://i.imgur.com/EIm59Pw.png)

![Stats Printed to Chat and Comparison Card](https://i.imgur.com/k9txGqD.png)

## What counts as a roll

Every d20 in a chat message's rolls is counted for the message's author: each target's roll of a multi-target attack, both dice of a fortune/misfortune roll, and a d20 anywhere in a formula. Damage and other rolls without a d20 are ignored. Players' blind rolls are counted unless **Count Blind Rolls?** is off; a GM's always are. In dnd5e and pf2e, **Don't Count Unlinked Rolls** limits counting to rolls made from an actor.

Each user keeps their most recent rolls, up to **Max rolls stored**; combat rolls are capped the same way.

With Dice So Nice, a roll is recorded once its animation has finished, so the window and streak announcements don't spoil it.

## Settings

| Setting | Effect |
|---|---|
| See Player Roll Icons? | The GM gets a button next to every user, not only their own. |
| Can Players Access Tracked Rolls? | Players get a button next to their own name. |
| Max rolls stored | How many recent rolls are kept per user (and per user in combat). |
| Count Blind Rolls? | Whether players' blind rolls are counted. |
| Streak Behaviour | Disable streak messages, whisper them to the GMs, or show them publicly. |
| Streak Threshold | How many consecutive rolls within 1 of each other make a streak. |

## Changelog

### 3.0.0

- Rewritten in TypeScript, with React and styled-components for the window, the player list button and the chat cards.
- Rolls made at the same time (group initiative, attacks on several targets) are no longer lost or reordered, and the statistics can no longer drift from the stored rolls. A user's corrupted statistics repair themselves on their next roll.
- Every d20 of a message is counted, not only the first die of the first roll.
- Combat rolls are kept in roll order and capped at **Max rolls stored**.
- A roll is never left unrecorded when Dice So Nice doesn't animate it.
- A streak that grows within one multi-target attack is announced once, and only by one GM when several are connected.
- **Download** exports the rolls shown in the window.

## Development

```bash
npm ci
npm run check   # lint, typecheck, tests, build
npm run dev     # rebuild dist/main.js on change
```

Sources are in `src/` (logic in `src/tracker/`, UI in `src/app/`, `src/chat/` and `src/players/`), tests in `tests/`. `dist/` is build output. Releases are built by CI when a `vX.Y.Z` tag matching `module.json` is pushed.
