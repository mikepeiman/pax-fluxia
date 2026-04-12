# Feature And Task Queue - 2026-04-12

## Purpose

Keep one clean, date-scoped execution queue for the active work, separate from the larger and messier historical tracker.

## Completed This Slice

- [x] Create and standardize the daily `FEATURE_AND_TASK_QUEUE_YYYY-MM-DD.md` workflow.
- [x] Add the daily queue protocol and harness-comparison protocol to `.agent/AGENT.md`.
- [x] Split Main Menu into three primary panels:
  - Map & Game
  - Players
  - Multiplayer
- [x] Add `Custom` beside `Random | Classic` in the map selector.
- [x] Widen the Main Menu layout and compact the slider/control grouping.
- [x] Restyle the `Straight | Curved` lane-path control to match the rest of the menu.
- [x] Consolidate visible player-color setup into one real widget in the Players panel.
- [x] Hide hue nudge behind a compact floating control instead of showing it by default.
- [x] Remove the redundant visible duplicate player-color and AI surfaces from the menu.
- [x] Clean the remaining user-visible Main Menu text corruption and make the palette card the sole color-selection surface.
- [x] Carry the configured palette through MP room creation so lobby/game colors do not fall back to a separate server palette.
- [x] Sort room listings so the public anchor room surfaces first.
- [x] Add a persistent public MP room on server startup and verify it initializes on an alternate port.
- [x] Add a root `bun run dev` / `bun run dev:full` flow that starts both client and `pax-server`.
- [x] Smooth kink-fallback lane paths into true curved published polylines when the smoothed path still clears obstacles.
- [x] Strengthen cross-owner corridor seeding by placing explicit midpoint-adjacent virtual sites for both owners.
- [x] Add targeted fixture maps for cross-owner midpoint corridors and future metaball conquest-lane evaluation.
- [x] Add an opt-in `Metaball fill follows geometry ownership` control for region-masked fill behavior.
- [x] Normalize the Main Menu player palette to even hue spacing with per-player nudges.
- [x] Move BG/audio/global settings into a thin floating topbar above Game Setup.
- [x] Remove the redundant visible player-color indicators from the AI and multiplayer slot rows.
- [x] Make the room browser visible whenever the lobby channel is live, not only after joining a game room.
- [x] Add a seat-reservation-expired retry path when joining MP rooms.
- [x] Bias curved lane generation toward actual curved polylines instead of straight fallbacks when curved mode is active.
- [x] Special-case 100% board fill to anchor corner stars before scaling the rest of the map.
- [x] Replace the old hue-nudge button with a proper `Adjust color` popover that exposes HSL controls and closes on outside click / Escape.
- [x] Remove the redundant duplicate color-indicator surfaces so the palette widget is the single visible player-color representation.
- [x] Move the audio widget into the floating topbar with the BG selector and gear icon instead of leaving it in the Players panel.
- [x] Normalize the Main Menu palette spacing to a simple even division with per-player nudges instead of the earlier glitch-prone spread logic.
- [x] Restore live territory redraw invalidation when player colors change so fills repaint with the selected palette.

## In Progress

- [ ] Verify live player-color repaint so territory fills, stars, and MP lobby colors all stay in sync during in-game adjustment.
- [ ] Verify in-app that the new unified player-color widget feels legitimate and trustworthy after the structural cleanup.
- [ ] Verify the room browser actually shows the persistent public room on the default dev port.
- [ ] Keep validating that the selected player swatch, AI row highlight, and actual in-game/player-lobby color stay aligned.
- [ ] Verify the new floating topbar stays compact, readable, and non-overlapping with the BG selector / audio / gear controls.
- [ ] Verify the `Adjust color` popover closes on outside click and Escape, and that the HSL controls feel standard rather than bespoke.

## Top Queue

- [ ] Verify visually that territory fills now repaint live with star ownership colors across the active territory families.
- [ ] Refine any remaining Main Menu spacing roughness after the three-panel redesign once the user has seen it.
- [ ] Recheck the board-fill-at-100% behavior on corner-heavy random maps and decide whether the corner-anchor special case is sufficient.
- [ ] Recheck the new curved-lane preference on several random seeds to make sure curved mode is visibly producing curves.
- [ ] Confirm the new lane curvature preference is visible in-app and not silently falling back to straight chords.
- [ ] Evaluate the new opt-in metaball geometry-fill mode in-game and decide whether it should remain optional or become the default.
- [ ] Decide how `Custom` maps should evolve from selector-only into the future custom-map workflow.
- [ ] Verify the public room appears in discovery on the default dev port and remains joinable without seat-expiration churn.

## Next Technical Queue

- [ ] Ships must follow lane paths, including curved lanes.
- [ ] Order arrows must follow lane paths, including curved lanes.
- [ ] Update CX corridors so competing players also meet across the lane midpoint instead of allowing third-party intrusion.
- [ ] Eliminate visibly angular non-straight lane paths; published non-straight lanes should read as curves.
- [ ] Evaluate and tune the new metaball geometry-fill option so fill respects actual owned region boundaries without losing the desired look.
- [ ] Add further tunables for metaball fill behavior if the new ownership toggle alone is not sufficient.
- [ ] Implement and compare at least two metaball conquest transition options in-game.

## Fixture Maps And Validation

- [ ] Keep growing the curated fixture-map set for lane, corridor, and transition cases.
- [ ] Add loader/validator polish around the new fixture-map foundation.
- [ ] Use fixture maps for renderer comparison instead of ad hoc saved maps.

## Multiplayer / Workflow Queue

- [ ] Verify the persistent public room in the live browser list against the running client stack on the default dev port.
- [ ] Verify the combined `bun run dev` flow in normal day-to-day use.
- [ ] Keep running the CLI-Anything vs `atlas-harness` evaluation during real Pax Fluxia work.
- [ ] On every tooling snag, classify the friction explicitly:
  - `atlas-harness`
  - CLI-Anything
  - Pi integration
  - Codex shell/environment
- [ ] Keep logging `atlas-harness` failures, shortcomings, and improvement ideas in the permanent ledger.

## Notes

- `FEATURE_STATUS.md` still contains useful history, but this file is the cleaner active queue for today.
- The top priority remains color/UI trust first, then lane fidelity, then territory/metaball work.
- As of this round, `atlas-harness` is directly callable in the Codex shell, while CLI-Anything is still gated through Pi and cannot yet be fairly exercised here because Pi command execution is blocked by an inactive provider account.
