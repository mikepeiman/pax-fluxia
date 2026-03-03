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
| F-136 | Territory rendering: minimum shared-boundary section length (slider) — prevent tiny border segments | 🟡 Idea | Medium | 2026-03-02 |
| F-137 | Periphery coverage: same-owner stars at map edge should have territory begin on the *inside* of connecting lane and fully cover the outside | 🔄 In Progress | Medium | 2026-03-03 |
| F-138 | Modified Voronoi territories: merge same-owner d3-delaunay cells into unified polygons, Bézier arc smoothing at sharp vertices, Chaikin smoothing | 🔄 In Progress | High | 2026-03-03 |
| F-138v2 | Power Voronoi V2: d3-weighted-voronoi power diagram with star margin as weight. Phase 2 done (disconnect virtual stars + tuning panel). | ✅ Phase 2 Done | High | 2026-03-03 |
| F-139 | Minimum star boundary margin: territory boundaries must be ≥5 orbit radii from any star center — prevents orbit ring clipping | 🔄 In Progress | High | 2026-03-03 |
| F-140 | Topographic territory renderer: if gap-free Voronoi pipeline is efficient enough, layer multiple offset passes to create terrain-like elevation contour effect reminiscent of topo maps | 🟡 Idea | Medium | 2026-03-03 |
| F-141 | Distinct conquest travel duration/speed slider — currently conflated with transfer travel speed, needs separate control | 🟡 Idea | Medium | 2026-03-03 |
| F-142 | Strength-blended shared borders: overlapping territory borders with alpha blending reflecting relative player strength. Gradient concentrated by proximity to nearest star (opposition radiating outward). Stronger player → more color influence, higher saturation, higher lightness | 🔄 In Progress | High | 2026-03-03 |

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

