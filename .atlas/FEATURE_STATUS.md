# Pax Fluxia — Feature Status & Bug Tracker

## Known Bugs

| ID | Description | Status | Date |
|----|-------------|--------|------|
| B-22 | Touch targets not located correctly on mobile after transpose — input hit testing uses non-transposed star coordinates while rendering uses transposed. Impossible to play. | ✅ Fixed | 2026-03-01 |
| B-23 | Full-map view (recenter button) doesn't account for bottom UI — map is obscured by speed controls | ✅ Fixed | 2026-03-01 |
| B-24 | Territory lag on mobile — conquering stars takes 1-4 ticks before territory visually updates | 🔴 Open | 2026-03-01 |
| B-25 | Damaged ship orbit rings still lerp/ease on orientation shift — fxOrchestrator.reset() not clearing positions | 🔴 Open | 2026-03-01 |
| B-26 | Map centering used 0-origin world bounds creating asymmetric dead space; not centered on content | ✅ Fixed | 2026-03-02 |
| B-27 | Pixel territory renderer shows nothing on mobile | ✅ Fixed | 2026-03-02 |
| B-28 | Lane territory renderer broken — territories oversized, don't accurately capture star boundaries | 🔴 Open | 2026-03-02 |
| B-29 | Portrait mode wastes vertical/horizontal space — map generation doesn't maximize viewport | 🔴 Open | 2026-03-02 |
| B-30 | All 6 territory renderers called every frame at 60fps regardless of which is active — wasteful architecture | ✅ Fixed | 2026-03-03 |
| B-31 | `app.resize is not a function` crash during early PIXI initialization in handleResize | ✅ Fixed | 2026-03-03 |

## Planned Features

| ID | Feature | Status | Priority | Date |
|----|---------|--------|----------|------|
| F-120 | Mobile layout refactor to CSS Grid (portrait: 3-row, landscape: statusbar left column) | ✅ Done | High | 2026-03-01 |
| F-121 | Gear+hamburger consolidated into SpeedControls bar ☰ button | ✅ Done | Medium | 2026-03-01 |
| F-122 | StatusBar.svelte replaces TopBar for in-game view | ✅ Done | Medium | 2026-03-01 |
| F-123 | StatusBar: minified leaderboard + game stats (ships/tick) | ✅ Done | Medium | 2026-03-01 |
| F-124 | Star cycling navigation: `◂ ⌖ ▸` widget with StarNav.svelte | ✅ Done | Medium | 2026-03-01 |
| F-125 | Player-color swatch in StatusBar | ✅ Done | Medium | 2026-03-01 |
| F-126 | Smooth camera transitions for star-cycle and center-fit (lerp/ease animation) | ✅ Done | High | 2026-03-02 |
| F-127 | "Stretch Map To Fit" toggle — rerender map to maximize viewport usage | ✅ Done | High | 2026-03-02 |
| F-128 | Main Menu full redesign — two-column layout, compact mobile, top quick-start | 🔄 In Progress | Medium | 2026-03-02 |
| F-129 | Canvas debug infrastructure (debug borders, world bounds rect, log.canvas category) | ✅ Done | Low | 2026-03-02 |
| F-130 | Audio volume persistence — remember per-sound volume adjustments in localStorage | ✅ Done | Critical | 2026-03-02 |
| F-131 | Per-sound file selector — dropdown to pick which audio file for each sound event | ✅ Done | Critical | 2026-03-02 |
| F-132 | Audio theming — save/load audio presets, designate default themes | ✅ Done | Critical | 2026-03-02 |
| F-133 | New territory renderer — consider a fresh renderer approach; current pixel/lane renderers have cross-platform issues | 🟡 Idea | Medium | 2026-03-02 |
| F-104 | Contour territory renderer (marching squares + vector polygons) — corner rounding + periphery hull | 🔴 Shelved | Medium | 2026-03-02 |
| F-134 | Restart + Quit buttons in desktop sidebar menu | ✅ Done | High | 2026-03-02 |
| F-135 | Territory rendering: equalize angles at border intersections (contour-based) — implemented v3 but marching squares geometry fundamentally too noisy | 🔴 Shelved | Medium | 2026-03-02 |
| F-136 | Minimum shared-boundary section length (slider) — prevent tiny border segments | 🟡 Idea | Medium | 2026-03-02 |
| F-137 | Periphery coverage: same-owner stars at map edge should have territory begin on the *inside* of connecting lane and fully cover the outside | 🔄 In Progress | Medium | 2026-03-03 |
| F-138 | Modified Voronoi territories: merge same-owner d3-delaunay cells into unified polygons, Bézier arc smoothing at sharp vertices, Chaikin smoothing | 🔄 In Progress | High | 2026-03-03 |
| F-138v2 | Power Voronoi V2: d3-weighted-voronoi power diagram with star margin as weight. Phase 2 done (disconnect virtual stars + tuning panel). | ✅ Phase 2 Done | High | 2026-03-03 |
| F-139 | Minimum star boundary margin: territory boundaries must be ≥5 orbit radii from any star center — prevents orbit ring clipping | 🔄 In Progress | High | 2026-03-03 |
| F-140 | Topographic territory renderer: if gap-free Voronoi pipeline is efficient enough, layer multiple offset passes to create terrain-like elevation contour effect reminiscent of topo maps | 🟡 Idea | Medium | 2026-03-03 |
| F-141 | Distinct conquest travel duration/speed slider — currently conflated with transfer travel speed, needs separate control | 🟡 Idea | Medium | 2026-03-03 |
| F-142 | Strength-blended shared borders: overlapping territory borders with alpha blending reflecting relative player strength. Gradient concentrated by proximity to nearest star (opposition radiating outward). Stronger player → more color influence, higher saturation, higher lightness | ✅ Done | High | 2026-03-03 |
| F-143 | Animated territory transitions: two Boundary Modes — **Segment** (edge-level lerp) and **Smooth** (flubber polygon morph). Fills render target state instantly (no flicker). UI toggle in Power Voronoi Visual Settings panel. Config: `TERRITORY_BOUNDARY_MODE`, `TERRITORY_TRANSITION_MS` | 🔄 Testing | Medium | 2026-03-03 |
| F-144 | Distance Field territory renderer V1 (CPU): graph-metric Dijkstra + lane projection + per-frame rasterization. **Shelved** — CPU rasterization too slow (0fps). V2 planned: GPU pipeline via PIXI.Shader + RenderTexture per Deep Technical Guidance. | 🔴 V1 Shelved / V2 Planned | High | 2026-03-03 |

## Known Regressions

| ID | Description | Status | Date |
|----|-------------|--------|------|
| R-1 | Territory rendering (all modes) regressed during mobile layout work | 🔴 Active | 2026-03-02 |
| R-2 | Audio settings (conquest sounds, toggles) not persisting across reload | 🔴 Active | 2026-03-02 |

## Known Bugs (F-138 Territory Pipeline)

| ID | Description | Status | Date |
|----|-------------|--------|------|
| B-32 | Territory gaps between different-owner polygons after pipeline stages — shared Voronoi vertices modified independently per polygon, breaking tiling property | 🔴 Open | 2026-03-03 |
| B-33 | Corridor spacing < ~45px destabilizes merge step — too many virtual sites cause polygon fragmentation | 🟡 Deferred | 2026-03-03 |
| B-34 | Disconnect buffer vertex-pushing distorts polygon shapes unpredictably — needs topology-aware redesign | 🔴 Open | 2026-03-03 |
| B-35 | Vector borders (Pass 3) not rendering — PIXI v8 `extract.pixels()` is async (returns Promise), drawVectorBorders doesn't await it. Original `221241c` code has non-async call, causing silent failure. Same regression as previous session. | 🔴 Open | 2026-03-05 |
| B-36 | Saved themes lost when localStorage cleared — themes only stored in LS, not persisted to disk. User-created data from intentional save actions MUST persist to file (see `common/resources/settings-themes/` for existing format) | 🔴 Open | 2026-03-06 |
| B-37 | Territory (fills+borders) offset from starmap — entire DF territory layer misaligned with star positions. Stars not centered in their territories. Borders+fills align with each other but NOT with starmap. | 🔴 Active | 2026-03-06 |

## Feature Ideas

| ID | Feature | Priority | Date |
|----|---------|----------|------|
| F-146 | File-based persistence for saved maps, themes, and settings — localStorage is ephemeral, user-created content (saved maps, custom themes, custom settings) should persist to local files. Themes already have a folder at `common/resources/settings-themes/` | High | 2026-03-05 |
| F-147 | Border "layers" mode — current neighbor-sampling borders show per-player layered borders (each side colored separately). Keep as optional setting alongside blended single-border mode | Medium | 2026-03-06 |
| F-148 | Default map loading — toggle+select in Main Menu to load a saved map by default instead of generating random. Persist preference. | High | 2026-03-06 |
| F-149 | Audio config integration — move audio settings (master vol, per-sound volumes, file selections, offsets, mute, separate conquest toggle) from standalone AudioManager into GAME_CONFIG + categoryThemes as `'audio'` category. Full theme export/import captures audio. | High | 2026-03-07 |
| F-150 | Power-weighted border colors — territory borders alpha/lightness weighted by ship count ratio. Player A (500 ships) vs Player B (100 ships) → border color weighted toward A with higher alpha and lightness. Requires accessing ship counts per-star during border rendering. | Medium | 2026-03-10 |
| F-151 | Junction overlap blending — where border lines overlap at junctions, they should be blended (not additive stacking). Requires compositing or pre-pass deduplication. | Medium | 2026-03-10 |


## 2026-03-12 Territory Engine Program Additions

### Known Regressions (PVV3 / Frontier)

| ID | Description | Status | Date |
|----|-------------|--------|------|
| R-3 | PVV3 interim state: frontiers are not unified, territory adjacency has visible mismatch, border visibility toggles inconsistently with settings/gameplay, and transition animation behavior is geometrically incorrect. | ?? Active | 2026-03-12 |

### Planned Features (Territory Engine)

| ID | Feature | Status | Priority | Date |
|----|---------|--------|----------|------|
| F-152 | Modular Territory Engine runtime with interchangeable static/dynamic/hybrid method registries and stage pipeline contracts. | ?? In Progress | Critical | 2026-03-12 |
| F-153 | Interactive territory computation step mode (stage-by-stage execution + trace payloads + manual advance token). | ?? In Progress | High | 2026-03-12 |
| F-154 | FG1-FG5 frontier geometry implementation program with shared canonical frontier truth for border/fill coincidence. | ?? In Progress | Critical | 2026-03-12 |
| F-155 | HY1-HY5 dynamic territory program for local delta updates, temporal coherence, and geometry-only transitions. | ?? In Progress | Critical | 2026-03-12 |
| F-156 | Territory method benchmarking harness with map-stress suite and mode-switch comparison reporting. | ?? Planned | High | 2026-03-12 |

### Progress Notes - 2026-03-12 (FG2 Epic)
- F-154 moved from planning into first implementation slice on branch `codex/territory-engine-epic-fg2-canonical`.
- Native FG2 stage pipeline now runs in territory engine (metric/world/seed/topology/geometry/loop/animation/render) with initial biased lane tie seeding.
- FG2 geometry no longer uses nearest-neighbor ordering; it now builds pair-topology graphs from star incidence and extracts edge-disjoint frontier chains/cycles.
- Trace mode now exposes both FG2 seeds and local topology links for step-by-step inspection.
- F-152 now includes a native stage-dispatch layer on branch `codex/territory-engine-epic-native-stage-dispatch`, removing the engine's direct dependency on FG2.
- F-154 branch `codex/territory-engine-epic-fg2-halfedge-closure` now promotes pair-topology graphs into explicit node/link graphs with `seed`, `junction`, and `boundary` node types.
- Open frontier ends now extend to world-edge boundary anchors, and geometry extraction walks that generalized graph to emit open or closed frontiers.
- Trace mode now reveals synthesized junction and boundary nodes, while topology summaries expose graph node, junction, and boundary-anchor counts for step inspection.

- F-154 in `PRISM-territory-work` now derives `ownerShells` from owner-exposed edges of the globally resolved FG2 arrangement and uses those shells as the native fill artifact.
- Loop diagnostics now include owner shell counts, hole counts, open shell-loop counts, and owner-shell graph counts for trace/debug review.
- The FG2 native renderer now paints shell-oriented owner fills before frontier strokes, creating a more meaningful demo checkpoint than raw owner-region candidate loops alone.
- F-155 has now started in `PRISM-territory-work` through owner-shell correspondence, contour-based shell playback interpolation, and animated shell-frame publication.
- Animation diagnostics now expose `displayedOwnerShells`, `displayedOwnerShellFrame`, transition progress, transition counts, and contour-distance metrics for trace/debug review.
- During active shell playback, displayed border presentation now uses animated shell contours instead of static target frontier polylines, reducing border/fill desynchronization during morphs.
