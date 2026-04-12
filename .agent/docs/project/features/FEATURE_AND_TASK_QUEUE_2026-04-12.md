# Feature And Task Queue - 2026-04-12

## Purpose

Keep one clean, date-scoped execution queue for the active work, separate from the larger and messier historical tracker.

## Completed This Slice

- [x] Save a dated post-mortem for the directed lane-path regression at `.agent/docs/project/process/POST_MORTEM_2026-04-12_DIRECTED_LANE_PATH_REGRESSION.md`.
- [x] Add a repo rule to auto-save post-mortems for major self-introduced regressions once fixed.
- [x] Move `bezier` travel onto lane polylines when available so curved travel survives the current VFX behavior mode.
- [x] Fix the last undirected transfer-path read in `transferHandler.ts`.
- [x] Smooth the near-full board-fit padding cliff so `boardFit 0.95` is no longer a totally different placement regime from `1.0`.
- [x] Add a directed-lane read path so cached undirected polylines reverse correctly for `B -> A` consumers.
- [x] Add a reusable lane-margin sweep diagnostic at `tools/debug/diagnose-lane-margin.ts` plus the root command `bun run debug:lane-margin`.
- [x] Save a focused evidence note at `.agent/docs/project/implementation-plans/2026-04-12/LANE_MARGIN_DIAGNOSTICS_2026-04-12.md`.
- [x] Save a focused runtime investigation note at `.agent/docs/project/implementation-plans/2026-04-12/MAPGEN_RUNTIME_REGRESSION_ANALYSIS_2026-04-12.md`.
- [x] Correct 100% board fill to use the actual full board instead of the old padded interior area.
- [x] Split contested-lane midpoint virtual stars into a discrete runtime behavior that can stay active even when main CX corridors are off.
- [x] Add lobby-room retry handling for `seat reservation expired` failures and increase `GameRoom` seat reservations to 120 seconds.
- [x] Save the standalone Main Menu parallel-agent handoff at `.agent/docs/project/implementation-plans/2026-04-12/MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md`.
- [x] Add an explicit requested-file rule to `.agent/AGENT.md` and document the failure in a post-mortem after the UI handoff file was not saved before being referenced.
- [x] Restore 100% board fill to true corner anchoring instead of corner-ish nearest-hex placement.
- [x] Restore curved-lane semantics to straight-first when the chord is clear, with blocker-aware bend direction when a detour is required.
- [x] Render nonlinear lanes as smooth stroked arcs trimmed to star rims instead of visibly segmented centerline joints.
- [x] Make transport and attack-surge heading use published lane path geometry in the active renderer/runtime path.
- [x] Move conquest travel and arrowhead travel onto published lane-path geometry when nonlinear lanes exist.
- [x] Add a territory toggle for contested-lane midpoint pair virtual stars so cross-owner corridor behavior can be A/B tested.
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

- [ ] Verify the standalone Main Menu redesign in the parallel worktree using the saved handoff doc.
- [ ] Verify 100% board fill in-app across several random seeds now that corner anchors are truly on the full board, not the padded interior.
- [ ] Verify curved lanes now appear again at practical lane settings and only detour outward away from blockers.
- [ ] Verify nonlinear lane rendering is smooth on-screen with no visible joints or star-end overlap artifacts.
- [ ] Verify transport, attack surge, and conquest travel now all follow the same published lane path when nonlinear lanes exist.
- [ ] Verify the contested-lane midpoint toggle behaves independently of main CX and no longer pushes unrelated fronts inward.
- [ ] Verify the room browser actually shows the persistent public room on the default dev port and survives seat-expiry churn.

## Top Queue

- [ ] Verify in-app that order arrows, issued orders, attack surge, transport travel, and conquest travel all use the corrected directed lane path.
- [ ] Verify in-app that `bezier`-mode travel now visibly rides curved lanes in standard transfer and conquest flows.
- [ ] Continue tuning the remaining `boardFit` interaction now that the worst `0.95 -> 1.0` cliff is reduced (`0` curved -> `86` curved at 0.95 on the same seed).
- [ ] Replace the lane solver's unsafe straight fallback at medium/high lane margins with a valid outward curve, valid detour, or explicit prune behavior.
- [ ] Use `bun run debug:lane-margin` after each lane-solver change to keep the regression measurable.
- [ ] Verify visually that territory fills now repaint live with star ownership colors across the active territory families.
- [ ] Verify the exact-corner 100% board-fill path and restore sub-100% feel if any placement regression remains.
- [ ] Tune the remaining high-margin + max-bias lane case, which still under-produces curves even after the current fix.
- [ ] Verify the restored curved-lane semantics on several random seeds and tune bend preference if any inward curves remain.
- [ ] Verify the new smooth nonlinear lane rendering against real generated maps, not just compile/smoke tests.
- [ ] Verify the public room appears in discovery on the default dev port and remains joinable without seat-expiration churn.
- [ ] Evaluate the new opt-in metaball geometry-fill mode in-game and decide whether it should remain optional or become the default.
- [ ] Decide how `Custom` maps should evolve from selector-only into the future custom-map workflow.

## Next Technical Queue

- [ ] Finish any remaining travel holdouts so every conquest mode uses lane-path truth consistently.
- [ ] Order arrows must follow lane paths, including curved lanes.
- [ ] Update CX corridors so competing players also meet across the lane midpoint instead of allowing third-party intrusion.
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
