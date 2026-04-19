# Daily Queue — 2026-04-19

Branch: `claude/goofy-raman`.
Yesterday's work: MG-BORDER v2 shipped; perf plan authored; docs committed + pushed.
Today: acronym correction + tunable surfacing + perf Phase A.

## Completed today

- [x] **Acronym correction** — DECISIONS entry D-TERR-ACRONYMS-2026-04-19 appended; yesterday's CHAT left verbatim per §3.6 lossless rule; correction pointer in today's CHAT.
- [x] **CX/CP/DX/MSR exposure in metaball-grid card** — `TerritoryGeometrySourceTuning` + preamble wired into the Metaball Grid settings card (`ControlsSection-Territory.svelte` ~L2177). MSR tooltip rewritten.
- [x] **Perf Phase A** — Commit `9329bab7`. Dirty-flag paint gate; plan-params invalidation on classification-tunable edit (previously silently stale until next conquest); three new tunables (distribution, position jitter, max cells); live Perf UI module (`metaballGridStats` Svelte store → `$metaballGridStats` reactive readouts: cells, spacing, frame-ms, skipped-frame %).
- [x] **Perf Phase C** — Commit `94b7367e`. `getPrevRenderFamilyGeometryForTransition()` in `GameCanvas.svelte` builds PREV once per (transition fingerprint + NEXT geometry key). Passed via new `RenderFamilyInput.prevGeometry`. Both `PerimeterFieldFamily` and `MetaballGridFamily` consume it; fall back to local rebuild if absent. Eliminates ~45 % duplicate power-Voronoi work per transition frame. MetaballGridFamily plan also now invalidates on NEXT/PREV geometry reference change (config edits propagate live).

## Corrected acronym record (canonical as of today)

| Acronym | Expansion | What it actually does |
|---|---|---|
| **CX** | **Corridor Extension** (distributed corridor virtual stars along lanes) | Pre-metaball geometry input. Places virtual sites along lanes so same-owner lanes stay fully inside the owner's territory, and contested lanes get proper midline framing. `TERRITORY_CX_COUNT > 0` overrides `MODIFIED_VORONOI_CORRIDOR_SPACING`. |
| **CP** | **Contested-lane midpoint Pair** (contested-case virtual stars on enemy-owned lanes) | Pre-metaball geometry input. Places paired Vs on either side of the (arc-length) midpoint of a contested lane to pull the two contesting owners' regions forward and block any 3rd-party from touching the lane. Known issues: a code path in the metaball family wasn't wired; short lanes can suppress pair emission. (See audit in METABALL_GRID_PERF_PLAN_2026-04-18 + DECISIONS 2026-04-19.) |
| **DX** | **Disconnect eXclusion** (conditional enemy virtual stars between disconnected same-owner components) | Pre-metaball geometry input. For each owner with ≥2 disconnected components, injects paired enemy virtual sites between components so territory rendering does not suggest star-star connections that don't exist as lanes. Conditional by design: on many maps it legitimately produces nothing. |
| **MSR** | **Minimum Star Range** (power-diagram site weight, not a region size) | Pre-metaball geometry input via `MODIFIED_VORONOI_STAR_MARGIN`. Site-weight term (internally squared) in `power_voronoi_0319`. Semantically: “lanes that do not originate at a given star should not pass within MSR of it.” The weight-based implementation can feel weak/ambiguous relative to a clean visible moat. The perceived “moat” side effect is a by-product of the weighting scheme, not a requested feature — the gap-fill fallback in `buildGridClassification.ts` L63-88 exists to mask it. |

All four of these are consumed for free by any render family that reads pre-shaped `territoryRegions` from the `CanonicalGeometrySnapshot` (metaball-grid, perimeter-field). Grid-family classification does not need to re-implement any of them.

## Proposed next (queued, priority order)

- [ ] **MG-PERF-PHASE-B** — Two-layer RenderTexture caching. Bake the static native-cells layer into a `PIXI.RenderTexture` on plan build; paint only the dynamic (dispossessed/emergent/vacating) overlay per frame. Main win during steady-state transitions with large native regions. Needs PIXI 8 `renderer.render({ container, target })` API; test with renderer passthrough already threaded. Estimated impact: ~60-80 % paint reduction during early/late transition frames.
- [ ] **MG-MSR-LANE-FILTER** — Actually implement the lane-proximity MSR the user described: reject / clip lanes that pass too close to non-endpoint stars. This is a lane-generation concern (`src/lib/lanes/**`), independent of the Voronoi site-weight in `power_voronoi_0319`. The site-weight knob (`MODIFIED_VORONOI_STAR_MARGIN`) is only a proxy.
- [ ] **MG-CP-SHORT-LANE-AUDIT** — Verify the CP short-lane suppression threshold. The user's hint from a separate agent was that CP pair emission silently suppresses on short lanes; confirm the cut-off and decide whether to warn in the UI or raise the threshold.
- [ ] **MG-DEFAULTS-REVISIT** — Flip defaults for `MODIFIED_VORONOI_CORRIDOR_ENABLED` and `MODIFIED_VORONOI_DISCONNECT_ENABLED` once user confirms the metaball-grid visuals look better with them on by default. Awaiting user sign-off.
- [ ] **MG-MOAT-AUDIT** — Evaluate whether the `buildGridClassification.ts` moat-fill fallback (L63-88) should stay long-term. Currently a correct gap-fill for the MSR site-weight side-effect; revisit once MG-MSR-LANE-FILTER lands.
- [ ] **MG-PERF-PHASE-D** — Stretch: splat-and-threshold (pre-baked gaussian atlas), or JFA (jump-flood algorithm for distance-field fills). Only worth pursuing if Phase B still leaves iGPU frame-budget holes at 8 px spacing.
- [ ] **MG7/MG8/MG9** — Acceptance tests, perf bench default profile, paused debug overlay (inward-offset visualisation + cell classification colour).
- [ ] **TUNABLE-PLAN-INVALIDATION-WAVE** — `buildPlanForTransition` still doesn't invalidate when `METABALL_GRID_ADJACENCY`, `METABALL_GRID_WAVE_GEOMETRY`, or `METABALL_GRID_WAVE_SEEDING` change mid-transition (wave plan only; classification is covered by Phase C). Low priority (user must trigger these edits during an active transition to see the stale wave). Add `wavePlanParamsKey` field alongside `lastPlanParamsKey` to fix.

## Notes

- User authorized push yesterday; continuing that authorization today barring pushback.
- Entire CLI installed at `C:\Users\mikep\.local\bin\entire.exe` (v0.5.5); hooks green.
