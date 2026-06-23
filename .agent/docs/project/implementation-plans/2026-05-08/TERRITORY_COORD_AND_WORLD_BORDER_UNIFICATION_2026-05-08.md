# Territory rendering — coordinate-contract and world-border unification

Date: 2026-05-08
Scope: Fix Phase Field misalignment, Phase Field/Phase Edges/Ember world borders, and the fill-vs-border seam mismatch on local `master`.
Status: Plan. Many steps need user verification in the running app — `please verify` after each phase.

> **2026-06-23 update (opus-territory):** Phase 1+2 LANDED for **`grid_gradient` only** — that mode post-dates this plan (added in the 2026-05-16 shader_field rewrite) and was the reported "territory slides off the starmap on resize/devtools/centerAndFit" bug. GG was migrated to the map-space `(0,0)` contract Phase Field already uses (container `(0,0)`; `stars`/`geometry` map-space, no `localizePresentationGeometry`; `world = 0,0,GAME_WIDTH,GAME_HEIGHT`), and `updateTerritoryViewportFrame` (the §3 mode-unaware "second writer") is now mode-aware: it writes `(0,0)` for `metaball_grid_phase_field` + `grid_gradient`, frame-min otherwise — which also resolves §3 for Phase Field itself. The remaining presentation-local families (`metaball_grid`, `metaball_grid_phase_edges`, `metaball_grid_ember_lattice`, `perimeter_field`, legacy) are **still on the presentation-local contract** and await the same migration (Phases 1-2 for them, then 3-6). Pending GG visual sign-off.

## Terminology

Two coordinate spaces are referenced throughout this document. The repo recently retired the term "canonical" (see commit `bdbdd08d5 refactor(territory): replace canonical live terminology`). This plan uses the in-code terminology only.

- **Map-space** — the same coordinate space stars, ships, lanes, and labels use. A star whose `star.x = 1200` literally sits at `x = 1200` here. The map rectangle is `(0, 0) → (GAME_WIDTH, GAME_HEIGHT)`. Most of the game already operates in map-space.
- **Presentation-local space** — a shifted version of map-space used by some territory families. If `frame.minX = -300`, every star x is shifted by `-(-300) = +300` before being handed to the family; `voronoiContainer` is placed at `(frame.minX, frame.minY)` so the result lands back on the starmap visually. The family's drawing coordinates and the rest of the game's coordinates differ by `(frame.minX, frame.minY)`.

| Quantity | Map-space (recommended target) | Presentation-local (today, some families) |
|---|---|---|
| Star at world `(1200, 800)` | family sees `(1200, 800)` | family sees `(1500, 1100)` if `frame.minX=−300, minY=−300` |
| Map rect | `(0, 0) → (GAME_WIDTH, GAME_HEIGHT)` | `(0, 0) → (frame.width, frame.height)` |
| `voronoiContainer.position` | `(0, 0)` | `(frame.minX, frame.minY)` |
| `world.width` passed to family | `GAME_WIDTH` | `frame.width` (≥ map width, sized to viewport) |

## 1. Symptoms (ground truth, from user)

1. Phase Field territory surface is right and slightly down of where it should be on map init. It snaps to the correct position the moment the viewport changes (settings panel, devtools, resize).
2. Phase Field fills are not properly rounded/smoothed to align with their borders.
3. Phase Field world/map borders are not rectangular — territorially rounded — and edges are *almost straight, nearly aligned* but not quite at the map rectangle.
4. Phase Edges and Ember have lost world borders entirely on `master`.

## 2. Prior attempts and what we already learned

Documented in `.agent/docs/project/post-mortems/2026-05-04_phase-field-coordinate-contract-misdiagnosis.md`. Summary so we don't repeat them:

- **Attempt A** — forced all "shared family" modes to use `worldMinX = 0, worldMinY = 0` while the parent `voronoiContainer` was still at `(frame.minX, frame.minY)`. Broke Phase Edges / Ember world borders because those modes had been built against the presentation-local contract with `worldMinX/Y = frame.minX/Y`. Reverted in `dc2483e11 fix: restore local territory family origin and stop mode auto-open`.
- **Attempt B** — split the contract by mode and called it done (current `master`):
  - Phase Field receives map-space stars/geometry, `worldWidth/Height = GAME_WIDTH/GAME_HEIGHT`, container forced to `(0,0)` in its case.
  - Phase Edges / Ember / Metaball Grid / Perimeter Field receive presentation-local stars/geometry, `worldMinX/Y = frame.minX/Y`, container at `(frame.minX, frame.minY)`.
  - Documented in `158d2baf6 docs: record phase field contract misdiagnosis`.
- **Attempt C** — quick reversion of the Phase Edges terminal-fallback seam. Rejected because the unit continuity test failed.

The post-mortem ends with a preventive rule we will follow:

> Before changing a shared render-family adapter:
> 1. Identify the source-of-truth branch for each affected mode.
> 2. Write down the exact input contract: stars space, geometry space, world rect space, container origin, stable/prev-frame space.
> 3. Only then patch the adapter.
> Do not assume sibling territory modes share a coordinate model just because they live in the same runtime surface.

## 3. The new angle this plan introduces

Every prior attempt operated on the **input contract** (`worldMinX/Y`, localized vs map-space stars, geometry localization). None of them touched the **second writer of `voronoiContainer.position`**.

`updateTerritoryViewportFrame()` (`GameCanvas.svelte` ~3903–3922) is invoked from `handleResize` and `centerAndFit`. It unconditionally writes:

```
voronoiContainer.x = territoryWorldMinX
voronoiContainer.y = territoryWorldMinY
```

It is **not aware of `activeTerritoryMode`**. With Phase Field active:

- Phase Field's `case` block writes `voronoiContainer.position = (0, 0)` — required by its map-space drawing contract.
- Init / resize / `centerAndFit` then runs `updateTerritoryViewportFrame()` and overrides the container back to `(territoryWorldMinX, territoryWorldMinY)`.
- Phase Field has already drawn assuming `(0, 0)`. The territory layer ends up rigidly offset from stars/lanes/ships by `(territoryWorldMinX, territoryWorldMinY)`.
- Opening settings or devtools changes `app.screen.*` → `territoryPresentationFrameKey` changes → presentation signature changes → Phase Field's `run()` re-executes → container snapped back to `(0, 0)` → looks correct.

That precisely matches "wrong on init, healed by settings/devtools". The earlier fixes were never going to address it because they did not touch `updateTerritoryViewportFrame()`, the resize-driven container writer.

## 4. Root-cause map

### 4.1 Two coexisting territory coordinate-space contracts

`renderFrame` runs both contracts under one queue (current `master`):

- **Presentation-local contract**: `metaball_grid`, `metaball_grid_phase_edges`, `metaball_grid_ember_lattice`, `perimeter_field`. Stars and geometry shifted by `−frame.minX/minY`. `world.minX/Y = frame.minX/Y`, `world.width/height = frame.width/height`. `voronoiContainer.position = (frame.minX, frame.minY)`.
- **Map-space contract**: `metaball_grid_phase_field` only. Stars/geometry untouched. `world.width/height = GAME_WIDTH/GAME_HEIGHT`, `world.minX/Y` defaulted to `0`. Container reset to `(0, 0)` per case.

This split is documented in-code at `GameCanvas.svelte` ~5340–5360.

### 4.2 The container-position lifecycle bug

Captured in §3 above. Two writers of `voronoiContainer.position` disagree, and the one driven by `handleResize` / `centerAndFit` ignores the active mode.

### 4.3 Stable / prev-frame cache

`syncLiveRenderFamilyStableFrame` and `getTransitionDiagnosticPrevFrame` (`GameCanvas.svelte` ~2745–2848) store `params.geometry` (map-space) and rebuild a fallback prev-geometry using `GAME_WIDTH/GAME_HEIGHT`. Presentation-local families re-localize at the family-input site; Phase Field consumes raw. The cache itself is map-space and the families bridge per mode. Two minor inconsistencies:

- `getTransitionDiagnosticPrevFrame` is gated on `transitionDiagnosticCaptureEnabled` for non-Phase-Field modes but is unconditional for Phase Field (~5969).
- `freezeDuringActiveTransition: true` is set on `syncLiveRenderFamilyStableFrame` for Phase Edges/Ember but not for `metaball_grid` or Phase Field.

These do not cause the drift but are inconsistent and should be tightened.

### 4.4 World borders — three pipelines, no single truth

Inside `MetaballGridPhaseFieldFamily.update`, world borders are drawn by one of two paths chosen by `useConstraintAlignedCenterlineBorders` (~1819):

```
useConstraintAlignedCenterlineBorders =
    borderEnabled &&
    borderMode === 'territory_edge' &&
    borderBlend &&
    borderWidth > 0 &&
    borderAlpha > 0
```

- **True** → `drawConstraintAlignedTerritoryBorderOverlay` walks `geometry.displayFrontierPolylines` and `geometry.displayWorldBorderPolylines` from `buildDisplayGeometryFromResolvedRegions` (resolved-region ring → segment classification → chained display polylines, `appliedMarginPx`-aware). Rectilinear-ish, possibly slightly inset.
- **False** → `drawBorderOverlay` paints **grid cells**. Boundary cells get `boundaryCornerR` rounding. World boundary segments get the rounded corner-radius treatment, producing the "territorially rounded" world border the user is seeing.

Phase Edges (`MetaballGridPhaseEdgesFamily.ts`) and Ember have **no `worldBorderPolylines` consumer at all** today (grep-confirmed, no match for `worldBorderPolylines` in `MetaballGridPhaseEdgesFamily.ts`). Their shader/frontier-band path silently drops world boundaries.

Architectural problem: there is **no single, identity-preserving "world border truth"** that all families read from. Three pipelines coexist:
- `geometry.worldBorderPolylines` (snapshot)
- `geometry.displayWorldBorderPolylines` (resolved/constraint-aligned, post-margin)
- per-cell grid boundary drawing (rounded grid cells)

### 4.5 Fill mask vs border stroke seam (Phase Field)

- Fill mask: `resolveFillMaskGeometry` insets `geometry.territoryRegions` by `inwardOffsetPx`, masks against a pattern texture (`drawGeometryFill`, `paintCellScene`).
- Border stroke (constraint-aligned path): `displayFrontierPolylines` + `displayWorldBorderPolylines`, with `appliedMarginPx` baked in.
- Border stroke (grid path): grid cells with `cellInsetPx`, `cellCornerPx`, `inwardOffsetPx`, `edgeTrimPx`, smoothing passes.

Fill geometry and border geometry are derived through different transforms, controlled by different knobs, sometimes smoothed with different operations. They will not co-register pixel-perfectly. That is the "fills not properly rounded/smoothed to align with borders" symptom.

## 5. Architectural target

One coordinate contract. One world-border truth. Border and fill mask derived from the same intermediate geometry. Container parenting that does not depend on which family ran last.

```
                ┌────────────────────────────────────┐
                │   ResolvedGeometrySnapshot         │
                │   - territoryRegions               │
                │   - frontierPolylines              │
                │   - worldBorderPolylines           │  ← single rect-aligned truth
                │   - displayWorldBorderPolylines    │  ← single display-aligned truth
                │   - shells / shellLoops            │
                │   (in MAP-SPACE)                   │
                └─────────────────┬──────────────────┘
                                  │
                ┌─────────────────▼──────────────────┐
                │ GameCanvas presents in map-space   │
                │ (single contract, applied uniformly)│
                │ voronoiContainer position is set   │
                │ in ONE place, mode-independent.    │
                └─────────────────┬──────────────────┘
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       │                          │                          │
       ▼                          ▼                          ▼
  Phase Field            Phase Edges / Ember         Metaball / Perimeter
  fill = inset regions   fill = shader               fill = …
  border = displayFrontier + displayWorldBorder      border = displayFrontier + displayWorldBorder
  (shared helper)        (shared helper)              (shared helper)
```

Borders for **all** families come from one helper that strokes `displayFrontierPolylines` + `displayWorldBorderPolylines`. Family-specific looks (rounding, glow, animation) layer on top of the shared structural truth — they never replace it.

## 6. Plan — phased, with commit boundaries

Phases land smallest, lowest-risk fixes first, each independently verifiable. Use `git ac "..."` after each phase. Do not push to `live`. Do not rebase.

### Phase 0 — Contract spec sheet + diagnostics

Goal: satisfy the post-mortem's preventive rule before touching any adapter, and make the bug visible numerically rather than by screenshot.

Deliverables:

1. A short doc, `.agent/docs/project/implementation-plans/2026-05-08/FAMILY_COORD_CONTRACTS_2026-05-08.md`, that records for each family case in `GameCanvas.svelte` (and for `updateTerritoryViewportFrame`):
   - stars space (map-space vs presentation-local)
   - geometry space (map-space vs presentation-local)
   - world rect (`world.minX/Y`, `world.width/height`)
   - container origin (where `voronoiContainer.position` is expected at draw time)
   - stable/prev-frame space (map-space, post-§4.3 alignment)
2. A dev-only diagnostic block (gated by an existing debug flag, no new user-facing toggle unless one already exists) logging per territory present:
   - `activeMode`
   - `voronoiContainer.position` before and after the per-mode case block
   - `territoryPresentationFrame` (minX, minY, w, h)
   - `GAME_WIDTH / GAME_HEIGHT`
   - geometry source id, geometry version
   - `worldBorderPolylines.length`, `displayWorldBorderPolylines.length`
   - `displayFrontierPolylines.length`
   - first/last point of `displayWorldBorderPolylines[0]` (to eyeball "almost straight")
3. A one-shot log in `updateTerritoryViewportFrame()` recording previous and new `voronoiContainer.position`, so resize-vs-present interleaving is visible.
4. A short note recording shader / scissor / texture-size dependencies on `world.width === frame.width`. This is the "no idea" item from the user — the agent owns it. Search target: `MetaballGridPhaseEdgesFamily.ts` shader uniforms (`world.width/height` references), `frontierDistanceFieldBuffers` sizing, any `RenderTexture` allocation keyed off `world.*`.

Constraints: use `log.canvas` / `log.state` / `log.error`; never `console.log` (per `pax-fluxia-agent-core`).

Acceptance: with logs on, switching to Phase Field on init reproduces the misalignment with a clear log signature `voronoiContainer=(minX,minY)` after a `(0,0)` write — `please verify`.

Commit: `wip(territory): add presentation/world-border diagnostics + contract spec sheet`.

### Phase 1 — Container parenting unified, mode-independent

**Decision needed**: parenting target is **map-space `(0, 0)`** (this plan's recommendation, matching `starsContainer` and the rest of the stage) **unless Phase 0's shader/scissor audit reveals a hard dependency on a viewport-aligned `world.width`**, in which case fall back to "always presentation-local" and migrate Phase Field across.

Steps (assuming map-space `(0, 0)`):

1. In `updateTerritoryViewportFrame()`: stop writing `voronoiContainer.x/y`. Keep the frame computation only as data — it is still used as `world` rect input where some families need the viewport-aligned frame.
2. In `metaball_grid_phase_field` case: remove the explicit `activeVoronoiContainer.x = 0` / `.y = 0` writes — they become no-ops.
3. In the per-mode common preamble (~5359–5360): remove `activeVoronoiContainer.x = territoryPresentationFrame.minX` / `.y = ...` writes.
4. Set `world.minX/Y = 0`, `world.width/height = GAME_WIDTH/GAME_HEIGHT` for every family in Phase 2; do not change inputs in Phase 1 yet (keep the change minimal).

Acceptance: `please verify` Phase Field is correctly placed on init, after settings open, after devtools open, after window resize, after orientation transpose. Other families may break temporarily — they are fixed in Phase 2. If they break unrecoverably, this is the signal to fall back to "always presentation-local".

Commit: `fix(territory): unify voronoiContainer parenting at stage origin`.

### Phase 2 — Single coordinate contract for family inputs

Goal: every family receives the same coordinate space; presentation-local localization is removed at the call sites.

Steps:

1. `localizeTerritoryPresentationStars` and `localizeResolvedGeometrySnapshot` become **no-ops at call sites** (preserve the helpers and tests, but stop calling them in `GameCanvas.svelte`).
2. Every family case passes:
   - `stars` (map-space)
   - `worldMinX: 0, worldMinY: 0`
   - `worldWidth: GAME_WIDTH, worldHeight: GAME_HEIGHT`
   - `geometry` (map-space resolved snapshot)
   - `prevGeometry` (map-space, from cache)
3. Update the doc comment at ~5340 to reflect the unified contract and reference the contract spec sheet from Phase 0.
4. Remove the per-family branch of localization in Phase Edges, Ember, Metaball Grid, Perimeter Field cases.

Trade-off / risk:
- Some families (notably the Phase Edges shader path) may have shader uniforms keyed off `world.width/height` assuming "viewport-aligned frame size" (which is `≥ GAME_WIDTH × GAME_HEIGHT`). Texture sizes / sampling rates may shift. Phase 0 task #4 will have already surfaced this.
- Mitigation: where a family genuinely needs a viewport-aligned frame (e.g. for screen-space sampling), pass the frame as a **separate** field on `RenderFamilyInput` (e.g. `presentationFrame`) instead of overloading `world.*`. Today, `world.*` is overloaded between "map rect" and "viewport-aligned frame" depending on family. That overloading is a deeper architectural smell and should be removed if Phase 0 confirms it.

Commit: `refactor(territory): single map-space contract for family inputs`.

Acceptance: `please verify` Phase Field still correct, Phase Edges / Ember still rendering fills (world borders restored in Phase 4), Metaball Grid and Perimeter Field unchanged.

### Phase 3 — Stable / prev-frame cache contract documented and tightened

Goal: kill the "is this map-space or presentation-local?" ambiguity in the cache and capture paths.

Steps:

1. Add a top-of-file comment in `GameCanvas.svelte` (and a reference in `RenderFamilyTypes.ts`) stating: "All `ResolvedGeometrySnapshot` values flowing through `RenderFamilyInput.geometry` and `prevGeometry` are in **map-space**, with `world = { minX: 0, minY: 0, width: GAME_WIDTH, height: GAME_HEIGHT }`. Families never receive viewport-aligned slices through `world` or `geometry`."
2. Make `getTransitionDiagnosticPrevFrame` gating consistent across modes (gate Phase Field on `transitionDiagnosticCaptureEnabled` like the others, OR gate all on the same predicate). The previously rejected reversion of the Phase Edges terminal fallback hit a unit continuity test — keep that test passing; do not change capture timing without re-running it.
3. Make `syncLiveRenderFamilyStableFrame({ freezeDuringActiveTransition })` consistent across modes. Decide one rule: freeze during transition for all families, or none. Prefer the existing Phase Edges / Ember rule (freeze) and apply to Metaball Grid and Phase Field. This keeps prev-geometry stable while a transition is animating, which is what diagnostics expect.

Commit: `refactor(territory): document and align stable/prev frame cache contract`.

### Phase 4 — Single world-border truth, consumed by every family

Goal: world borders draw from `geometry.displayWorldBorderPolylines` for every family. Phase Field stops using grid-cell rounding for the world boundary. Phase Edges and Ember regain world borders.

Steps:

1. Add a shared helper, `drawSharedTerritoryBorderOverlay(graphics, geometry, ownerColorIdx, opts)`, ideally extracted from the existing `drawConstraintAlignedTerritoryBorderOverlay` body in `MetaballGridPhaseFieldFamily.ts` and moved to `src/lib/territory/families/borders/`. It takes the resolved geometry plus per-family color/alpha/width and strokes `displayFrontierPolylines` + `displayWorldBorderPolylines`.
2. **Phase Field**: always call this helper for world borders, regardless of `useConstraintAlignedCenterlineBorders`. The grid-cell `drawBorderOverlay` becomes responsible only for the **inter-cell** look (per_cell mode) or **territory_edge without blend**, and never for world boundary segments. Concretely: split the existing `drawBorderOverlay` so it skips boundary segments when `cell.role !== 'native'`, and let the shared helper own those.
3. **Phase Edges**: add a call to the shared helper after the shader frontier band, using its own border color/alpha/width tunables. World borders re-appear without disturbing the shader path.
4. **Ember**: same treatment as Phase Edges (it already extends `MetaballGridPhaseEdgesFamily` shape — likely a single edit).
5. **Metaball Grid** and **Perimeter Field**: they already have working borders; route them through the shared helper as a follow-up only — do not regress them in this phase.

Acceptance:
- Phase Field world borders are straight, axis-aligned, and align to the map rectangle (`(0, 0) → (GAME_WIDTH, GAME_HEIGHT)`) — `please verify`.
- Phase Edges and Ember show world borders again — `please verify`.
- Inter-territory borders inside Phase Field still respect their existing rounding/smoothing knobs.

Commit: `fix(territory): unify world-border truth across families`.

### Phase 5 — World-border geometry actually reaches the map rectangle

Goal: address the "almost straight, almost aligned" residual in `displayWorldBorderPolylines`.

Steps:

1. Verify which generator the active path uses (`PERIMETER_FIELD_GEOMETRY_SOURCE`):
   - Live settings show `power_voronoi_0319`, which uses `extractAllWorldBoundaryEdges` (corner-crossing edges captured). Confirm at runtime via the Phase 0 logs.
   - If any code path still routes through legacy `extractWorldBorderPolylines` (same-side endpoints), corner-crossing edges drop and the resulting world boundary appears slightly cut at corners. Replace with the 0319 stage.
2. Audit `buildDisplayGeometryFromResolvedRegions` in `resolveConstraintAlignedTerritoryGeometry.ts`:
   - `appliedMarginPx` and `minDisplayLengthPx` may be silently shaving tiny segments at the world rectangle's corners, producing "almost aligned". Decide explicit semantics: world segments are NEVER trimmed by `appliedMarginPx`. Inter-owner segments may be.
   - If world segments still look off, snap world-segment endpoints to the world rect (`x ∈ {0, GAME_WIDTH}` or `y ∈ {0, GAME_HEIGHT}`) when within an epsilon, then chain.
3. If a snap epsilon is required, add a tunable through `settingsDefs` per the `game-tuning-no-magic-numbers` rule (e.g. `TERRITORY_WORLD_BORDER_RECTILINEAR_SNAP_EPS_PX`, default ~0.5 px). Do NOT introduce magic numbers in the renderer.

Acceptance: `please verify` world borders lie exactly on the visible map rectangle and meet inter-territory frontiers cleanly.

Commit: `fix(territory): world borders snap to map rectangle`.

### Phase 6 — Fill mask and border stroke share derivation (Phase Field)

Goal: fill stops "missing" its border on either side of the seam.

Steps:

1. Audit Phase Field's fill mask: `resolveFillMaskGeometry` insets by `inwardOffsetPx`; pattern texture is masked by these inset regions (`drawGeometryFill`).
2. Audit Phase Field's border stroke (constraint-aligned path): `displayFrontierPolylines` are built from full-resolution region rings, not from inset rings. So fill is inset, border is on the original ring.
3. Pick one offset model:
   - Either fill is NOT inset by `inwardOffsetPx` (border lands on fill edge), OR border is shifted inward by the same `inwardOffsetPx` (border lands on inset fill edge).
   - The correct user-visible behavior is: border centerline coincides with the visual edge of the fill. Match the fill inset by either:
     - Building a parallel-offset of `displayFrontierPolylines` / `displayWorldBorderPolylines` by the same `inwardOffsetPx` (toward the owner side for inter-owner edges, toward the world for world edges). Per-segment owner identity is already in resolved geometry.
     - Or: stroke the boundary of the inset territory regions used for the fill mask, centered on the resulting edge.
4. Same offset semantics apply when the grid-cell border mode is active: today it uses `nativeInset` vs `boundaryInset` to compute different sizes; reconcile with the inset used to build the fill mask so the seam is consistent.
5. Smoothing: settle on **one** smoothing pipeline for fill region rings AND border polylines. Today Chaikin passes appear in border code (`borderChaikinPasses`, `sharedEdgeSmoothingPasses`) but fill regions inherit smoothing from upstream `chaikinSmoothPolyline`. If they disagree by even one pass, fills and borders won't sit on the same curve. Make the fill mask geometry consume the same smoothed polylines; do not double-smooth.

Acceptance: `please verify` Phase Field fills hug their borders within visible perception across border modes (`per_cell`, `territory_edge`, with and without `borderBlend`).

Commit: `fix(territory): align Phase Field fill mask with border stroke geometry`.

### Phase 7 — Acceptance + cleanup

Steps:

1. Re-run the Phase Edges terminal-fallback unit continuity test that previously rejected a fix — it should still pass since we are not touching its terminal seam logic.
2. Add a minimal smoke test: build a `ResolvedGeometrySnapshot` with two owners and a known world rect, route it through each family case in a node-friendly entry point, and assert that the world border polylines drawn (or the shared helper's output) lie on the map rect within an epsilon.
3. Update `FEATURE_STATUS.md` and write a session note under `.agent/docs/project/sessions/notes/SESSION_2026-05-08.md` summarizing what changed and what was verified.
4. Remove the Phase 0 dev-only diagnostic logs (or gate them behind an existing debug toggle) so production traces don't fill with per-frame deltas.

Commit: `chore(territory): finalize coord/world-border unification, docs and tests`.

## 7. Why this fixes the four symptoms

| Symptom | Phase that fixes it | Why |
|---|---|---|
| Phase Field offset on init, healed by settings/devtools | Phase 1 + 2 | `voronoiContainer` no longer fights with `updateTerritoryViewportFrame()`; both writers and the family contract agree on `(0, 0)`. The frame-key change that "healed" it before is no longer required to re-snap position. |
| Phase Field fills not aligned with borders | Phase 6 | Fill mask and border stroke derive from the same offset/smoothing pipeline. |
| Phase Field world borders rounded / "almost rectangular" | Phase 4 + 5 | Borders always come from `displayWorldBorderPolylines`, snapped to the map rectangle. Grid-cell rounding never owns world boundary segments. |
| Phase Edges / Ember lost world borders | Phase 4 | Both families call the shared world-border helper. |

## 8. Decisions and unknowns

1. Parenting target — **map-space `(0, 0)` recommended** (Phase 0 audit may force a switch to "always presentation-local" if a shader hard-depends on viewport-aligned `world.*`).
2. Whether to retire `localizeResolvedGeometrySnapshot` / `localizeTerritoryPresentationStars` entirely after Phase 2 makes them no-op at call sites. Default: leave the helpers and their tests in place, dead code is fine until we are confident.
3. `RenderFamilyInput.world` overload between "map rect" and "viewport frame" — Phase 0 task #4 decides whether we add a `presentationFrame` field; defer the refactor to a follow-up commit if not strictly required.

## 9. Constraints honored

- Bun-only (`bun install`, `bun run dev`, `bunx`); PowerShell (no `&&` chaining).
- `git ac "..."` per phase; never push to `live`; never `--amend` after commit.
- No `console.log`; use `log.canvas` / `log.state` / `log.error`.
- No new magic numbers in renderer/sim code; tuning values go through `GAME_CONFIG` + `settingsDefs` per the `game-tuning-no-magic-numbers` rule.
- No browser subagent. Each phase ends with a `please verify` because user-app observation is ground truth.
- No removal of user-facing controls tied to `GAME_CONFIG`.
- Documentation homes respected: this plan in `.agent/docs/project/implementation-plans/2026-05-08/`, session note under `.agent/docs/project/sessions/notes/`.

## 10. Out of scope

- Migrating Metaball Grid and Perimeter Field to the shared border helper (Phase 4 step 5 is optional follow-up).
- Performance work on `localizeResolvedGeometrySnapshot` cache (becomes dead code after Phase 2).
- Refactoring `RenderFamilyInput.world` to remove the "map rect vs viewport frame" overload — only do it if Phase 0 reveals a shader actually depends on the frame size, otherwise defer.
