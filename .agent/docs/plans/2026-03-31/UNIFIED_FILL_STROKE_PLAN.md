# Batch 3/4/6: Save-Load Redesign + Restart Fix + Main Menu Preview

Addresses B-54, B-57, B-58, B-59, B-60, F-168.

---

## Proposed Changes

### A — Audio Fix (B-60)

#### [MODIFY] audioManager.svelte.ts
- Catch `NotSupportedError` silently in `play()` — no crash, no log in production mode.
- Mark missing sound files as disabled after first 404, skip future attempts.

---

### B — Restart Render Clear (B-57)

#### [MODIFY] GameCanvas.svelte
- React to `gameStore.sessionId` increment (already happens on `startGame()`).
- On change, clear territory graphics layer (`graphics.clear()` on fill + border containers).

---

### C — Shared Thumbnail Utility (DRY)

#### [NEW] `src/lib/utils/mapThumbnail.ts`
```ts
generateMapThumbnail(stars, connections, options?): string  // returns data URL
```
Used by: Save Map dialog, Save Game dialog, Main Menu random map preview.

---

### D — Save System Redesign (B-58, B-59)

**Two distinct types:**

```ts
// Topology only — no game state
interface MapDefinition {
  metadata: { name, createdAt, version }
  stars: { id, x, y, starType, ownerId (faction), activeShips (=STARTING_SHIPS) }[]
  connections: { sourceId, targetId, distance }[]
}

// In-progress snapshot
interface SavedGame {
  id: string
  name: string           // txtgen phrase + ' ' + 'yyyy-mm-dd'
  createdAt: string
  tick: number
  mapName: string        // named reference (may be 'unsaved')
  mapSnapshot: MapDefinition  // full copy in case named map is missing
  stars: { id, ownerId, activeShips, damagedShips, targetId }[]
  thumbnail?: string     // data URL from generateMapThumbnail()
}
```

#### [MODIFY] gameStore.svelte.ts
- **`exportMapTopology()`** — topology only: positions, connections, star types, ships reset to `STARTING_SHIPS`, no orders.
- **`saveCurrentMap(name)`** → calls `exportMapTopology()`. Clean map save.
- **`saveCurrentGame(name)`** (new) → full snapshot as `SavedGame`, persisted to `pax_savedGames` localStorage key + filesystem via `/__games` endpoint (parallel to existing `/__maps`).
- **`loadSavedGame(game: SavedGame)`** (new) → restore tick, ships, ownership, orders; uses `mapSnapshot` as fallback if named map not found.

#### [MODIFY] GameContainer.svelte
- "Save Map" → topology only, shows thumbnail.
- "Save Game" (new button) → full snapshot, auto-name via txtgen + `yyyy-mm-dd` (editable).

#### Load Game dialog (B-59)
- Two tabs: **Maps** / **Games**.
- Games tab: each card shows thumbnail + name + date + tick #.
- For games: two action buttons — **Resume** (full restore) and **Fresh Start** (load map only).
- **File Import** — `<input type="file" accept=".json">` that accepts either type.

---

### E — Main Menu Random Map Preview (F-168)

#### [MODIFY] MainMenu.svelte
- In the Random map setup section, add a live **map preview thumbnail** using `generateMapThumbnail()`.
- **Reshuffle** button regenerates the map preview (calls `generateMap()` with current settings, renders thumbnail).
- Preview updates automatically when player count or star count settings change.
- On "Start Game", the pre-generated map is passed as `pendingSavedMap` so the exact previewed layout is used.

---

### F — Fix Territory Generation Performance Lag (Renderer)

#### [MODIFY] powerVoronoiTerritoryGeometryGenerator.ts
- **Root Cause**: The `enclaveMap` (which dictates holes for territory fills) was generated against the `mergedRaw` (unsmoothed, pre-chain) geometry, but the PIXI presentation layer blindly applied those indices to `mergedTerritories` (smoothed, chain-walked geometry). This index mismatch combined randomly intersecting exterior paths into holes, causing PIXI's `earcut.js` triangulator to fail and regress into an O(N^2) lag state (1.7s per frame).
- **Fix**: Move `detectEnclaves()` to Stage 9, operating strictly on the finalized `mergedTerritories` so that polygon boundaries are exact and indices map perfectly to what the renderer draws.

---

### G — Fix Transition Rendering Shatter (Renderer)

#### [MODIFY] OptimalTransportBorderTransition.ts
- **Root Cause**: The canonical transition mode (DY4) completely broke polygon loop integrity during transitions. `resamplePolygon` generates an array of $N$ distinct points (e.g., 64). However, `alignPolygon` erroneously assumed the array had a duplicated closing vertex (like legacy boundaries), subtracting 1 from the length, dropping the final vertex `target[63]`, and explicitly duplicating `result[0]` to the end. This caused every animated shell to have a massive gap/crossed-edge connecting index 62 to index 0, resulting in "shattered regions" visually.
- **Fix**: Rewrote `alignPolygon` to correctly iterate over the full `N` length of the resampled geometry arrays, removing the explicit `N-1` truncation and vertex duplication.

---

### H — Fix Canonical-Clean Transition Accumulation Shatter (Presentation)

#### [MODIFY] PixiFillPresenter.ts / PixiBorderPresenter.ts
- **Root Cause**: The `FrontierMorphFillMode` used in "Canonical-Clean" transitions emitted 50+ individual polygons per frame. However, the `PixiFillPresenter` called `graphics.poly()` and `graphics.fill()` without calling `graphics.beginPath()` to isolate the shapes. In PixiJS v8, `poly()` appends to the current path; without `beginPath`, it drew invisible lines connecting the end of one region to the start of the next region across the map. `fill()` then triggered `earcut` to triangulate the massive, self-intersecting, completely tangled UNION of all polygons drawn so far. This caused the 300ms+ lag spikes and the "shattered gaps" the user observed visually.
- **Fix**: Added `this.graphics.beginPath();` immediately before `this.graphics.poly(...)` to ensure each region is rendered as an isolated polygon.

---

### I — Unified Fill+Stroke Transition Architecture (Architecture Overhaul)

The user mandated replacing the independent fill and border transition pipelines with a unified geometry approach where stroke and fill are performed simultaneously on the exact same geometry to guarantee no divergence or "shattering".

#### [MODIFY] `PresentationContracts.ts`
- Enhance `FillDrawCommand` with `strokeWidth?: number`, `strokeColor?: number`, and `strokeAlpha?: number`. 
- This allows a single draw command to define the entire presentation of a territory shape.

#### [MODIFY] `FillDrawCommandBuilder.ts`
- Populate the new `strokeWidth` and `strokeAlpha` properties on `FillDrawCommand` using `tunables.borderWidth` and `tunables.borderAlpha`.

#### [MODIFY] `PixiFillPresenter.ts`
- Update the `present` loop: after `graphics.fill()`, immediately call `graphics.stroke({ width: command.strokeWidth, color: command.strokeColor ?? color, alpha: command.strokeAlpha })` if `strokeWidth` is provided.

#### [MODIFY] `TransitionLayerCoordinator.ts`
- Remove all execution paths related to `activeBorderPlan`, `planBorderTransition`, and `BORDER_TRANSITION_MODE_BY_ID`. 
- Hardcode `borderFrame.frontiers = []` so `PixiBorderPresenter` receives nothing and is naturally phased out. 
- The entire transition is now driven solely by the Fill Transition Mode (e.g. `FrontierMorphFillMode`), which outputs the authoritative closed-loop geometry.

#### [MODIFY] `ControlsSection-Territory.svelte`
- Remove the `BORDER_TRANSITION_OPTIONS` dropdown from the UI since it is now obsolete. The border animates implicitly with the fill geometry.

---

## Verification Plan

1. `bun run build` — no TS errors.
2. Save map mid-game → open saved map → ships at starting count, no orders.
3. Save game mid-game → reload → "Resume" restores state; "Fresh Start" resets ships.
4. File import a `.json` → loads correctly.
5. Main Menu: change star count → thumbnail updates; Reshuffle → new layout.
6. Start game from Main Menu preview → identical layout renders in-game.
7. Restart while paused → territory fills clear immediately.
8. No `NotSupportedError` in console.
