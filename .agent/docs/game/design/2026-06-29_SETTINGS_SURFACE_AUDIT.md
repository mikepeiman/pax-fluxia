---
date created: 2026-06-29
last updated: 2026-06-29
last updated by: AI (Claude Opus 4.8, opus-territory)
relevant prior docs: .agent/docs/game/design/2026-06-27_SETTINGS_BUGS_AND_OPEN_ITEMS.md
---

# Settings Surface Audit + Unification Plan (2026-06-29)

User-directed one-shot: complete Settings audit (UI + code), de-duplicate, **unify
render-mode controls into always-present subsection chips so the Settings UI never
changes with the active render mode**, enforce **total chip-gating** (no markup outside a
chip), **bounded subsections** (no single-item chips, no long scroll), and remove dead
controls / dead `#if` code / Preset Rows. Territory & Render first, then ALL categories.

## 0. Reliability of this audit (honest limits)
- **Near-100% (deterministic):** the full surface is enumerated (35 files in
  `components/ui/settings/` + `GameSettingsPanel.svelte` + `settingsDefs.ts`/`panelSync.ts`
  + design-system rows). Every control→panelKey→configKey is mappable by grep; same-key
  collisions and dead always-true/false gates and `{#if false}` are found exhaustively.
- **NOT guaranteed without the rendered UI:** which gated blocks *co-render* for a given
  live `mode×view×subsection×tier` (combinatorial — mitigated by the condition matrix
  below + a render harness that screenshots each state); and pure visual/spacing waste.
- **Mitigation chosen:** a throwaway `/dev` render harness screenshots each state so the
  refactor is self-verified, not blind. Anything needing the true in-game frame is flagged.

## 1. Architecture (3-tier nav)
- **Category (rail):** `settingsTaxonomy.ts` `SETTINGS_CATEGORIES` (8: gameplay, fleet_stars,
  territory, map_effects, audio, interface, typography, developer). `CATEGORY_BY_SECTION`
  reverse map. Rail rendered `GameSettingsPanel.svelte:1382-1396`.
- **Section (top chips):** `settingsRegistry.ts` `SETTINGS_SECTIONS` (21). Chip row
  `GameSettingsPanel.svelte:1457-1480`, only when `activeCategoryChips.length>1` (good — no
  single-item *section* chip). "All" chip stacks every section (`:1508-1528`).
- **Subsection (secondary chips):** from `section.subsections` (only `map_options`,
  `territory_styles`, `diagnostics` define them today). Row `:1481-1505`, **no `>1` guard →
  single-item subsection chips possible.** Gating is `data-subsection-id` + `applySubsectionFilter`
  (`:1246-1260`) which hides direct children carrying the attr — **untagged markup stays
  visible (the structural root of "orphan block above the chips").**
- **Section→component dispatch:** `{#snippet sectionContent}` `:1555-1770`. Territory sections
  map to `ControlsSection-Territory` via `view` = `modes|tuning|styles` (three slices of ONE
  component), except `territory_phase_field`→separate `TerritoryPhaseFieldSettings`, and
  `frontier_fx`→`ControlsSection-FrontierFx`.

## 2. The per-mode swap (what makes the UI change with mode — must die)
- `isSectionVisible()` `GameSettingsPanel.svelte:963-975`: the 3 mode sections
  (`territory_phase_field/_edges/_ember_lattice`) show ONLY when `id===activeTerritoryModeSectionId`
  (`:955-961`, from `TERRITORY_MODE_SECTION_BY_RENDER_MODE` `:941-947`); `frontier_fx` shows only
  for phase_edges/ember. **This is the swap.** Remove it; make modes always-present chips.
- A SECOND divergent copy of these rules lives in `settingsSearch.ts:286-360` + `:127-214`
  (must be unified or search and nav re-diverge).
- Bug: `territory_styles` has NO mode gate in the panel but IS excluded in search for phase
  modes → double surface in-panel. `frontier_fx` allowed for `cell_grid` in search but not panel.

## 3. ControlsSection-Territory.svelte (2048 lines) — structure + duplication
Six top-level blocks: A theme bar (`:775`), B modes/"System" (`:779-870`), C tuning/"Renderer"
shell (`:872-1698`, the big one), D `showStylesView` `supports*` style cards (`:1700-1909`).

**LIVE DUPLICATION — two parallel style-card systems (both fire when `showStylesView`):**
| keys/components | Path 1 (block C, per-module) | Path 2 (block D, supports*) | keep |
|---|---|---|---|
| CellGridTuning + TerritorySurfaceStyleTuning | L1660-1685 | L1869-1907 | **D** (subsection-aware, finish, richer) |
| PerimeterFieldTuning + surface | L1644-1658 | L1869-1907 | **D** |
| GridGradientTuning | L1687-1694 | L1860-1867 (`!showTuningView` band-aid) | one only |
| Runtime fill/border (VORONOI_*) | L1536-1640 **`{#if false}` DEAD** | L1714-1858 (fill/border chips) | **D** |
→ Per-module cards L1644-1694 are **reachable, not dead** → delete; keep block D.

**DEAD code in this file:** `{#if false}` L1536-1640 (7 controls); `showRendererModule()`→true
(L761, used L887/1475/1644/1660/1687); `showSystemModule()`→true (L757, L785); nested redundant
`{#if showTuningView}` L1130; dead scaffolding `activeSystemModule`/`setActiveSystemModule`/
`systemModuleOptions`/`rendererModuleOptions` (no template consumer); **dead import**
`TerritoryGeometrySourceTuning` (L22, never instantiated here). Morph Control Points / Morph
Easing (L1494/1508) write panel-only (no GAME_CONFIG bridge) — verify consumer / likely dead
(territory_engine deprecated).

**Chip-gating gaps (orphan blocks):** Topology Rules card (L1130-1471) — gated only by
`showTuningView`, no subsection chip; Metaball card (L887-1128, embedded surface tuning gets no
activeSection); the child `*Tuning` components (CellGrid/Perimeter/GridGradient) manage their own
internal tabs independently of the panel chips; runtime "Shape & Motion" (L1490-1534).

## 4. Preset Rows verdict — KILL (relocate at most)
Lives in `CellGridTuning.svelte:959-979` (NOT in ControlsSection-Territory). Renders
`TERRITORY_FRONTIER_BENCHMARK_PRESETS` (`territory/frontier/config.ts:80-204`, 10 rows) as
buttons; `applyFrontierPreset` (L642-646) writes the same frontier-technique config keys the
individual controls right below already expose. Its own hint calls it "Benchmark comparison
rows." → It's a **developer A/B harness duplicating the individual controls**, gated to
square-distribution dev modes. **Remove from player settings** (relocate to Developer→Diagnostics
only if you want to keep the benchmark capability). Verdict: KILL.

## 5. Unified-surface design (modes = chips)
Target: the Territory category's subsection chips become a STABLE set that never changes with the
active render mode. Render-mode *content* is selected by the chip, not by what's actively rendering.
- Kill the per-mode swap (§2): `isSectionVisible` filters by tier only; delete
  `TERRITORY_MODE_SECTION_*`/`activeTerritoryModeSectionId`; unify `settingsSearch` rules.
- Collapse block C's per-module style cards into block D (single style-card system).
- Promote the render-mode selector out of the always-on "System" header into its own chip so it
  doesn't orphan above the styles content.
- Convert every section body's markup into `data-subsection-id`-tagged groups so
  `applySubsectionFilter` fully gates (no orphan blocks). Add a `>1` guard to the subsection row.
- Bound subsections: split long bodies; merge single-item ones.

## 6. Territory tuning sub-components (dup + dead)
- **`TerritoryGeometrySourceTuning` — DEAD.** `normalizePerimeterFieldGeometrySource()` always
  returns `'power_voronoi_0319'`; the `<select>` has ONE option. No-op frozen control. DELETE.
- **Finish block (GPU Blur / Blur affects borders / Border Chaikin = `METABALL_BLUR*`/
  `METABALL_CHAIKIN_PASSES`) is DEAD for cell-grid + perimeter families** — those keys are read
  ONLY by `renderers/MetaballRenderer.ts`; in cell-grid/perimeter they appear only in recompile-
  fingerprint arrays. `TerritorySurfaceStyleTuning.showFinishSection` defaults TRUE so it renders
  dead for perimeter/cell-grid (inconsistently across its 5 mount sites). Gate Finish to metaball only.
- **Cell-paint/border keys duplicated across 3 components:** `CELL_GRID_CELL_SHAPE/INSET/CORNER`,
  `CELL_GRID_INWARD_OFFSET_PX`, `CELL_GRID_BORDER_MODE/BLEND/CHAIKIN_PASSES`,
  `CELL_GRID_EDGE_SMOOTHING_PASSES/EDGE_TRIM_PX` appear in BOTH `CellGridTuning` AND
  `TerritorySurfaceStyleTuning`; `TerritoryPhaseFieldSettings` adds a 3rd copy of the SLA widgets
  + a 3rd `currentBorderMode/Blend` resolver. For phase_field the host mounts `CellGridTuning`
  TWICE (direct + via TerritoryPhaseFieldSettings) → same control 2-3×. Pick ONE home per key.
- **In-file double render:** `CellGridTuning` renders `CELL_GRID_BORDER_CHAIKIN_PASSES`/
  `EDGE_SMOOTHING_PASSES`/`EDGE_TRIM_PX` twice (grid-edge branch L861/876/892 vs ember branch
  L906/921/936). Collapse.
- **`GridGradientTuning` has NO chips** (flat ~26 controls) + orphan top control "Shader Neighbor
  Mode" (L85) above the first heading. Its Saturation/Lightness/Alpha write the SHARED
  `TERRITORY_SURFACE_*` keys (editing GG silently moves the shared SLA). Needs chips.
- **`TerritoryTransitionTuning`** writes GAME_CONFIG WITHOUT `bumpTerritoryVisualConfig` (others do)
  — staleness risk; lone Burst-Basis would be a single-item chip.
- Chip-widget inconsistency: `CellGridTuning` uses `PaxHudSegmentedControl`; `PerimeterFieldTuning`
  uses a `PaxHudButton` group — pick one.

## 7. Cross-category findings (all other ControlsSection-*)
**Same config-key in multiple panels (genuine conflicts):**
- `ORBIT_DENSITY` — Ships "Ships Per Ring" (0.5–4) vs Travel "Orbit Density" (1–4 mult). One consumer.
- `ARROW_LENGTH_FRACTION` — Visuals "Arrow Length" (%) vs Ships "Arrow Length" (fraction).
- `AGGRESSOR_ADVANTAGE` — Economy "Defense Multiplier" (inverse) vs Battle "Aggressor Advantage" (direct).
- Many timing/anim keys (SETTLE_DURATION_MS, ARRIVAL_SPREAD, DEPART_JITTER_MS, TRAVEL_DURATION_MULT,
  ATTACK_SURGE_*, SURGE_PULSE_DURATION_MS, CONQUEST_*_MS, ARROW_SPEED/STAGGER/SPIRAL) are editable
  BOTH in their domain section AND via the ANIM_SLIDERS / Timing anim-lock system.

**Dead / never-rendered / orphan:**
- Timing "End Settle" never renders (`TERRITORY_TRANSITION_SETTLE_PCT` missing from ANIM_SLIDERS).
- `SliderRow.svelte` — unused wrapper (no importer among sections).
- `PerimeterFieldDiagnosticsControls.svelte` — orphaned (live panel is `...Panel.svelte`).
- `CONQUEST_SURGE_RADIUS` — in PANEL_CONFIG_MAP, surfaced nowhere.
- Dev/bridge-gated dead-in-prod: PerfScenarioRunner (`!benchReady`), SettingsDumpDiagnosticsControls (`!devMode`).
- Controls with NO settingConfigKey (invisible to search/dump/theme-persist, but functional):
  Diagnostics overlay/ruler/recorder toggles; Visuals Lane Width/Opacity/Shadow rows.

**Chip-gating / structure:**
- **`CategoryThemeBar` renders ABOVE the first chip in ALL 14 sections** — the universal "orphan
  block above the chips." DECISION NEEDED: make it part of the chip frame, or formally exempt it
  (it's a per-category preset toolbar, not section content). Recommend: exempt it as fixed category
  chrome (it's not a tuning control) but visually anchor it so it doesn't read as content.
- Single-item chips: Logging "Renderer Traces"; Conquest "Animation Mode".
- Over-long: Ships (~1284 lines, 12 chips, Order Arrows ~18 / Star Labels ~20); Audio (~14 sound
  cards, near-identical conquest/non-conquest markup → one card component); Diagnostics
  "mode-diagnostics" (~330 lines of read-only telemetry).
- FrontierFx has no chips (single card) and renders as a single "switch mode" sentence in most modes.
- Diagnostics + Visuals already use real `data-subsection-id` sections — the model to copy.

**Diagnostics-not-separated-from-tuning:** Logging (whole panel is diag, own top-level category);
PerfScenarioRunner; SettingsDumpDiagnosticsControls; TerritoryEngineTraceDiagnostics;
PerimeterFieldDiagnosticsControls; Diagnostics "mode-diagnostics" buries 2 real toggles under
hundreds of read-only lines.

## 8. Plumbing (settingsDefs / panelSync) — [pending agent 5]

## 9. Execution plan (calibrated to one-shot + no live verify)
**Principle:** maximize value, minimize blind risk. Verified, reversible per-phase commits.
- **P1 — Audit doc (this).** Complete.
- **P2 — Render harness** (`/dev` route) + baseline screenshots of the territory sections (the
  tractable ones — they take `panel`+`updatePanel`+`view`). Heavier sections (Audio/Diagnostics
  needing audioManager/stores) get svelte-check + careful edits, not full harness shots.
- **P3 — Territory & Render (flagship, "Render first"):** unify render modes into always-present
  chips (kill the per-mode swap in `isSectionVisible` + the parallel `settingsSearch` rules);
  collapse style cards block C→D; kill `{#if false}` + `showRendererModule`/`showSystemModule` +
  dead scaffolding + dead `TerritoryGeometrySourceTuning` import; **kill Preset Rows**; gate Finish
  to metaball; de-dup CellGridTuning↔TerritorySurfaceStyleTuning cell-paint; give GridGradientTuning
  chips; total chip-gating via `data-subsection-id`; `>1` subsection guard. Harness-verify each.
- **P4 — Cross-category SAFE fixes (all categories):** delete dead components/controls (SliderRow,
  PerimeterFieldDiagnosticsControls orphan, Timing End Settle, CONQUEST_SURGE_RADIUS,
  TerritoryGeometrySourceTuning); merge single-item chips; resolve the same-key conflicts (one
  canonical surface per key); `>1` subsection guard everywhere; CategoryThemeBar orphan decision.
- **P5 — Larger restructures (Ships/Audio/Diagnostics chip-splitting, ANIM dual-surface policy):**
  these are high-value but high-risk blind; do the ones I can verify, and for any I cannot safely
  verify, implement to best-judgment + flag precisely in the report for your visual confirm —
  never leave a section broken.
- **P6 — Verify** (svelte-check 0 + cellGrid/settings tests + harness shots), remove harness,
  finalize doc + board, completion report.
