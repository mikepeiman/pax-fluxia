# Master Program Plan - 2026-04-12

## Current focus

- Stabilize player-color tooling so it is trustworthy, visible, and shared across Main Menu, in-game controls, SP, and MP.
- Keep reducing silent divergence between SP and MP by pushing shared intent through the real multiplayer room path.
- Continue the ongoing workflow and harness evaluation while logging concrete atlas-harness failures instead of hand-waving them.
- Keep full-access work governed by an explicit repo-local safety contract.

## This round

- Saved the standalone Main Menu handoff for the parallel UI worktree at `.agent/docs/project/implementation-plans/2026-04-12/MAIN_MENU_UI_REDESIGN_PLAN_2026-04-12.md`.
- Added a hard requested-file protocol to `.agent/AGENT.md` after a process miss where I referenced a file before it was actually written; documented in `.agent/docs/project/process/POST_MORTEM_2026-04-12_REQUESTED_FILE_NOT_SAVED.md`.
- Board fill at 100% is now truly corner-anchored in `common/src/mapgen/placement.ts`; it no longer uses nearest-hex corner approximations or post-fit scaling for the full-fill case.
- Curved-lane semantics in `common/src/mapgen/lanePolylines.ts` were restored to straight-first when the chord is clear, with blocker-aware bend ordering when a detour is required.
- Nonlinear lane rendering in `pax-fluxia/src/lib/renderers/LaneRenderer.ts` now trims paths to star rims and strokes them as smooth curves instead of visibly segmented centerline joints.
- Transport/attack-surge/conquest runtime pathing moved closer to one shared truth:
  - attack surge direction now uses lane heading in `GameCanvas.svelte`
  - ship travel now always consumes lane polylines in `ShipRenderer.ts`
  - conquest travel and arrowhead modes now attach lane geometry from the published lane path when available
- Added a territory runtime toggle for contested-lane midpoint pair virtual stars:
  - config key `TERRITORY_CX_CONTEST_MIDPOINT_VSTARS`
  - settings wiring in `ControlsSection-Territory.svelte`
  - propagation through corridor builders / territory renderers
- Standardized the daily clean execution queue at `.agent/docs/project/features/FEATURE_AND_TASK_QUEUE_YYYY-MM-DD.md`.
- Created today's queue file and logged the active UI/color/lane/metaball work there.
- Added the daily queue protocol to `.agent/AGENT.md`.
- Added a standing harness-comparison protocol to `.agent/AGENT.md`: every future tool snag should be classified against `atlas-harness`, CLI-Anything, Pi integration, or the Codex shell/environment.
- Live harness comparison today is asymmetric:
  - `atlas-harness` is directly callable in this Codex shell.
  - CLI-Anything is currently exposed through Pi, not as a direct peer shell/MCP command in this session.
  - Pi command execution is presently blocked by an inactive provider account, so CLI-Anything cannot yet be fairly exercised from this runner.
- Main Menu was reworked into three real panels:
  - `Game Setup`
  - `Players`
  - `Multiplayer`
- The map-mode selector now includes `Custom`.
- Slider/control density in the setup surface was tightened and the `Straight | Curved` lane-path selector was restyled to match the main menu language.
- Player-color setup was consolidated into one visible widget in the `Players` panel, with hue nudge hidden behind a compact popover trigger.
- The player-color popover now exposes real HSL adjustments instead of a bespoke `+/-15 deg` affordance, and it closes like a normal popover on outside click / Escape.
- The old duplicate visible palette and AI surfaces were removed from active circulation instead of merely being left as parallel UI.
- The last visible Main Menu text corruption was cleaned up, and the commander color is no longer presented as a second competing selection surface outside the main palette card.
- The floating topbar now carries the BG selector, audio control, and settings gear so those controls are not pushed into the Players panel.
- `GameCanvas` now flushes territory renderer caches on territory-config changes, and metaball cache fingerprints now include player-color fingerprints so live palette changes can invalidate stale fills.
- Room listing and room metadata now support a persistent public anchor room and a public label.
- `pax-server` now creates a persistent `Public Room` on startup, and `multiplayerStore` sorts that room to the top of discovery.
- The root Bun dev workflow now includes a combined client + server launcher via `tools/dev/dev-full.ts`.
- Shared lane generation now smooths kink-detour fallbacks into true curved published polylines when the smoothed path still satisfies clearance, and the 100% board-fill path now anchors corner stars before scaling the rest of the map.
- Cross-owner corridor generation now explicitly seeds one virtual site per owner near the lane midpoint, rather than relying only on distributed side-split samples.
- Added two new fixture maps in `/common` for:
  - cross-owner midpoint corridor behavior
  - future metaball conquest-lane transition evaluation
- Added an opt-in `Metaball fill follows geometry ownership` territory control so metaball fill can be evaluated against actual region footprints instead of only real-star field agreement.
- Live palette changes now force territory visual invalidation so fills and stars repaint together rather than drifting apart.
- Validation completed:
  - `bunx tsc -p common/tsconfig.json --noEmit --pretty false`
  - `bunx tsc -p pax-fluxia/tsconfig.json --noEmit --pretty false`
  - `bunx tsc -p pax-server/tsconfig.json --noEmit --pretty false`
  - server startup was verified on alternate port `2571`, including creation of the persistent public room
- One non-code runtime obstacle was observed and classified:
  - default-port server startup in this shell hit a bind/listen error, which appears to be an environment/port-occupancy issue rather than a Pax server regression

## Next likely moves

- Verify visually that Main Menu previews, AI rows, lobby colors, stars, and territory fills now agree in both SP and MP.
- Keep the current palette/UI slice honest by confirming that the consolidated player-color widget truly feels authoritative in-app.
- Verify that the new HSL popover and floating topbar feel like standard UI instead of bespoke utility scaffolding.
- Use the persistent public room in a real browser pass on the default dev port.
- Evaluate the new metaball geometry-fill option in-game before deciding whether it should stay optional or become the default.
- Continue with the queued lane/arrows/metaball work once the player-color foundation feels stable.
