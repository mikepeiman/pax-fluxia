# Daily Queue — 2026-04-19

Branch: `claude/goofy-raman`.
Yesterday's work: MG-BORDER v2 shipped; perf plan authored; docs committed + pushed.
Today: acronym correction + tunable surfacing + perf Phase A.

## Completed today

- [ ] — rolling list, filled in as work lands.

## Active task

- [ ] **CX/CP/DX/MSR exposure in metaball-grid card** — `TerritoryGeometrySourceTuning` widget added inside the Metaball Grid settings card so the mode-critical constraint knobs live next to the mode. (`ControlsSection-Territory.svelte` ~line 2177.) MSR tooltip corrected to reflect site-weight semantics, not “region size.”
- [ ] **Acronym correction** — yesterday's DECISIONS.md entry + CHAT log used the wrong expansions (CX was stated as “Exclusion”; MSR was stated as “Separation Radius” with an intentional moat). Corrected definitions logged today in DECISIONS and in SESSION_2026-04-19 note. Yesterday's CHAT is left verbatim per AGENT.md §3.6 lossless rule; a correction pointer is added at the top of today's CHAT.
- [ ] **Perf Phase A** — steady-state dirty-flag gate in `renderMetaballGridScene`; cell-count + frame-ms readouts; distribution mode (square/hex/jittered); cell cap; ParticleContainer backend option. Targets: paused-frame cost < 1 ms; 8 px spacing smooth on iGPU.

## Corrected acronym record (canonical as of today)

| Acronym | Expansion | What it actually does |
|---|---|---|
| **CX** | **Corridor Extension** (distributed corridor virtual stars along lanes) | Pre-metaball geometry input. Places virtual sites along lanes so same-owner lanes stay fully inside the owner's territory, and contested lanes get proper midline framing. `TERRITORY_CX_COUNT > 0` overrides `MODIFIED_VORONOI_CORRIDOR_SPACING`. |
| **CP** | **Contested-lane midpoint Pair** (contested-case virtual stars on enemy-owned lanes) | Pre-metaball geometry input. Places paired Vs on either side of the (arc-length) midpoint of a contested lane to pull the two contesting owners' regions forward and block any 3rd-party from touching the lane. Known issues: a code path in the metaball family wasn't wired; short lanes can suppress pair emission. (See audit in METABALL_GRID_PERF_PLAN_2026-04-18 + DECISIONS 2026-04-19.) |
| **DX** | **Disconnect eXclusion** (conditional enemy virtual stars between disconnected same-owner components) | Pre-metaball geometry input. For each owner with ≥2 disconnected components, injects paired enemy virtual sites between components so territory rendering does not suggest star-star connections that don't exist as lanes. Conditional by design: on many maps it legitimately produces nothing. |
| **MSR** | **Minimum Star Range** (power-diagram site weight, not a region size) | Pre-metaball geometry input via `MODIFIED_VORONOI_STAR_MARGIN`. Site-weight term (internally squared) in `power_voronoi_0319`. Semantically: “lanes that do not originate at a given star should not pass within MSR of it.” The weight-based implementation can feel weak/ambiguous relative to a clean visible moat. The perceived “moat” side effect is a by-product of the weighting scheme, not a requested feature — the gap-fill fallback in `buildGridClassification.ts` L63-88 exists to mask it. |

All four of these are consumed for free by any render family that reads pre-shaped `territoryRegions` from the `CanonicalGeometrySnapshot` (metaball-grid, perimeter-field). Grid-family classification does not need to re-implement any of them.

## Proposed next (queued)

- [ ] MG-PERF-PHASE-C — lift PREV-geometry capture upstream into `GameCanvas` (kills 4 px cliff, 45.8 % of per-transition cost per 2026-04-18 trace).
- [ ] MG-PERF-PHASE-B — two-layer caching (static RenderTexture + dynamic overlay).
- [ ] MG-MSR-LANE-FILTER — add the *missing* lane-level MSR enforcement the user described (reject/clip lanes that pass too close to non-endpoint stars). Independent of the Voronoi site-weight. Affects lane generation in `src/lib/lanes/**`, not the territory pipeline.
- [ ] MG-MOAT-AUDIT — evaluate whether the `buildGridClassification.ts` moat-fill fallback should stay, since MSR-as-weight side-effects still occur when `MODIFIED_VORONOI_STAR_MARGIN > 0`. Leave for now (it's a correct gap-fill under the current power-diagram implementation); revisit once MG-MSR-LANE-FILTER lands.
- [ ] MG-PERF-PHASE-D — stretch options (splat-and-threshold, JFA).
- [ ] MG7/MG8/MG9 — acceptance tests, perf bench default, paused debug overlay.

## Notes

- User authorized push yesterday; continuing that authorization today barring pushback.
- Entire CLI installed at `C:\Users\mikep\.local\bin\entire.exe` (v0.5.5); hooks green.
