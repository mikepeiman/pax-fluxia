---
date created: 2026-06-13
last updated: 2026-06-13
last updated by: AI
relevant prior docs:
  - .agent/docs/plans/2026-06-12/GRID_GRADIENT_PERFORMANCE_GEOMETRY_TOP10_PLAN_2026-06-12.md
  - .agent/docs/plans/2026-06-12/GRID_GRADIENT_PERFORMANCE_MAJOR_FIX_PLAN_2026-06-12.md
  - .agent/docs/sessions/2026-06-13/2026-06-13_RENDERING_CONSOLIDATION_9f22_dcc7_AUDIT.md
superseding docs:
---

# Grid Gradient Performance — Execution Plan (grounded in code on claude/grid-gradient-perf)

## Purpose (user's words)
"begin working on the rendering+perf issues on Grid Gradient first … major performance
improvements only, with no visual quality compromise."

## Working context
- Branch `claude/grid-gradient-perf`, worktree `.claude/worktrees/gg-perf`, based on
  `claude/worktree-consolidation` (the rendering integration lane).
- Grid Gradient source + its MAJOR_FIX perf work (worker plan build, typed raster classifier,
  steady owner-grid cache) are ALREADY present on this base.
- **Verified green baseline** (2026-06-13): `bun run check` = 0 errors / 1 pre-existing CSS
  warning; `bun run build` = success. Any regression I introduce is attributable from here.

## What the code actually does (traced, corrects the plan doc's framing)
1. **Config source** — `getRenderFamilyModeConfigSource(mode)` →
   `buildGridGradientRenderFamilyConfigSource()` spreads the whole `GAME_CONFIG` + geometry
   defaults + mode defaults into a NEW object on EVERY call. It is called several times per
   frame (GameCanvas.svelte ~2904, ~3092, ~4592, ~5358, ~6545, ~6554). This is the ~602ms
   whole-record self-time hot path. It only changes when territory settings change.
2. **Geometry** — `getCurrentRenderFamilyGeometry()` is ALREADY a keyed cache
   (`buildRenderFamilyGeometryCacheKey` over visual-epoch + world + geometry source/tunables +
   per-star id/owner/x/y + lanes). It returns the cached `ResolvedGeometrySnapshot` on a key
   hit. So geometry does NOT recompile every steady frame — the ~83ms `computeGeometry0319`
   spike is the legitimate cache MISS on conquest (key changes when an owner flips). The
   per-frame residual cost is building the key string itself (O(stars+lanes)).
3. **Invalidation signal** — `bumpTerritoryVisualConfig()` increments
   `GAME_CONFIG.__TERRITORY_VISUAL_EPOCH`; it is called from every territory settings path.
   The geometry cache already keys on `getTerritoryVisualEpoch()`, so it is a trusted signal.

## Execution order (re-prioritized by yield × confidence ÷ risk)

### Slice 1 — Memoize the render-family config source  ✅ implemented 2026-06-13
Cache `getRenderFamilyModeConfigSource` result by `(mode, __TERRITORY_VISUAL_EPOCH)`.
- Correctness: epoch bumps on every settings/theme change → cache invalidates → slider
  reactivity preserved (parity with the geometry cache that already trusts this epoch).
- Risk: low. Returns a stable shared ref within an epoch; consumers read `source.X`, the
  geometry builder receives it as read-only `configSource`.
- Verify: check + build green; user confirms Grid Gradient still renders and live-tunes.

### Slice 2 — Cheap, high-confidence wins (next)
- Numeric point/segment ids replacing string keys in `buildDirectedSegmentKeys` /
  `ringContainsPolyline` (~21ms self per compile + GC relief). Local, parity-testable.
- Cache-key build cost: when config-source ref is stable AND stars/lanes unchanged, short
  circuit `buildRenderFamilyGeometryCacheKey` (avoid the per-frame O(stars+lanes) string).

### Slice 3 — Instrumentation hygiene
- `measurePerf` (~2997ms self over 20s) defaults to a counter aggregator; gate
  `performance.mark/measure` + random-id user-timing behind an explicit capture flag, so later
  traces are trustworthy.

### Slice 4 — Conquest geometry spike (the real red-frame work)
- Move the `power_voronoi_0319` recompute (the cache-miss path) off the animation frame
  (worker pending/commit), keeping the committed geometry visible while the next compiles.
- Share one `constructFillsFromFrontierChain` / `executeChainWalk` output across fills +
  frontier map + repair validation inside `computeGeometry0319` (removes duplicate work).

### Slice 5 — Ship steady-state (largest whole-record cost, ~8.6s/20s)
- Precompute per-star orbit slot tables; skip unchanged particle tint writes; hide only the
  particle-pool delta when the active pool shrinks; reduce ParticleBuffer dirty work — without
  dropping glow/outline/fill/damage/travel visuals.

### Slice 6 — Grid Gradient worker payload + diagnostics
- Transfer typed arrays instead of cloning rich plan objects on worker.onmessage (~681ms);
  precompute role counts; avoid full-grid countRoles every update; throttle diagnostics store.

## Non-negotiable quality constraints (from the user, carried forward)
No spacing increase, no sampling reduction, no disabling features, no change to ownership or
geometry truth, borders stay vector/dot on the existing geometry. Optimizations must be
output-equivalent at accepted settings. "implemented; please verify" — never self-declared.
