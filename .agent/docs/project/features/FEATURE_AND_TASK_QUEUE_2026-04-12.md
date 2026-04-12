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

## In Progress

- [ ] Fix live player-color desync so territory fills repaint with the same colors as owned stars during in-game hue adjustment.
- [ ] Verify in-app that the new unified player-color widget feels legitimate and trustworthy after the structural cleanup.
- [ ] Keep validating that the selected player swatch, AI row highlight, and actual in-game/player-lobby color stay aligned.
- [x] Repair the Main Menu parser/syntax regressions from the recent UI rewrite so the menu is runnable again.

## Top Queue

- [ ] Verify visually that territory fills now repaint live with star ownership colors across the active territory families.
- [ ] Refine any remaining Main Menu spacing roughness after the three-panel redesign once the user has seen it.
- [ ] Evaluate the new opt-in metaball geometry-fill mode in-game and decide whether it should remain optional or become the default.
- [ ] Decide how `Custom` maps should evolve from selector-only into the future custom-map workflow.

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
