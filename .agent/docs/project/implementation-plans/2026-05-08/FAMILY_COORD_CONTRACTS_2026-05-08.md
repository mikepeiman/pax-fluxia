# Family coordinate contracts — current state

Date: 2026-05-08
Scope: Document the exact coordinate contract each render family currently uses on local `master`, before any adapter edits in Phase 1+. This satisfies the preventive rule from `.agent/docs/project/post-mortems/2026-05-04_phase-field-coordinate-contract-misdiagnosis.md`:

> Before changing a shared render-family adapter, identify the source-of-truth branch for each affected mode and write down the exact input contract: stars space, geometry space, world rect space, container origin, stable/prev-frame space.

## 1. Two coordinate spaces

| Space | Definition | Used by today |
|---|---|---|
| **Map-space** | Same coordinate space as `starsContainer`, `connectionGraphics`, ships, labels. Map rect is `(0, 0) → (GAME_WIDTH, GAME_HEIGHT)`. A star whose `star.x = 1200` sits at `x = 1200`. | `metaball_grid_phase_field` only |
| **Presentation-local** | Stars and geometry shifted by `−frame.minX, −frame.minY`. Map-rect-equivalent is `(0, 0) → (frame.width, frame.height)` where `frame ≥ map`. `voronoiContainer` is then placed at `(frame.minX, frame.minY)` so the result lands back on the starmap. | All other render-family modes and the legacy `pixel`/`graph`/`contour`/`power_voronoi_runtime`/`territory_runtime` paths |

`territoryPresentationFrame` is computed by `resolveCenteredViewportFrame()` in `worldRect.ts` and is always at least as large as the map rect. Source: `GameCanvas.svelte` ~3903–3922.

## 2. `voronoiContainer.position` writers

There are **two writers** of `voronoiContainer.x/y`. They are not coordinated.

| Writer | Location | Value written | Trigger |
|---|---|---|---|
| Per-mode case in territory presenter | `GameCanvas.svelte` ~5359–5360 (preamble) and ~5949–5950 (Phase Field override) | preamble: `(territoryPresentationFrame.minX, .minY)`. Phase Field case: `(0, 0)` | Every territory present (queued) |
| Resize / recenter | `GameCanvas.svelte` `updateTerritoryViewportFrame()` ~3919–3922 | `(territoryWorldMinX, territoryWorldMinY)` | `handleResize`, `centerAndFit`, orientation change |

Mode-aware writers live in the per-mode case. The resize writer is **not aware of `activeTerritoryMode`** — it always writes the presentation-local minimum. With Phase Field active, this overrides the `(0, 0)` Phase Field requires, until the next territory present runs and rewrites the container.

This is the suspected root cause of "Phase Field is offset on init, healed by opening settings/devtools" — see plan `TERRITORY_COORD_AND_WORLD_BORDER_UNIFICATION_2026-05-08.md` §3.

## 3. Per-family contract on current `master`

Source: `GameCanvas.svelte` `renderFrame` per-mode `case` blocks. `frame` = `territoryPresentationFrame`. `geometry` = `readFamilyGeometry()` (always map-space, see §4).

| Mode | Stars input | Geometry input | World rect | Container at draw time | Stable-frame cache |
|---|---|---|---|---|---|
| `metaball` (~5618) | `territoryPresentationStars` (presentation-local) | `localizePresentationGeometry(geometry)` (presentation-local) | `minX = frame.minX, minY = frame.minY, width = frame.width, height = frame.height` | `(frame.minX, frame.minY)` from preamble | stores map-space `geometry` |
| `metaball_grid` (~5696) | `territoryPresentationStars` | `localizePresentationGeometry(geometry)` | `frame` mins + frame size | `(frame.minX, frame.minY)` | map-space |
| `metaball_grid_phase_edges` (~5778) | `territoryPresentationStars` | `localizePresentationGeometry(geometry)` | `frame` mins + frame size | `(frame.minX, frame.minY)` | map-space, `freezeDuringActiveTransition: true` |
| `metaball_grid_ember_lattice` (~5862) | `territoryPresentationStars` | `localizePresentationGeometry(geometry)` | `frame` mins + frame size | `(frame.minX, frame.minY)` | map-space, `freezeDuringActiveTransition: true` |
| `metaball_grid_phase_field` (~5948) | **`stars`** (map-space) | `geometry` (map-space) | **`worldMinX/Y` defaulted to `0` by `buildRenderFamilyInput`**, `width = GAME_WIDTH, height = GAME_HEIGHT` | **forced `(0, 0)`** in case body | map-space |
| `perimeter_field` (~6025) | `territoryPresentationStars` | `localizePresentationGeometry(geometry)` | `frame` mins + frame size | `(frame.minX, frame.minY)` | map-space |
| Legacy `pixel` / `graph` / `contour` / `power_voronoi_runtime` / `territory_runtime` | `territoryPresentationStars` | n/a (legacy modules) | `width = frame.width, height = frame.height` | `(frame.minX, frame.minY)` | n/a |

Container preamble: `GameCanvas.svelte` ~5359 unconditionally sets `activeVoronoiContainer.x = frame.minX, .y = frame.minY`. The Phase Field case at ~5949 overrides this back to `(0, 0)`.

## 4. Stable / prev-frame cache contract

`syncLiveRenderFamilyStableFrame` (~2745) stores `params.geometry` directly. Across all callers, `params.geometry = readFamilyGeometry()`, which is map-space. So the cache itself holds **map-space** snapshots.

`getTransitionDiagnosticPrevFrame` (~2789) returns map-space geometry from the cache or rebuilds a map-space fallback using `GAME_WIDTH/GAME_HEIGHT` (~2840).

Per-family bridging at the input site:

- Presentation-local families pass `geometry: localizePresentationGeometry(geometry)` and `prevGeometry: localizePresentationGeometry(diagnosticPrevFrame?.geometry ?? null)`. Localization happens at the seam.
- Phase Field passes raw `geometry` and raw `diagnosticPrevFrame?.geometry`. No localization.

**Two minor inconsistencies** noted but not fixed in Phase 0:

1. `getTransitionDiagnosticPrevFrame` is gated on `transitionDiagnosticCaptureEnabled` for non-Phase-Field modes (e.g. ~5637, ~5715, ~5797), but is **unconditional** for Phase Field (~5969).
2. `syncLiveRenderFamilyStableFrame({ freezeDuringActiveTransition: true })` is used by Phase Edges and Ember (~5848, ~5934) but **not** by `metaball_grid` (~5759), `metaball` (~5677), or Phase Field (~6008).

Phase 3 of the plan tightens these.

## 5. Shader / scissor / texture-size audit (the "no idea" item)

Survey for anything that hard-depends on `world.width === frame.width` or `world.minX === frame.minX`.

### `MetaballGridPhaseFieldFamily.ts` (today: map-space)

- `ensureTextures(input.world.width, input.world.height)` at ~2061, ~2282. Allocates `RenderTexture` sized to `world.*`. Today receives `GAME_WIDTH, GAME_HEIGHT`.
- `buildSessionKey` (~292) keys cache by `${input.world.width}x${input.world.height}`.
- After unification: still receives `GAME_WIDTH, GAME_HEIGHT`. **No change**.

### `MetaballGridPhaseEdgesFamily.ts` (today: presentation-local)

- `world.minX/Y/width/height` flow into mesh and shader-bound construction (~1437–1441, ~1593–1597, ~2653–2656, ~2714–2717).
- `worldWidth: input.world.width, worldHeight: input.world.height` passed to internal builders (~1486, ~1538). Used for sample-field sizing.
- `buildSessionKey` (~336) keys cache by `${world.minX},${world.minY}:${world.width}x${world.height}`.
- After unification: receives `0, 0, GAME_WIDTH, GAME_HEIGHT` instead of `frame.minX, frame.minY, frame.width, frame.height`. Frame ≥ map, so map-space sampling rectangle is **smaller-or-equal**. Cache key changes once and invalidates. **No correctness break expected.**

### `MetaballGridFamily.ts` (today: presentation-local)

- Same shape as Phase Edges. `world.minX/Y/width/height` at ~1304–1307, ~1583–1586, ~1644–1647.
- `worldWidth/Height` passed to internal builders at ~1355–1356.
- `buildSessionKey` (~394) keys cache same way.
- After unification: same as Phase Edges. **No correctness break expected.**

### `buildGridClassification.ts` (used by all grid families)

- Reads `world.minX/Y/width/height` (~421–459) to lay out the grid origin and column/row counts.
- Pure function of those inputs; no external assumption about whether they are frame-aligned or map-aligned.
- After unification: **No correctness break expected.** Grid origin changes (it now origins at map `(0, 0)` instead of `(frame.minX, frame.minY)`), which is exactly what we want for visual alignment with stars.

### `MetaballGridPhaseEdgesFamily.ts` shader uniforms

- The shader bits (`frontierFillBitGl`, `frontierBandBitGl`) use `frontierUniforms` containing per-frontier data, not world-rect uniforms. Searched for `world` references inside `frontierUniforms` and shader sources — none found.
- `RenderTexture` allocations of size `1 × 1` at ~1165, ~1241 are placeholder textures, not world-sized.
- After unification: **No shader uniform changes required.**

### Summary

No path requires a viewport-aligned frame as `world.*`. All families consume whatever `world.*` they are given as authoritative bounds and key their caches on it. Switching from presentation-local to map-space:

- Invalidates per-family caches once (acceptable).
- Shrinks shader / texture allocation rectangles slightly (`map ≤ frame`).
- Aligns family drawing coordinates with `starsContainer`, `connectionGraphics`, etc.

Recommendation: proceed with **map-space `(0, 0)` parenting** target for Phase 1 (matches the user's selected option).

## 6. Target contract for Phase 2 (post-unification, for reference)

| Concern | Target value |
|---|---|
| Stars input | `stars` (map-space) for every family |
| Geometry input | `geometry` (map-space) for every family — no `localizePresentationGeometry` calls |
| `world.minX, world.minY` | `0, 0` for every family |
| `world.width, world.height` | `GAME_WIDTH, GAME_HEIGHT` for every family |
| `voronoiContainer.position` | `(0, 0)`, written **only** by stage setup; `updateTerritoryViewportFrame` no longer writes it; per-mode cases no longer write it |
| Stable / prev-frame cache | unchanged (already map-space); document the contract; align gating and freeze flags across modes (Phase 3) |

If Phase 2 reveals a hidden frame-size dependency that this audit missed, fall back to "always presentation-local for everyone (including Phase Field)" instead of map-space. The shape of the fix doesn't change, only the chosen target.

## 7. Open observations (not action items for Phase 0)

- The `world` field on `RenderFamilyInput` is overloaded today: in some families it means "map rect" (Phase Field) and in others "viewport-aligned frame" (everyone else). After Phase 2 it always means "map rect". If a family later genuinely needs a viewport-aligned frame for screen-space sampling, add a separate `presentationFrame` field rather than re-overloading `world`.
- `localizeTerritoryPresentationStars` and `localizeResolvedGeometrySnapshot` become dead at call sites after Phase 2. The helpers and their tests stay in place for now (per user decision); a later cleanup pass can remove them.
- Legacy modes (`pixel`, `graph`, `contour`, `power_voronoi_runtime`, `territory_runtime`) all consume `territoryPresentationStars` and frame-sized worlds today. Phase 1+2 will move them to map-space alongside the render families. Their internal renderers do not appear to bake frame-size assumptions, but they are out of scope for the focused Phase Field / Phase Edges / Ember acceptance.
