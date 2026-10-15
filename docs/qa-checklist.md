# QA checklist — roll-tracker 3.0.0

Environment: Foundry v14 (14.367), dnd4e 0.9.2, Dice So Nice 6.2.9 active, world relaunched from Setup after installing 3.0.0 (the entry point changed to `dist/main.js`).
Run as the GM test user ("User for Claude Agent") on the world's **Testing Ground** scene, viewed only by the tester. Items marked **(2 clients)** also need a player client and/or a second GM client.
Test rolls are recorded on the tester's own user. Note the IDs of the chat messages and encounters created, so section Q can remove exactly those.

Verification helpers (browser console):
- Flags: `game.user.getFlag("roll-tracker", "unsorted")` (also `sorted`, `combat`, `combatOrdered`, `streak`).
- Expected values: the d20 results in the test messages, in creation order: `msg.rolls.flatMap(r => r.dice.filter(d => d.faces === 20).flatMap(d => d.results.map(x => x.result)))`.
- Roll modes in v14 come in two vocabularies. `ChatMessage.applyMode(data, mode)` takes **message modes**: `"public"`, `"gm"`, `"blind"`, `"self"` (see `CONFIG.ChatMessage.modes`). `Roll#toMessage(data, { rollMode })` and the chat commands take **roll modes**: `"publicroll"`, `"gmroll"`, `"blindroll"`, `"selfroll"`. Passing a roll mode to `applyMode` silently makes a **public** message, so always check `msg.blind` / `msg.whisper` after creating a test message.
- Fixed-value rolls (for streak tests): evaluate a real roll, then set its result before posting, so Dice So Nice animates the chosen value:
  ```js
  const fixed = async (values, mode = "gm") => {
    const rolls = await Promise.all(values.map(async (v) => {
      const r = await new Roll("1d20").evaluate();
      r.dice[0].results[0].result = v; r._total = v; return r;
    }));
    const data = { rolls, content: values.join(", "), speaker: ChatMessage.getSpeaker() };
    ChatMessage.applyMode(data, mode); // message mode: "public" | "gm" | "blind" | "self"
    return ChatMessage.implementation.create(data);
  };
  ```

## A. Load and upgrade
- [x] A1. World loads with the module enabled; `game.modules.get("roll-tracker").version === "3.0.0"` and `esmodules` is `["dist/main.js"]`.
- [x] A2. No console errors or warnings from `roll-tracker` on load (including deprecation warnings).
- [x] A3. Settings are registered under their old keys and keep their stored values: `gm_see_players`, `players_see_players`, `roll_storage`, `count_hidden`, `streak_behaviour`, `streak_threshold`.
- [x] A4. `restrict_counted_rolls` is not registered in dnd4e (only in dnd5e/pf2e).
- [x] A5. The global style host `#roll-tracker-global-styles` exists once, and chat card rules (`.roll-tracker-card…`) are in the document's styles.
- [x] A6. No raw `ROLL-TRACKER.*` keys appear anywhere in the UI: settings, window, header menu, dialog, notifications, chat cards. **Result (run 2):** Settings dialog: all six settings show translated names, hints and streak options.
- [x] A7. Existing user flags written by 2.x load without errors: the window shows their statistics, and the leftover `export` string flag is ignored.

## B. Player list button
- [x] B1. GM with "See Player Roll Icons?" on: one d20 button on every user's entry, active and inactive (expand the list).
- [x] B2. Turning the setting off re-renders the list at once: only the GM's own entry keeps a button. Turning it on restores them.
- [x] B3. **(2 clients)** Player with "Can Players Access Tracked Rolls?" on: a button on their own entry only. Off: no button. **Result (run 2):** Gigil client: own button only; with the setting off, none (live); back on, restored.
- [x] B4. The button has the tooltip and accessible name "Check Rolls", and is styled like the list (no background; glow on hover/focus).
- [x] B5. Clicking opens the tracker window of that entry's user, and the click doesn't reach the entry itself.
- [x] B6. Clicking again while the window is open brings it to the front: still one window per user.
- [x] B7. After the list re-renders (a user connects or disconnects, or a setting changes), each entry has exactly one button.

## C. Tracker window
- [x] C1. The window has the title "Roll Tracker", the d20 icon, the user's name as heading, 6 statistic rows (Mean, Median, Mode, Natural 1s, Natural 20s, Rolls Counted) and 3 buttons.
- [x] C2. A user with no rolls shows zeros and "Mode (0 instances): 0".
- [x] C3. Statistics match values recomputed from `unsorted`: rounded mean, median (x.5 for an even count), every tied mode with "each", nat 1s and nat 20s, count.
- [x] C4. "Show Only Combat Stats" switches to the combat rolls, shows the "Combat Stats" subheading and changes its label to "Show All Stats"; a second click switches back.
- [x] C5. Live update: a new roll updates the open window without reopening it, in the current view.
- [x] C6. Windows of two different users can be open at once, each with its own view.
- [x] C7. Header menu: "Download" for everyone, plus "Comparison Card" for GMs only. **(2 clients)** A player sees only Download. **Result (run 2):** Gigil client: menu has only core "Detach Window" and Download.
- [x] C8. After closing the window, later rolls cause no errors, and reopening it works.
- [x] C9. Readable in both the dark and the light interface theme.
- [x] C10. Renaming the user updates the open window's heading live. **Result (run 2):** "QA Rename Check" appeared and reverted live.

## D. Counting by formula and roll mode
- [x] D1. `/r 1d20` → 1 value recorded.
- [x] D2. `/r 1d20 + 7` → only the die's value is recorded.
- [x] D3. `/r 1d6 + 1d20` → the d20 is recorded although it isn't the first die.
- [x] D4. `/r 2d20kh` and `/r 2d20kl` → both results are recorded, in order.
- [x] D5. `/r {1d20, 1d20}kh` (pool) → both d20 results are recorded.
- [x] D6. `/r 1d20r1` (reroll) → every result of the term is recorded, the rerolled 1 included (current rule: all results).
- [x] D7. `/r 2d8`, `/r 1d100` → nothing recorded.
- [x] D8. A chat message with an inline roll (`[[1d20]]`) isn't a roll message → nothing recorded.
- [x] D9. Roll modes `/r`, `/gmr`, `/sr` and `/br` are all recorded for a GM author.

## E. dnd4e rolls
- [x] E1. Single-target power attack → 1 d20 recorded; its damage roll → nothing.
- [x] E2. Multi-target power (burst or blast against 3 targets) → 3 d20s recorded, in the card's target order.
- [x] E3. Skill check and ability check → recorded.
- [x] E4. Saving throw → recorded.
- [x] E5. Death saving throw → recorded. **Result (run 2):** Temporary PC actor (deleted afterwards): the death save d20 was recorded.
- [x] E6. Single initiative roll → recorded, and also in the combat list (an encounter exists).
- [x] E7. "Roll NPCs" / "Roll All" initiative for several combatants (one burst of messages) → every d20 recorded, none lost.

## F. Concurrency (the 2.x data-loss bug)
- [x] F1. 20 messages created in one `Promise.all` → all 20 recorded, in creation order; `sorted` equals sorted `unsorted`.
- [x] F2. 60 messages created at once with "Max rolls stored" = 50 → `unsorted` is exactly the last 50 in order; `sorted` matches it.
- [x] F3. Clear Data while a burst is still being recorded → nothing from before the clear remains, and the rolls queued after it are recorded.
- [x] F4. One `updateUser` per recorded message (count the hook calls during a burst).

## G. Storage limits and migration
- [x] G1. Lowering "Max rolls stored" (e.g. to 10) trims `unsorted` to the newest 10 on the next roll; the window shows 10.
- [x] G2. The combat list is capped at the same limit and kept in roll order (newest last).
- [x] G3. Legacy combat list: set `combat` to a sorted list longer than the limit with no `combatOrdered` flag, then roll in an encounter → `combat.length` equals the limit, the newest roll is last, `combatOrdered === true`, and low values are kept too (it wasn't trimmed to the highest values).
- [x] G4. Corrupted 2.x data (`sorted` not equal to sorted `unsorted`) is repaired by the next roll.

## H. Encounter state
- [x] H1. A roll with no encounter → not in the combat list. **Result (run 2):** Local view set to no encounter: `game.combat` null at roll time, not a combat roll.
- [x] H2. A roll while an encounter exists on the viewed scene but hasn't started → recorded as a combat roll (`game.combat` is set). **Result (run 2):** Empty, unstarted encounter viewed: recorded as a combat roll.
- [x] H3. A roll while viewing a scene without an encounter (one exists on another scene) → not a combat roll. **Result (run 2):** Encounter on Testing Ground (not the active scene) with no encounter viewed: not a combat roll. Note: creating or deleting an encounter makes Foundry re-select the active one as viewed, so the view must be set right before the roll.
- [x] H4. A roll after the encounter is deleted → not a combat roll. **Result (run 2):** After deleting the viewed test encounter (and viewing none): not a combat roll.

## I. Blind rolls
- [x] I1. **(2 clients)** Player blind roll with "Count Blind Rolls?" on → recorded; off → not recorded. **Result (run 2):** Gigil blind roll: recorded with Count Blind Rolls on, not recorded with it off.
- [x] I2. GM blind roll → recorded whatever the setting.
- [x] I3. **(2 clients)** A player's blind roll is recorded without waiting for an animation the player can't see. **Result (run 2):** Recorded 419 ms after creation (content not visible to the author, no animation wait).

## J. Dice So Nice
- [x] J1. A roll is recorded only after its animation ends: the window and flags don't change while the dice are rolling.
- [x] J2. With "Immediately display chat messages" on (or animations off for the user), the roll is recorded at once.
- [x] J3. Initiative with "disabled for initiative" on → recorded at once.
- [x] J4. A roll made while the tab is hidden is recorded (when the tab returns, or by the timeout).
- [x] J5. A roll whose animation never reports completion is recorded after 15 s.

## K. Streaks
- [x] K1. Threshold 2: two consecutive rolls within 1 (e.g. 10 then 11) → one announcement "<name> is on a streak!" with "10, 11".
- [x] K2. Threshold 3: two such rolls → no announcement; the third → announcement with 3 numbers.
- [x] K3. A non-adjacent roll resets the streak (`streak.numbers` is `[]`), and the next run starts again.
- [x] K4. Behaviour "Whisper Streaks to GM" → whispered to every GM; "Publicly display Streaks" → public; "Disable" → none.
- [x] K5. A run that includes a blind roll is whispered even with the behaviour set to public.
- [x] K6. A multi-target attack that extends a streak by several rolls → one announcement with the whole run.
- [x] K7. **(2 clients)** A player's streak is posted once, by the active GM, even with two GM clients connected. **Result (run 2):** Gigil streak 10, 11 posted once, by the active GM (User for Claude Agent), with the Gamemaster client also connected; whispered to both GMs.
- [x] K8. A forged socket request is ignored: a `userId` other than the sender's, numbers outside 1–20, or the 2.x payload (`{content, speaker}`). **Result (run 2):** From the Gigil client: another user's id, 99, 10.5, the 2.x `{content, speaker}` payload and a string → no message; a valid own request → one whisper.
- [x] K9. A user name containing HTML is escaped in the announcement.

## L. Chat cards
- [x] L1. Print to Chat (all rolls) → the card's values equal the window's.
- [x] L2. Print to Chat (combat) → the card has the "Combat Stats" subheading.
- [x] L3. Comparison Card → highest/lowest for mean and median, the mode leaders (raw and percentage), most/fewest nat 1s and nat 20s (raw and percentage), matching values recomputed from every user's rolls.
- [x] L4. Ties are joined as "A and B with X." and "A, B, and C with X."; tied modes read "5 or 9".
- [x] L5. Comparison Card in combat view → the combat title.
- [x] L6. Comparison Card with nobody's rolls in the view → a warning notification and no message. **Result (run 2):** All users' data cleared temporarily (restored from backup afterwards): warning "No tracked rolls to compare", no message.
- [x] L7. Cards are styled (headings, bullets, good/bad colours) in the chat log, the chat popout and **(2 clients)** on other clients. **Result (run 2):** A card posted by Gigil is styled in both the Gigil and the GM client.

## M. Download
- [x] M1. Download writes `roll-data.txt` with `value,count` lines ascending by value, matching the shown rolls.
- [x] M2. In the combat view, Download exports the combat rolls.
- [x] M3. A GM downloading from another user's window gets that user's rolls.
- [x] M4. With no rolls in the view → a warning notification and no file.

## N. Clear Data
- [x] N1. Clear Data opens a confirmation dialog: "No" changes nothing; "Yes" removes every flag (`unsorted`, `sorted`, `combat`, `combatOrdered`, `streak`, `export`).
- [x] N2. The window shows zeros right after clearing.
- [x] N3. A GM can clear another user's data from that user's window. **Result (run 2):** GM cleared Gigil's data from Gigil's window; both the GM's and Gigil's windows showed 0 live (data restored from backup afterwards).

## O. Several clients
- [x] O1. **(2 clients)** A player's roll is recorded once, by the player's client, with a GM connected. **Result (run 2):** Gigil's roll: one write, seen once by the GM client, value appended once.
- [x] O2. **(2 clients)** A GM with a player's window open sees it update when the player rolls. **Result (run 2):** GM's open window for Gigil went from 23 to 24 rolls live.
- [x] O3. **(2 clients)** A player can't open other users' windows (no buttons on their entries). **Result (run 2):** Gigil client: no buttons on other users' entries.

## P. Robustness
- [x] P1. No console errors or warnings from `roll-tracker` during sections B–O.
- [x] P2. Reloading the page doesn't duplicate hooks: one recording per roll, one button per entry.
- [x] P3. Messages that aren't rolls (plain chat, emotes, whispers) record nothing and log nothing.

## Q. Cleanup
- [x] Q1. Delete the chat messages created by the test run (rolls, cards, streak whispers), by ID.
- [x] Q2. Delete the test encounters; restore any setting changed during the run.
- [x] Q3. Clear Data on the tester's user (also covers N1).

## Run log

**2026-10-15**, roll-tracker 3.0.0 on Scales of War (Foundry 14.367, dnd4e 0.9.2, Dice So Nice 6.2.9), "User for Claude Agent" (GM) on Testing Ground, with the Gamemaster client connected and idle.

- 73 of 91 items passed, 0 failed. Not run: 8 need a player or second GM client (B3, I1, I3, K7, K8, O1, O2, O3), 4 are blocked by the campaign encounter (H1, H2, H3, H4), and 3 would need a PC or real users' data (E5, L6, N3). A6, C7 and L7 were checked only in part and stay unticked.
- K5 first looked like a failure: the test helper used the v13 roll-mode name (`blindroll`) with v14's `ChatMessage.applyMode`, which made the roll public. Rerun with a real blind roll: passed.
- Found: the window heading doesn't update when the user is renamed (only when their rolls change or the window is reopened). Display only; names are escaped.
- Design notes: dropped and rerolled dice (`2d20kh`, `1d20r1`) are counted and take part in streaks, as in 2.x. Any active encounter not linked to a scene makes every roll a combat roll on every scene. While "User for Claude Agent" is connected it is the active GM, and it is among the GMs that streak whispers go to.

**2026-10-15, run 2** — after fixing the stale heading (the window now also refreshes on a rename) and documenting v14 message modes in the helpers above. Clients: "User for Claude Agent" (GM), Gigil (player, second tab), and the Gamemaster client (connected, idle). The campaign's empty, unstarted encounter (EeyQzvTX2hNrbdWm) was active.

- All 18 items left open by run 1 passed, so 92 of 92 items have now passed and none failed (C10 is new).
- Every user's `roll-tracker` flags were backed up before the run (on disk and in the page), cleared or written during the tests, and then restored. Afterwards all 7 users matched the backup exactly.
- Cleanup: the 24 messages from the test and Gigil accounts, the temporary PC actor and the test encounters were deleted. Settings are unchanged.
- Possible hardening (not a failure): a player can still ask the GM to announce made-up numbers for their **own** streak. The GM could check the numbers against the player's stored `streak` flag.
- Timing: a background tab's Dice So Nice animation never finishes, so its rolls are recorded by the 15 s fallback (the J5 path).
