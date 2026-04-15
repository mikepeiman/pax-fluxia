# Feature And Task Queue - 2026-04-13

## Purpose

Keep the active 2026-04-13 execution queue in one dated place, including both the lane-geometry/diagnostics tranche and the renderer-branch import tranche that were active that day.

## Completed This Slice

### Lane Geometry And Diagnostics

- [x] Add explicit terminology/communication rules in:
  - `.agent/AGENT.md`
  - `.agent/docs/game/design/TERMINOLOGY.md`
- [x] Create the canonical lane-constraint model note:
  - `.agent/docs/project/implementation-plans/2026-04-13/LANE_CONSTRAINT_MODEL_2026-04-13.md`
- [x] Split authored-map lane updates from connectivity recomputation in runtime state:
  - authored maps preserve connectivity by default
  - authored maps can opt into connectivity recomputation explicitly
- [x] Add `laneConstraintStatus` to shared connection truth and saved-map export/import.
- [x] Upgrade the frozen-map lane audit to report:
  - connectivity mode
  - final connection status
  - straight-line distance vs final lane distance
  - blocking stars and nearest-point distances
  - attempt counts and rejection reasons
- [x] Add a second deterministic stress-test map:
  - `common/resources/saved-maps/lane_margin_cross_pressure_2p.json`
  - blockers above and below the same lane corridor
- [x] Add two fuller authored two-player geometry test maps with permanent ruler fixtures for every lane:
  - `common/resources/saved-maps/lane_margin_square_layers_2p.json`
  - `common/resources/saved-maps/lane_margin_hex_layers_2p.json`
- [x] Remove embedded ruler fixtures from `lane_margin_hex_layers_2p` after they proved misleading.
- [x] Trace the `LM > 200` square-map cliff to endpoint-bound lane-margin measurement in shared geometry.
- [x] Add an endpoint guard to lane-margin solving so nearby non-endpoint stars do not create a hard cap at the exact lane endpoints.
- [x] Align the lane-audit tool with the endpoint-guard measurement so diagnostics match the shared solver.
- [x] Eliminate the separate modal debug surface as the primary ruler entrypoint.
- [x] Remove the later separate Diagnostics Bar experiment from the active game UI.
- [x] Move ruler workflow into the regular right-hand Debug section instead of a second diagnostics surface.
- [x] Add persistent vs transient ruler measurement modes.
- [x] Add measurement logging with:
  - snapped stars / lane labels
  - distance in px
  - current Lane Margin at capture time
  - actual lane-state classification from authoritative map truth
  - user-overridable lane-state tag (`straight`, `bent`, `curved`, `missing`)
- [x] Add regular diagnostics-panel controls for:
  - ruler
  - live canvas overlay
  - transition snapshot recorder
- [x] Add a dedicated bottom-right ruler icon that toggles ruler mode and opens the Debug section.
- [x] Keep the diagnostics-related viewport/pan corrections so the board remains navigable when overlays are present.
- [x] Relax vertical pan clamping so the board is less vertically constrained, especially while diagnostics are open.
- [x] Move lane feasibility fully into shared geometry instead of allowing a post-connectivity lane rewrite.
- [x] Remove reduced-clearance lane solving and invalid straight fallback from shared lane geometry.
- [x] Split lane result classes into `straight`, `angular`, and `curved`.
- [x] Add adjusted-path style support at shared mapgen level so remapped lanes can remain angular or be converted into sampled curve geometry.
- [x] Make `generateMap(...)` return the final lane-aware connection truth once, with no downstream rewrite.
- [x] Make live in-game lane adjustments use the same strict shared geometry builder as Main Menu generation.
- [x] Make config imports/presets rebuild real lane geometry when lane keys change.
- [x] Remove renderer-side connection-lane shortening so drawn lane paths come directly from authoritative connection truth.
- [x] Fix duplicate/offset lane rendering by canonicalizing bidirectional lane drawing and rendering the exact authoritative polyline instead of smoothing a second display path.
- [x] Add authoritative lane audit/snapshot tooling:
  - `bun run debug:lane-geometry`
  - SVG snapshot + markdown + JSON outputs
- [x] Update `debug:lane-margin` sweep output to distinguish `angular` vs `curved`.
- [x] Validate the full failing range at shared mapgen level:
  - margins `0, 35, 40, 45, 60, 80, 90, 120, 140, 160, 175, 230, 300`
  - `components: 1` across the sweep
  - `missingTruth: 0` across the sweep
- [x] Add a fixed-map lane audit:
  - `bun run debug:lane-audit`
  - frozen-map JSON + SVG + markdown outputs
  - exact per-lane straight-line clearance, final clearance, closest blocking star, closest point on lane, and decision reason
- [x] Remove false-positive curves on the frozen map by making the straight line the hard first decision.
- [x] Prove the high-`Lane Margin` hard limit on the frozen map:
  - at `LM 175+`, the strict straight-only feasible graph is disconnected
- [x] Encode the explicit hierarchy in shared geometry:
  - full traversal connectivity is the winning constraint
  - keep straight when the direct line satisfies LM
  - if the direct line fails: reshape tries satisfying adjusted paths, prune mode rejects that lane and seeks replacement elsewhere
  - explicit graph-level connectivity restoration only when the strict feasible graph is disconnected
- [x] Add connectivity-override reporting to the lane audit so high-LM behavior is machine-checkable rather than guessed.
- [x] Replace the generic remap seed with a deterministic blocking-star vertex rule:
  - exact nearest blocking star-to-lane point
  - vertex inserted on that shortest path
  - vertex pushed to the requested Lane Margin and not beyond it
  - repeated deterministically if another blocker still violates the constraint
- [x] Correct the first deterministic-remap regression:
  - remove fail-fast multi-blocker pruning
  - add explicit clearance epsilon to stop floating-point reinsertion loops
  - replace overly-aggressive curved smoothing with conservative deterministic corner-rounding
- [x] Revalidate frozen-map curved mode after the correction:
  - `LM 100` -> `54 connections`, `6 curved`, `0 audit violations`
  - `LM 175` -> `31 connections`, `9 curved`, `9 connectivity-restoration edges`, `0 audit violations`
- [x] Trace the lane-visibility divergence from authoritative map truth through schema/state/cache/rendering instead of patching the renderer blindly.
- [x] Confirm the shared layer already carries lane-path truth (`laneWaypoints`, `lanePathKind`) in `/common` types and Colyseus schema.
- [x] Identify the SP architecture gap: generated/rebuilt lane truth was being seeded into the cache without being written back onto authoritative `state.connections`.
- [x] Fix SP connection creation so authoritative connection objects now carry lane-path truth when maps are generated or rebuilt.
- [x] Fix saved-map export so map truth preserves `laneWaypoints` and `lanePathKind`.
- [x] Fix saved-map load so existing saved lane truth is scaled and reused rather than silently regenerated.
- [x] Update lane rendering so visible lane manifestation is drawn from persisted connection truth plus endpoint trimming, not from renderer-inferred carving.
- [x] Update lane-cache rebuild helper to return lane-aware connections so cache truth and state truth stay synchronized.
- [x] Reconcile pre-existing arrow-config type drift in `game.config.ts` so client type-checking can complete again.
- [x] Validate with:
  - `bunx tsc -p pax-fluxia/tsconfig.json --noEmit --pretty false`
  - `bunx tsc -p common/tsconfig.json --noEmit --pretty false`
  - direct runtime probe across lane margins `25, 60, 90, 120`
- [x] Add a deterministic saved-map probe for lane-margin debugging:
  - `common/resources/saved-maps/lane_margin_ruler_2p.json`
  - 2 players, limited stars, fixed straight lane truth
  - permanent ruler fixtures at `60`, `90`, `120`, `150`, `180`, and `240` px
- [x] Extend saved-map schema with `diagnostics.rulerFixtures` and `diagnostics.rulerColor`.
- [x] Render map-native ruler fixtures from current lane truth in `GameCanvas`, independent of live ruler session state.
- [x] Verify exact fixture distances by script:
  - `60`, `90`, `120`, `150`, `180`, `240`

### Renderer Branch Import And Territory Work

- [x] Diff the active worktree against `0251` and identify the full Main Menu dependency surface instead of guessing at a local CSS-only cause.
- [x] Import the `0251` Main Menu surface into this worktree, including `MainMenu.svelte`, the new `main-menu/*` subcomponents, `menuTheme.ts`, `AudioSettings.svelte`, `GameSettingsPanel.svelte`, `panelSync.ts`, the updated settings sections, and `GameContainer.svelte`.
- [x] Restore the current worktree's territory/config deltas on top of the imported menu stack where they overlapped.
- [x] Remove the old unreferenced `MainMenu refactor.svelte` and `MainMenu v2.svelte` prototype files.
- [x] Verify the imported Main Menu stack compiles with `bun run build`.
- [x] Recenter on the renderer branch purpose and wire the first family-driven metaball conquest transition path through `territoryTransitionHandler`, `GameCanvas`, `RenderFamilyInput`, `MetaballFamily`, and the new `buildMetaballScene.ts` scene builder.
- [x] Replace the old single-point DX helper with a shared modular disconnect builder that emits deterministic paired enemy virtual sites around the Euclidean midpoint of disconnected same-owner stars.
- [x] Add focused renderer tests for the new DX builder and the first metaball conquest transition sample path, then verify the slice with `bunx vitest` and `bunx tsc --noEmit`.
- [x] Trace the startup settings regression where the game booted into PVV2DY4 until the settings panel was opened and move that bootstrap into `GameContainer`.
- [x] Restore persistence of the in-game settings column open/closed state by loading `pax-settings-open` during `GameContainer` startup.
- [x] Force the `Combat & Fleet Pressure` Metaball controls off at startup and in defaults so this renderer branch stops paying perf cost for an undesired effect.
- [x] Trace the “no visible transition even with `USE_RENDER_FAMILIES` on” report to the actual renderer path.
- [x] Unify normal `metaball` rendering onto the family-built scene-input path in `GameCanvas` so conquest transitions no longer depend on the `USE_RENDER_FAMILIES` runtime gate.
- [x] Make the conquered target star's Metaball contribution transition-aware and strengthen the transient samples so the first conquest handoff is materially visible.
- [x] Re-run focused Metaball/DX tests plus full client `tsc` and `build` after the transition-path fix.
- [x] Write a project post-mortem for the transition path failure and the earlier “implemented without real runtime verification” mistake.
- [x] Unify territory/conquest control ownership for transition tuning.
- [x] Expand the shared transition-mode config contract so `VS_TRANSITION_MODE` can carry contextual Metaball modes.
- [x] Wire the full `VS_*` conquest tuning surface into Metaball scene building.
- [x] Add a cached six-slice Metaball conquest mode.
- [x] Add the `METABALL_BURST_BOUNDARY_BASIS` control and conditional Conquest-panel affordance.
- [x] Refactor the Metaball family scene builder into shared base-context + transition-mode dispatch helpers.
- [x] Add focused tests for transition-mode coercion, Metaball six-slice burst sample generation, target-star suppression during burst mode, and boundary-basis cache differences.
- [x] Lock the gameplay ownership rule that all stars must hold territory space at runtime by normalizing ownerless stars to `neutral`.
- [x] Add a shared init-time ownership normalizer and run it after client and server map initialization.
- [x] Move renderer transition tuning out of Conquest and into Territory directly under the renderer mode selectors, then add independent `All | None` subsection visibility toggles to both top-level Territory shells.
- [x] Add a third Metaball conquest transition mode that holds the conquered star on old ownership while its influence fades to zero.
- [x] Add a fourth Metaball conquest transition mode for instant ownership switch with grow-in victor influence.

## Follow-Ups

- [ ] User-verify that the imported Main Menu presentation issue is resolved in-app.
- [ ] If any presentation issue remains, debug against the imported `0251` shell rather than the old local grid path.
- [ ] User-verify that territory renderer selection now boots straight into the saved Metaball mode without requiring the settings panel to be opened.
- [ ] User-verify that the settings column open/closed state now survives reloads on desktop.
- [ ] User-verify that a Metaball conquest now visibly morphs instead of snapping instantly.
- [ ] If the handoff is still too subtle or too strong, tune the target-star ramp and transient sample strengths from this unified baseline instead of reintroducing a second Metaball runtime path.
- [ ] User-compare `Lane Push` versus `Six-Slice Burst` in live gameplay and decide which should become the default Metaball conquest mode.
- [ ] If `Six-Slice Burst` reads too soft or too explosive, tune the shared `VS_*` timings and the `METABALL_BURST_BOUNDARY_BASIS` distance basis before adding any new transition families.
- [ ] Load `lane_margin_cross_pressure_2p` in-app and verify that authored connectivity stays fixed while only lane geometry changes.
- [ ] Load `lane_margin_square_layers_2p` and `lane_margin_hex_layers_2p` in-app and verify that every permanent lane fixture remains readable while live Lane Margin changes reshape only lane geometry.
- [ ] Re-check square-map behavior around `LM 200-205` in-app after the endpoint guard change.
- [ ] Load `lane_margin_ruler_2p` in-app and verify the permanent fixtures remain readable while lane geometry is rebuilt live.
- [ ] Verify in-app that explicit connectivity-restoration edges are visually honest in both SP and MP.
- [ ] Decide whether connectivity-restoration edges need a distinct visual/diagnostic treatment when they violate requested Lane Margin.
- [ ] Add lane-key copy/export actions from the ruler measurement log if the diagnostic workflow needs faster issue filing.
- [ ] Verify in-app that SP and MP now both present the same visible lane truth on the same map/settings.
- [ ] Continue lane geometry hardening so short direct lanes stay straight and adjusted detours remain outward and readable.
- [ ] Surface the new adjusted-path style control in the UI once the UI branch is ready for tunables again.
- [ ] Diagnose and redesign DX distance/weight semantics after refreshing the exact intended constraint.
- [ ] Queue contested-lane midpoint tunables for the UI owner after the control-panel refactor settles.

## Notes

- This dated queue now carries two real work slices from the same day:
  - the lane-geometry/diagnostics hardening tranche
  - the renderer-branch import and Metaball transition tranche
- The target invariant for the lane tranche is explicit:
  - connectivity is defined only by lane-aware map truth
  - visible lanes are drawn directly from that same truth
- The renderer tranche locked in a second important invariant:
  - conquest-local territory transition behavior must route through the real runtime family path, not through a detached diagnostic/export path

## Lossless User Instruction Log

1. Git discipline correction:
   - "you must always commit. This is not optional or an item to discuss or ask about."
2. Main Menu theme-expansion request:
   - "Time to work on the additional two styles and flesh out this design."
   - "PLEASE IMPLEMENT THIS PLAN:"
   - "Expand `neon` and `mythic` from shallow color variants into full production theme systems across all menu surfaces."
   - "Preserve the current menu architecture and theme IDs, but replace the current imperial-biased styling with a semantic theme token system plus moderate layout polish."
