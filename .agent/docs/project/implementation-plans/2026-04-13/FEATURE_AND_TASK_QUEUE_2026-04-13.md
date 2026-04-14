# Feature And Task Queue - 2026-04-13

## Purpose

Debug the broken Main Menu presentation issue in the active worktree and pull in the complete current Main Menu work from `C:\Users\mikep\.codex\worktrees\0251\pax-fluxia`.

## Completed This Slice

- [x] Diff the active worktree against `0251` and identify the full Main Menu dependency surface instead of guessing at a local CSS-only cause.
- [x] Import the `0251` Main Menu surface into this worktree, including `MainMenu.svelte`, the new `main-menu/*` subcomponents, `menuTheme.ts`, `AudioSettings.svelte`, `GameSettingsPanel.svelte`, `panelSync.ts`, the updated settings sections, and `GameContainer.svelte`.
- [x] Restore the current worktree's territory/config deltas on top of the imported menu stack where they overlapped, specifically `METABALL_FILL_FOLLOWS_GEOM`, `TERRITORY_CX_CONTEST_MIDPOINT_VSTARS`, and the missing arrow config/type surface in `game.config.ts`.
- [x] Remove the old unreferenced `MainMenu refactor.svelte` and `MainMenu v2.svelte` prototype files so the imported menu surface matches the source worktree cleanly.
- [x] Verify the imported Main Menu stack compiles with `bun run build`.
- [x] Recenter on the renderer branch purpose and wire the first family-driven metaball conquest transition path through `territoryTransitionHandler`, `GameCanvas`, `RenderFamilyInput`, `MetaballFamily`, and the new `buildMetaballScene.ts` scene builder.
- [x] Replace the old single-point DX helper with a shared modular disconnect builder that emits deterministic paired enemy virtual sites around the Euclidean midpoint of disconnected same-owner stars.
- [x] Add focused renderer tests for the new DX builder and the first metaball conquest transition sample path, then verify the slice with `bunx vitest` and `bunx tsc --noEmit`.
- [x] Trace the startup settings regression where the game booted into PVV2DY4 until the settings panel was opened, identify that `GameSettingsPanel` was the only place persisted panel values were being applied into runtime config, and move that bootstrap into `GameContainer` so the renderer starts from persisted settings even with the panel closed.
- [x] Restore persistence of the in-game settings column open/closed state by loading `pax-settings-open` during `GameContainer` startup instead of always hardcoding the settings column closed.
- [x] Force the `Combat & Fleet Pressure` Metaball controls off at startup and in defaults (`METABALL_COMBAT_BORDER_TICKS`, `METABALL_COMBAT_BORDER_PROXIMITY_PX`, `METABALL_COMBAT_BORDER_WIDTH_BOOST`, `METABALL_COMBAT_BORDER_ALPHA_BOOST`, `METABALL_BORDER_FORCE_RATIO`) so this renderer branch stops paying perf cost for an undesired effect.
- [x] Trace the "no visible transition even with `USE_RENDER_FAMILIES` on" report to the actual renderer path: ordinary `metaball` rendering was still gated on `USE_RENDER_FAMILIES`, and the family transition samples were being visually canceled by a full-strength conquered target sample at the destination star.
- [x] Unify normal `metaball` rendering onto the family-built scene-input path in `GameCanvas` so conquest transitions no longer depend on the `USE_RENDER_FAMILIES` runtime gate.
- [x] Make the conquered target star's Metaball contribution transition-aware and strengthen the advancing/retreating transient samples so the first conquest handoff is materially visible instead of snapping to the already-conquered target.
- [x] Re-run focused Metaball/DX tests plus full client `tsc` and `build` after the transition-path fix.
- [x] Write a project post-mortem for the transition path failure and the earlier "implemented without real runtime verification" mistake.
- [x] Unify territory/conquest control ownership for transition tuning: move renderer-specific `VS_TRANSITION_MODE` selection into Territory, keep numeric `VS_*` tuning in Conquest, and surface `VS_BIND_TO_TICK` instead of leaving it hidden.
- [x] Expand the shared transition-mode config contract so `VS_TRANSITION_MODE` can carry contextual Metaball modes (`metaball_lane_push`, `metaball_six_slice_burst`) without breaking legacy PV/VS paths.
- [x] Wire the full `VS_*` conquest tuning surface into Metaball scene building so victor travel, loser travel, power lerp start/end, lerp duration, and tick binding all affect Metaball conquest motion.
- [x] Add a cached six-slice Metaball conquest mode that records a `T0` boundary snapshot, orients six 60-degree rays from the primary attacker tangent, spawns one victor vstar per attacker, and emits five loser burst vstars along the non-lane rays.
- [x] Add the `METABALL_BURST_BOUNDARY_BASIS` control and conditional Conquest-panel affordance so the new six-slice mode can choose between `t0_region_contour`, `per_ray_contour_hits`, and `approximate_radius`.
- [x] Refactor the Metaball family scene builder into shared base-context + transition-mode dispatch helpers so the lane-push and six-slice modes share the same star/CX/DX sample assembly.
- [x] Add focused tests for transition-mode coercion, Metaball six-slice burst sample generation, target-star suppression during burst mode, and boundary-basis cache differences; re-run `vitest`, `tsc`, and `build`.
- [x] Lock the gameplay ownership rule that all stars must hold territory space at runtime: update the mechanics/territory specs so missing or empty map `ownerId` values are normalized to `neutral` at game init instead of remaining truly unowned.
- [x] Add a shared init-time ownership normalizer and run it after client and server map initialization so any ownerless stars are converted to `neutral` before gameplay, stats, or territory rendering begin.
- [x] Move renderer transition tuning out of Conquest and into Territory directly under the renderer mode selectors, then add independent `All | None` subsection visibility toggles to both top-level Territory shells.

## Follow-Ups

- [ ] User-verify that the imported Main Menu presentation issue is resolved in-app.
- [ ] If any presentation issue remains, debug against the imported `0251` shell rather than the old local grid path.
- [ ] User-verify that territory renderer selection now boots straight into the saved Metaball mode without requiring the settings panel to be opened.
- [ ] User-verify that the settings column open/closed state now survives reloads on desktop.
- [ ] User-verify that a Metaball conquest now visibly morphs instead of snapping instantly.
- [ ] If the handoff is still too subtle or too strong, tune the target-star ramp and transient sample strengths from this unified baseline instead of reintroducing a second Metaball runtime path.
- [ ] User-compare `Lane Push` versus `Six-Slice Burst` in live gameplay and decide which should become the default Metaball conquest mode.
- [ ] If `Six-Slice Burst` reads too soft or too explosive, tune the shared `VS_*` timings and the `METABALL_BURST_BOUNDARY_BASIS` distance basis before adding any new transition families.
