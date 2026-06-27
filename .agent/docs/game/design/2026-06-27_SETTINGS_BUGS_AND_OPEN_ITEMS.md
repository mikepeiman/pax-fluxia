# Settings bugs & open items — running ledger (2026-06-27)

User-reported issues + items held in context. Keep updated as they're fixed.

## 🔴 Active user-reported bugs (this batch)

1. **"Cell Grid Enabled" toggle does nothing.** ROOT-CAUSED. `CELL_GRID_ENABLED`
   is a master on/off that only gates the LEGACY bare `cell_grid` family
   (`CellGridFamily.ts:1715`). In Phase Edges / Ember / Field the DEDICATED family
   (`CellGridPhaseEdgesFamily.ts:2820`) computes `enabled = tunable || RENDER_MODE === this.id`
   — i.e. it INTENTIONALLY ignores the toggle so selecting the mode always renders
   (deliberate fix for f4bc81a93, which blanked the mode when the toggle was off).
   So in every dedicated mode the toggle is inert BY DESIGN. **Fix = UI**: don't
   expose "Cell Grid Enabled" in modes where it's a no-op (show only for legacy
   `cell_grid`), or remove it (you select a mode by picking it — a per-mode "enable"
   toggle is redundant). NOT wiring the gate (that would re-introduce the blank).
   Status: ROOT-CAUSED, UI fix pending (avoid blind deletion — confirm `cell_grid`
   mode's exposure first).

2. **"Phase Sampling" does nothing.** ROOT-CAUSED. `TERRITORY_FRONTIER_PHASE_SAMPLING`
   (nearest/linear) is `disabled` unless `canUseEmberFrontierTechnique() &&
   isShaderFrontierTechnique()` (`CellGridTuning.svelte:1014`) — it ONLY affects the
   shader-band smooth fill. Off that technique it's a disabled no-op; even on it, the
   nearest↔linear difference is a subtle crisp-vs-smoothed phase sample. So "does
   nothing" = you weren't on Frontier Technique = shader-band. The new toggle log
   confirms whether the write even fires. Status: ROOT-CAUSED (working as gated).

3. **🔥 Territory "Show Fill" STILL collapses the whole settings panel** (leaves a
   black empty panel). Long-standing, "dozens of passes." User demand: find the
   LISTENER — how does a fill toggle affect the MENU? Concurrent agent `opus-settings`
   has shipped collapse-guards (`befe5ab80` settings-shell grid row; `55f0dee1d`
   fallback section preference; `25b98fef9` TEMP ResizeObserver probe) but it
   PERSISTS. Status: OPEN — needs the actual trigger traced, not more guards.

4. **Menu doesn't remember last selections** — subsection chip resets every time;
   user must re-click. `opus-settings` `55f0dee1d` touched this; still broken.
   Status: OPEN.

5. **No console logs when using toggles** — ROOT-CAUSED + FIXED. The settings panel
   PAUSES the game; `setGamePaused(true)` (logger.ts) swaps the live
   `console.log/info/debug/warn` to no-ops AND the logger sink `cl` early-returns
   while paused — so EVERY category except `error` is muted while the panel is open.
   That muted both toggle logs AND `opus-settings`' height probe → why 2 agents
   couldn't trace the collapse. FIX: new pause-EXEMPT `log.ui` channel (uses the
   captured original console.log, like `error` uses console.error; default ON).
   Every territory + cell-grid toggle now logs via `log.ui` (ControlsSection-Territory
   `debouncedConfigUpdate`/`queueTopology*`, CellGridTuning `writeConfig`). The height
   probe + the `activeSectionId` fallback effect were re-channeled to `log.ui` so the
   collapse hunt finally surfaces. Status: FIXED (pending user seeing the logs).

## 🟠 Regression I caused (handled)

6. **Smooth fill broke in EDGES/EMBER/FIELD** — my FX-in-shader commit `1ca6e1424`
   had a GLSL error → the fill shader failed to compile → no smooth fill anywhere.
   REVERTED (`70bae0222`). Smooth fill restored. The setting that enables it:
   **Frontier Technique = "shader-band"** (`TERRITORY_FRONTIER_TECHNIQUE =
   'shader_frontier_band'` → recipe `geometryFamily='phase_band'` → `usesPhaseFill`).

## 🟡 Open engineering items held in context

7. **Frontier FX + smooth fill** (task #11): FX is per-cell (jagged); the smooth
   shader ignores it. Re-do FX IN the fill shader — but VERIFY GLSL compiles
   (runtime) before shipping (the revert above is why).
8. **Smooth cell-fill edges to match borders** (task #10): ROOT-CAUSED + EDGES/EMBER
   FIXED (`f181ac68d`). The smooth phase-surface fill that meets the border exists
   ONLY for `TERRITORY_FRONTIER_TECHNIQUE='shader_frontier_band'` (surface.ts recipe:
   `usesPhaseFill ⇔ geometryFamily 'phase_band'`; every other technique = raster
   scene-cell staircase). It lives ONLY in CellGridPhaseEdgesFamily (EDGES + EMBER,
   same family). The default was `'control'` so neither was smooth out of the box —
   EMBER only looked smooth from a manual, non-durable setting (the "regression").
   Flipped the default to shader-band (frontier/config.ts) → EDGES + EMBER smooth-by-
   default; only that family reads the technique so nothing else is touched; auto-
   falls back to control with no renderer / non-square; user choices persist.
   **FIELD (phase_field) STILL OPEN — different family, no phase-band path.**
   CellGridPhaseFieldFamily paints raster cells (`drawFilledGridCell`) MASKED by the
   smooth boundary geometry (`drawGeometryFill` of region rings), so its OUTER edge
   is already smooth + border-flush (resolveFillMaskGeometry no-op), but INTERNAL
   faction frontiers are cell-staircase and it has NO shader-band fill. Making FIELD
   fully smooth = real port of the phase-surface path into its family (riskier; its
   mask/texture/transition pipeline is complex) OR a design decision to keep FIELD's
   distinct field-of-cells identity. Pending user steer — NOT rushing a shader port
   (that's what broke smooth fill last time).
9. **World-border / fill-border alignment**: EDGES/FIELD not aligned; `appliedMarginPx`
   vertex displacement residual; Grid/Edges/Ember use ad-hoc `drawOuterPerimeterIntervals`
   instead of the shared geometry world border (Phase C).
10. **"Extent Beyond Map" tunable** — shipped + made searchable. Verify it moves
    fill+border together for geometry-truth modes.
11. **DY4 vs PVV4** — comparison delivered (subagent, UNVERIFIED). DY4's polyline-
    Bézier morph > PVV4's topology-vertex sampling. Verify before acting.
12. **PVV4 transition defects** (snap/overlap/gaps) — Lane B transition-v2 (the
    overnight `codex/territory-overnight-integration` branch has `pvFrontline` work).
13. **Image-comprehension rule** — shipped (`.agent/rules/image-comprehension-protocol.md`,
    AGENT.md RULE 0.4).
14. **Legacy `metaball` (CPU) mode** — keep/relocate/hide decision still open.

## Multi-agent note
`opus-settings` is concurrently active on the SAME settings files (panel-collapse,
section memory, value persistence, rail/panel layout). COORDINATE on the board
`.agent/intra-agent-coordination.md` before editing GameSettingsPanel to avoid
collisions (I already caused one bad revert this session by reverting their commit).
