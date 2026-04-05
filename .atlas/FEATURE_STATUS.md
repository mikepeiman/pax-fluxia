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
| B-43 | Canvas resize feedback loop — container height grows 6px/frame, map zooms/drifts off-viewport. Caused by corrupted localStorage/cache, not code. Fix: clear site data. Recurs intermittently. | ⚠️ Shelved | 2026-03-15 |
| B-47 | **Deferred orders broken for neutral stars** — Case 2b in GameCanvas gated deferred orders with `ownerId !== "neutral"`, so clicking own star → neutral → next star always fell to Case 2c (no order). Fixed to `!isLocalPlayerStar()`, covering both enemy AND neutral stars. | ✅ Fixed | 2026-03-17 |
| B-48 | **hitTestStar log spam** — logged on every pointer event call, including repeated same-target calls. Fixed with `lastHitStarId` tracker; logs only when result changes. | ✅ Fixed | 2026-03-17 |
| B-49 | **MP combat intermittently fails** — Attacks draw arrows but do not prosecute. Ticks, production, orders work. SP unaffected. Code identical between live/master. Suspected stale server process. Resolved on restart. | ⚠️ Intermittent | 2026-03-30 |
| B-50 | **Arrow appearance sliders missing from Map & Grid section** — sliders for order arrow head/shaft/alpha are not present in the expected settings section. | 🔴 Open | 2026-03-30 |
| B-51 | **Saved maps appear in Classic mode** — user-saved maps and classic maps are mixed together. Classics should be a separate, read-only list. | 🔴 Open | 2026-03-30 |
| B-52 | **No file load option in Load Game** — game settings Load Game has no actual file picker/import option. | 🔴 Open | 2026-03-30 |
| B-53 | **MP only starts with random map** — no option to select map type (classic, saved, debug) when creating a multiplayer room. | 🔴 Open | 2026-03-30 |
| B-54 | **Restart does not actually restart** — restart button/action fails to reset the game. Possibly related to AudioManager error: `NotSupportedError: The element has no supported sources.` | 🔴 Open | 2026-03-30 |
| B-55 | **Lane order arrowhead opacity doesn't match shaft** — arrowhead alpha differs from shaft alpha and is not independently adjustable. | 🔴 Open | 2026-03-30 |
| B-56 | **Damaged ship size ignores shipSize controls** — damaged ships do not obey the master/active ship size slider values. | ✅ Fixed | 2026-03-31 |
| B-57 | **Restart leaves territory fills behind when paused** — after SP restart while paused, old conquest territory fills persist until gameplay resumes. Renderer not cleared on `destroyGame()`. | ✅ Fixed | 2026-03-31 |
| B-58 | **"Save Map" actually saves game state** — split into `saveCurrentMap()` (topology-only) and `saveCurrentGame()` (full snapshot with txtgen yyyy-mm-dd name). Load Game has Resume vs Fresh-Start options. | ✅ Fixed | 2026-03-31 |
| B-59 | **No "Load Game" file import in settings** — the Load Game panel has no file picker for importing a saved game JSON. | 🔴 Open | 2026-03-31 |
| B-60 | **AudioManager NotSupportedError** — silenced `NotSupportedError` and `NotAllowedError` in `play()`. Added `disabledSounds` set to skip missing files and prevent console spam. | ✅ Fixed | 2026-03-31 |

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
| F-145 | Built-in filesystem themes: 5 curated + 3 hybrid composed themes, survives localStorage wipe. Themes embedded in `builtinThemes.ts`. | 🔄 In Progress | Medium | 2026-03-14 |
| F-146 | Reusable HSLA widget for territory fill & border color controls. Replaces 6× duplicated inline sliders. Compact Grid+Flex layout, responsive. | 🔄 In Progress | Medium | 2026-03-14 |
| F-147 | Built-in filesystem maps: embed maps via `import.meta.glob` (survive localStorage wipe). Import 8 classic Pax Galaxia `.txt` maps. Filesystem CRUD via Vite `/__maps` endpoint. Faction remap, neutral preservation, coordinate scaling. | ✅ Done | Medium | 2026-03-14 |
| F-149 | **Star System Appearance**: master slider (bound ratios), ownership ring, label widget (master font scale + line-height + inline toggle + per-part sizing), arrow appearance (head size/shaft width/alpha/length), hit zone radius, icon scale, orbit binding, classic map spacing. | ✅ Done | High | 2026-03-14 |
| F-150 | Classic map spacing factor — user controls star spacing multiplier when loading classic maps. | ✅ Done | Medium | 2026-03-14 |
| F-157 | **Main Menu map selection redesign**: replace 3 map cards (Random/Debug A/Debug B) with "Random \| Classic" two-column layout. Random settings left, classic map list right, shared settings below. | 🔄 In Progress | High | 2026-03-15 |
| F-158 | **One-page tutorial guide**: "How to Play" page covering objectives, star types, orders, conquest, AI, multiplayer. Accessible from main menu. | 🔄 In Progress | Medium | 2026-03-15 |
| F-159 | **One-page controls guide**: desktop + mobile controls reference. Accessible from main menu. | 🔄 In Progress | Medium | 2026-03-15 |
| F-160 | **Permanent public lobby + chat**: always-on chat room, random usernames, unique enforcement, online presence list, visit stats (24h/7d/30d). Server: ChatRoom.ts. Client: LobbyChat.svelte + chatStore. | 🔄 In Progress | High | 2026-03-15 |
| B-46 | **Overlapping icons top-right of main menu**: bg-picker and other floating icons overlap. Fix CSS positioning/z-index. | 🔄 In Progress | Low | 2026-03-15 |
| F-161 | **Classic maps in multiplayer**: Enable classic map selection in multiplayer lobbies. Server `initClassicMap()` with faction→sessionId remap + coordinate scaling. 🌐 MP play button in saved maps UI. | ✅ Done | Critical | 2026-03-15 |
| F-162 | **Geometry Source dropdown** (4th territory pillar): UI dropdown for selecting data engine (FG2 Seed Graph, PVV3 Power Voronoi, etc.). Part of four-concern territory architecture (D-81). | 🔄 Planned | High | 2026-03-16 |
| F-163 | **PVV3 geometry extraction as modular data engine**: Extract PVV3's `d3-weighted-voronoi` + merge pipeline into a standalone data engine that produces `CanonicalTerritoryData`, selectable alongside FG2. | 🔄 Planned | High | 2026-03-16 |
| F-164 | **Remove Basic/Advanced/Developer settings toggle** — show ALL control sections by default instead of gating behind complexity levels. | 🔴 Queued | Medium | 2026-03-30 |
| F-165 | **Custom Beehiiv mailing list signup** — replace iframe with custom Svelte form via `/api/subscribe` endpoint + Discord invite link. | ✅ Done | High | 2026-03-30 |
| F-166 | **Arrow outline option + triangular ownership pull** — add outline/stroke to order arrows; new style where the ownership ring deforms into a triangular point along the order lane. | 🟡 Idea | Medium | 2026-03-30 |
| F-167 | **Player toggles for star label elements** — individual toggles for each element of star labels (name, ship count, production, etc.). | 🔴 Queued | Medium | 2026-03-30 |
| F-168 | **Main Menu random map preview + reshuffle** — Live canvas thumbnail using real `generateMap()` via `gameStore.generateMapPreview()`. Reshuffle button generates new layouts. Auto-updates on settings changes. | ✅ Done | High | 2026-03-31 |
| F-169 | **PVV2 renderer revival** — bring PVV2 renderer into modern master and get it working with current architecture. | 🔄 Planned | High | 2026-03-30 |
| F-170 | **DX equal split tuning** — DX weight currently biases one intervening player; both interveners should split the gap equally. | 🔴 Queued | Medium | 2026-03-30 |
| F-171 | **Discord community link on landing page** — icon button linking to `https://discord.gg/yQu7X3UXv` in Hero section. | ✅ Done | High | 2026-03-30 |
| F-172 | **Random map generator enhancements** — UI toggles/sliders for neutral star generation, neutral starting ships, and special star distribution percentage. Star type colors mapped correctly in thumbnail preview. | ✅ Done | High | 2026-03-31 |

## Known Regressions

| ID | Description | Status | Date |
|----|-------------|--------|------|
| R-1 | Territory rendering (all modes) regressed during mobile layout work | 🔴 Active | 2026-03-02 |
| R-2 | Audio settings (conquest sounds, toggles) not persisting across reload | 🔴 Active | 2026-03-02 |
| R-3 | Segment-based transitions cause massive region movement and severe lag/stalls | 🔴 Active | 2026-03-30 |
| B-61 | **DY4 ghost fill on conquest** — shrinking copy of old territory fill appears overlaid on normal fill during conquest animation. Caused by alpha crossfade drawing overlapping prev+next fill polygons simultaneously onto same Graphics layer. See `PowerVoronoiRenderer_DY4.ts` lines 915–938 and 1271–1297. | 🔴 Active | 2026-04-04 |
| B-62 | **DY4 snap-vs-animate inconsistency** — some conquests animate smoothly, others snap instantly. `prevMergedTerritories`/`prevSharedPolylines` are null on first conquest after mode switch or fast consecutive conquests, causing transition start guards to fail. `PowerVoronoiRenderer_DY4.ts` lines 1366–1386. | 🔴 Active | 2026-04-04 |
| B-63 | **CLR territory flipping/rotating on conquest** — during conquest animation, territory regions flip or rotate. `ActiveFrontFillMode.ts` centroid-matching (lines 457–476) mismatches front chains when conquest significantly shifts map geometry. Also: `TOPOLOGY_PATH_ENABLED = false` in `TransitionLayerCoordinator.ts` disables unified topology sampling. | 🔴 Active | 2026-04-04 |


## Known Bugs (F-138 Territory Pipeline)

| ID | Description | Status | Date |
|----|-------------|--------|------|
| B-32 | Territory gaps between different-owner polygons after pipeline stages — shared Voronoi vertices modified independently per polygon, breaking tiling property | 🔴 Open | 2026-03-03 |
| B-33 | Corridor spacing < ~45px destabilizes merge step — too many virtual sites cause polygon fragmentation | 🟡 Deferred | 2026-03-03 |
| B-34 | Disconnect buffer vertex-pushing distorts polygon shapes unpredictably — needs topology-aware redesign | 🔴 Open | 2026-03-03 |
| B-35 | Vector borders (Pass 3) not rendering — PIXI v8 `extract.pixels()` is async (returns Promise), drawVectorBorders doesn't await it. Original `221241c` code has non-async call, causing silent failure. Same regression as previous session. | 🔴 Open | 2026-03-05 |
| B-36 | Saved themes lost when localStorage cleared — themes only stored in LS, not persisted to disk. User-created data from intentional save actions MUST persist to file (see `common/resources/settings-themes/` for existing format) | 🔴 Open | 2026-03-06 |
| B-37 | Territory (fills+borders) offset from starmap — entire DF territory layer misaligned with star positions. Stars not centered in their territories. Borders+fills align with each other but NOT with starmap. | 🔴 Active | 2026-03-06 |
| B-38 | PVV2 enclave fill bug: when an outer holding completely surrounds an inner opponent holding, the outer fill covers the inner holding entirely. Outer owner's territory color overwrites the enclave. PVV2 `mergeSameOwnerCells` produces correct polygon boundaries but fill rendering has no hole/enclave subtraction — `fillGraphics.poly()` draws solid fills without cutting enclosed opponent regions. Visible in Territory Engine → FG1/DY4 route. FG2/PVV3 already solved via `ownerShells` + classified hole loops + PIXI `cut()` (D-62). | 🔴 Active | 2026-03-14 |
| B-40 | Diagonal line render artifacts — caused by PIXI v8 not resetting path position between draw ops. Fix: added `beginPath()` before every circle/polygon draw in `StarRenderer.ts`. | ✅ Fixed | 2026-03-14 |
| B-42 | Territory border/fill misalignment — borders used Chaikin+Bézier smoothing but fills used straight edges. Initial fix applied `chaikinSmoothPolygon` to fills, but sub-pixel divergence remained due to PIXI interpolating `poly()` differently than `moveTo/lineTo`. **Definitive Fix:** Implemented mandated single-path fill+stroke architecture across PVV2 and Canonical V3 paths. Fills and borders are now drawn simultaneously on the exact same `beginPath()` sequence, mathematically guaranteeing zero divergence. | ✅ Fixed | 2026-03-17 |
| B-41 | MSR (Min Star Radius?) should default to 100 in every theme and default settings but currently does not. | 🔴 Open | 2026-03-14 |
| B-39 | Theme export uses selected preset name instead of user-given name — "export" button downloads JSON with the wrong `name` field | 🔴 Open | 2026-03-14 |
| B-43 | **Deferred orders broadly regressed** — user confirmed 2026-03-16 that deferred orders were broken. **User confirmed 2026-03-30: now working on master.** Regression fixed between B-47 (neutral star fix) and subsequent work. | ✅ Fixed | 2026-03-30 |
| B-44 | **DY4 Optimal Transport visually broken** — user confirmed 2026-03-16 that DY4 border animation has not rendered correctly. Caused by naive vertex index matching during `lerpPolygon` causing violently twisting geometry. **Fix:** Implemented `alignPolygon` to perform minimal transport / minimum distance vertex matching prior to interpolation in both PVV2 and Canonical `OptimalTransportBorderTransition.ts`. | ✅ Fixed | 2026-03-17 |
| B-49 | **Border transition mode 3 (DY4) double-border after conquest** — clean borders during transition, but immediately after, a slightly different border drawn on top leaves both rendered every frame. | 🔴 Active | 2026-03-18 |
| B-50 | **Border transition mode 2 (Rope) width change during conquest** — border width changes obviously during conquest transitions. | 🔴 Active | 2026-03-18 |
| B-51 | **Border transition mode 1 (Graphics Morph) unsatisfying transition + smoothing** — borders consistent but transition animation and steady-state smoothing need improvement. | 🔴 Active | 2026-03-18 |
| B-52 | **All three transition modes produce similar/identical VFX** — modes should provide distinct visual options, not duplicated results. Modes 3 and 4 now both route to GraphicsPathMorpher. | 🔴 Active | 2026-03-18 |
| B-53 | **Slider persistence: Conquest Animation Timing** — numeric value does not update when slider moves, and setting may not persist across reloads. ALL sliders must follow same idiomatic persistence+display pattern. | 🔴 Active | 2026-03-18 |
| B-54 | **Fill/border divergence: smoothing order inverted** — edges should be smoothed BEFORE assembly into regions, not after. Current pipeline assembles polygons first, then applies different smoothing to fills (Chaikin polygon) and borders (Chaikin polyline), causing mid-frontier sharp corners. | 🔴 Active | 2026-03-18 |
| B-55 | **Fills take 2 ticks to settle (dual geometry)** — fill partially morphs, settles, then 1-2 ticks later snaps to final position. Proves morph transition and static renderer use different geometry sources. | 🔴 Active | 2026-03-20 |
| B-56 | **Morph transition vertices teleport across map** — during morph, some segments/vertices jump from one player's territory to another, crossing the entire map. Likely region-to-region mismatching in `matchFillPolygons`. | 🔴 Active | 2026-03-20 |
| B-57 | **Vertex dots don't render while paused** — `DEBUG_MORPH_VERTICES` overlay not drawn when game is paused because `drawFrame` is not called. | 🔴 Active | 2026-03-20 |
| B-58 | **Double-filled enclaves persist (Geometry_0319)** — two-tone enclave fills still occurring with New-Frontiers-0319 mode despite enclave hole-cutting fix. | 🔴 Active | 2026-03-20 |
| B-59 | **10X slow-mo overrides custom timing** — slow-mo multiplies a hardcoded base instead of the user's current tick/animate duration settings. | 🔴 Active | 2026-03-20 |

## Feature Ideas

| ID | Feature | Priority | Date |
|----|---------|----------|------|
| F-146 | File-based persistence for saved maps, themes, and settings — localStorage is ephemeral, user-created content (saved maps, custom themes, custom settings) should persist to local files. Themes already have a folder at `common/resources/settings-themes/` | High | 2026-03-05 |
| F-147 | Border "layers" mode — current neighbor-sampling borders show per-player layered borders (each side colored separately). Keep as optional setting alongside blended single-border mode | Medium | 2026-03-06 |
| F-148 | Default map loading — toggle+select in Main Menu to load a saved map by default instead of generating random. Persist preference. | High | 2026-03-06 |
| F-149 | Audio config integration — move audio settings (master vol, per-sound volumes, file selections, offsets, mute, separate conquest toggle) from standalone AudioManager into GAME_CONFIG + categoryThemes as `'audio'` category. Full theme export/import captures audio. | High | 2026-03-07 |
| F-150 | Power-weighted border colors — territory borders alpha/lightness weighted by ship count ratio. Player A (500 ships) vs Player B (100 ships) → border color weighted toward A with higher alpha and lightness. Requires accessing ship counts per-star during border rendering. | Medium | 2026-03-10 |
| F-151 | Junction overlap blending — where border lines overlap at junctions, they should be blended (not additive stacking). Requires compositing or pre-pass deduplication. | Medium | 2026-03-10 |
| F-157 | MSR expansion — four enhancements to Minimum Star Radius: (1) Per-star dynamic MSR scaled by fleet strength via `log₂(ships/avgNeighborShips)`, (2) MSR gravity: minimum area threshold to eliminate micro-territory slivers, (3) MSR breathing room: visual clearance between frontier lines and star icons, (4) Contested MSR: shrink MSR for stars under siege proportional to ship loss. See `CONSTRAINT_ARCHITECTURE_ANALYSIS.md`. | Medium | 2026-03-16 |
| F-158 | Constraint architecture cleanup — delete CX (corridor virtual sites, replaced by analytical lane split), demote DX (disconnect separation) from metric-stage virtual sites to region-stage gap post-process. Keep MSR + lane-exclusivity. See `CONSTRAINT_ARCHITECTURE_ANALYSIS.md`. | High | 2026-03-16 |
| F-164 | **Player color badge in logs** — AIs and human players in console logs should display a clearly-visible circle badge in their color with initials (HP, A1, A2, …). Improves log readability during territory debugging. | Low | 2026-03-20 |

## 2026-03-12 Territory Engine Program Additions

### Known Regressions (PVV3 / Frontier)

| ID | Description | Status | Date |
|----|-------------|--------|------|
| R-3 | PVV3 interim state: frontiers are not unified, territory adjacency has visible mismatch, border visibility toggles inconsistently with settings/gameplay, and transition animation behavior is geometrically incorrect. | ✅ Fills fixed via FG2 canonical shells (`2f6234b`) | 2026-03-13 |
| B-44 | PVV3 borders only render for one frame when a setting changes, then vanish. Root cause: `GameCanvas` blanket-hides all `voronoiContainer` children every frame, but PVV3 only re-shows `borderGraphics` inside the full rebuild path (after the early-return check). | ✅ Fixed: re-show `borderGraphics` before early-return (`ad48d3e`) | 2026-03-15 |
| B-45 | Audio settings panel intermittently opens on page load in production, even after clearing all site data. Not consistently reproducible. Code defaults `showAudioSettings = $state(false)` in MainMenu — possible race condition or hydration artifact. | 🔍 Investigating | 2026-03-15 |

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
- FG2 now keeps owner-shell contours as the displayed border source even after playback settles, so static borders and static fills stay on the same geometry family whenever shell data exists.
- Static FG2 owner-shell fills now subtract classified hole loops via Pixi `cut()`, which is the first real enclave-preserving fill behavior in the shell renderer.
- Owner-shell frame snapshots and transitions now carry explicit hole-loop geometry, and shell fingerprints now react to hole-only changes instead of only shell outer-contour changes.
- Displayed interpolated shells now publish usable hole cutouts with previous/current fallback during playback; true hole-to-hole interpolation remains pending.
- F-155 now uses global non-conflicting shell correspondence per owner instead of greedy current-shell matching, reducing shell identity flicker during split, merge, and other topology-shift transitions.
- Hole playback inside a shell transition now also uses global non-conflicting correspondence, and diagnostics expose `ownerShellHoleTransitionCount` plus persisted, spawned, vanished, and contour-sample counts.
- Animated shell artifacts now sanitize interpolated hole loops against the displayed shell polygon, suppressing invalid negative cutout geometry before render use.
- F-155 now blends unmatched spawn/vanish transitions toward anchor-shaped contours and allows endpoint fallback for all transition kinds, reducing dropped holdings and brittle point-collapse motion.
- The Territory Trace Inspector now exposes a `Holding Transitions` section so split/merge anchoring, fallback counts, and per-transition contour metrics are visible without digging through raw artifacts.
- Verification remains green at the build level on `master`: filtered diagnostics for the modified files were clean, and `bun run build` succeeded. Direct unprivileged `check` paths still suffer from Bun remap and sandbox/esbuild noise in this environment.
