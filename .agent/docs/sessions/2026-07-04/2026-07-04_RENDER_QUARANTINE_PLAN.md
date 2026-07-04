---
date: 2026-07-04
status: PLAN — awaiting keep-set confirmation before execution
goal: strip Territory & Render settings to UNIVERSAL/active only; quarantine (archive, not delete) all render work not directly applicable
---

# Render quarantine + settings strip — traced plan

## Traced inventory (read from code, not guessed)

**GameCanvas render dispatch** (`GameCanvas.svelte`, one `case` each): territory_engine (5297),
power_voronoi (5351), pvv2_dy4 (5406), metaball (5426), cell_grid (5504), phase_edges (5586),
ember_lattice (5669), phase_field (5754), grid_gradient (5830), perimeter_field (5988),
**power_vector (6083)**, pixel (6127), graph (6145), contour (6155), territory_runtime (6188).

**Family dirs** (`src/lib/territory/families/`): cellGrid, gridGradient, metaball, perimeterField,
**powerVector**. **Legacy renderers** (`src/lib/renderers/`): PowerVoronoiRenderer, PowerVoronoiRenderer_DY4,
PVV3Renderer, StarRenderer(partial).

**Settings cards** (ControlsSection-Territory + tuning components): runtime-surface card
(`supportsRuntimeSurfaceStyleCard`: territory_engine/runtime/power_voronoi_runtime), shared-surface card
(`supportsSharedSurfaceStyleCard`: perimeter_field / cell-grid / **power_vector**), grid-gradient card,
CellGridTuning, GridGradientTuning, PerimeterFieldTuning, metaball controls, transition tuning
(gated to power_voronoi/pvv2_dy4/metaball).

**Search routing** (`settingsSearch.ts:134-197`) + **search index** (`settingMetadata.ts` SCOPE_LABEL_META):
per-mode keys (METABALL_*, PERIMETER_FIELD_*, GRID_GRADIENT_*, CELL_GRID_*, DF_*, ember/phase).

## Proposed KEEP set (confirm before executing)

- **Render:** `power_vector` + the **PowerCore geometry pipeline** (`territory/geometry/powerCore/*`,
  the 0319 compiler it consumes) — the active direction (memory: PowerCore is the unification core).
- **Universal settings** (apply to the PowerCore/Power-Vector path): Topology (CX/CL/SB/DX, MSR,
  min-dominance, world boundary), Geometry Source, the unified Surface (TERRITORY_SURFACE_* fill/border,
  VORONOI_BORDER_SMOOTH rounding, TERRITORY_SURFACE_BORDER_BLEND, TERRITORY_CONQUEST_FRONT_MODE),
  Transition timing (TERRITORY_TRANSITION_MS, BIND_TO_TICK).
- **Quarantine:** the other 13 modes + their families/renderers/tuning cards/search-keys/config/catalog
  entries. Archive under `src/lib/territory/_quarantine/` (or a branch) — NOT deleted; they may return as
  PowerCore skins (per the PowerCore plan).

## Staging (each stage keeps the build GREEN + Power Vector working + is test/typecheck verifiable)

- **Stage A — Settings strip (contained, biggest immediate relief).** In ControlsSection-Territory +
  TerritorySurfaceStyleTuning, render ONLY the universal + power_vector controls; drop the per-mode cards
  and the per-mode subsection chips. Prune SCOPE_LABEL_META + resolveSectionTarget of the quarantined
  keys. Verify: `bun run check`, the settings **wiring invariant** guard, and a NEW test asserting the
  Territory styles surface renders the universal controls for power_vector. No render-pipeline risk.
- **Stage B — Dispatch fallback.** In the GameCanvas render switch, remove the quarantined `case`s; a
  `default` maps any non-power_vector `TERRITORY_RENDER_MODE` → power_vector (so saved configs don't
  crash). Verify: build + **replay hash** unchanged (presentation-only) + territory suite.
- **Stage C — Quarantine files.** Move the quarantined family dirs + legacy renderers to
  `_quarantine/`; delete their imports; relocate/skip their tests (they move with the code). Verify:
  full `bunx vitest run` + `bun run check` green.
- **Stage D — Catalog/config.** Remove quarantined ids from `territoryRenderModeCatalog` (they vanish
  from the topbar selector) + config defaults + themes. Verify: build + the render-mode selector shows
  only Power Vector.

Rollback: each stage is one commit; quarantine is a move (revertable). Recommend executing A→D in
order, one commit per stage, gates between.
