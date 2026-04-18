# Feature And Task Queue - 2026-04-17

## Completed Today

- Implemented shared authored-map foundations in `common/src/maps/`:
  - canonical schema/types
  - validators
  - import/export helpers
  - runtime map resolution
  - authored ruler measurement generation and resolution
- Wired authored map diagnostics into shared game state via `common/src/schema/GameState.ts`.
- Added fixture-map loading support through `pax-fluxia/vite.config.js` and shared manifest helpers.
- Migrated client map typing and classic-map parsing to the shared authored-map definition.
- Added developer map editor route at `pax-fluxia/src/routes/dev/map-editor/+page.svelte`.
- Added editor document store in `pax-fluxia/src/lib/editor/mapEditorStore.svelte.ts`:
  - save/load/export
  - autosave recovery
  - undo/redo
  - duplicate/mirror/template helpers
  - lane measurement generation
- Added editor canvas interactions in `pax-fluxia/src/lib/components/editor/MapEditorCanvas.svelte`.
- Routed dev gameplay to `pax-fluxia/src/routes/play/+page.svelte` so editor test-launch and MP host flows can enter the app directly.
- Enabled custom authored maps for multiplayer room creation and server runtime initialization.
- Added authored measurement rendering and visibility toggles in gameplay HUD/debug settings.
- Fixed map editor interaction and grid-authoring follow-up issues:
  - `structuredClone` now snapshots rune-backed map state before cloning, which unblocked star placement and source refresh
  - authored stars now persist `gridQ/gridR` and re-resolve against the active editor lattice on load
  - hex-size changes rescale grid-authored stars and editor geometry instead of leaving saved maps in stale screen coordinates
  - added 2-tile minimum star spacing validation and editor-side placement/move guards
  - added `Alt` drag move, `Shift` multi-select preservation during group moves, and `Delete` key removal
  - moved the inspector stack below the canvas to free horizontal board space
  - added group owner / ship editing controls in the selection inspector
- Added rotational symmetry helper for the map editor:
  - supports 2, 3, 4, 5, and 6-fold symmetry
  - rotates selected stars around board center
  - snaps mirrored copies back onto the editor hex lattice
  - skips occupied or spacing-invalid cells instead of forcing overlaps
- Improved lane authoring UX in the map editor:
  - connect mode now chains across repeated clicks and pointer drags through stars
  - holding `Ctrl` during connect mode clears traversed lanes instead of deleting stars
  - added `Auto Connect` using the shared `@pax/common` Delaunay connection generator for the current selection or whole map
- Added export / launch ownership coercion for the map editor:
  - export and SP/MP launch now coerce unowned or invalid-owner stars to neutral
  - coerced stars are emitted with `0` active ships and `0` damaged ships
  - normal editor save remains as-authored
- Expanded editor undo/redo history:
  - undo/redo stack depth increased to 100 entries
  - added keyboard shortcuts for `Ctrl+Z` undo and `Ctrl+Shift+Z` redo
- Reworked the map editor shell layout:
  - viewport-constrained CSS grid layout with named areas and board-first sizing
  - left icon rail plus expanding drawer for pointer modes, owners, stars, helpers, and factions
  - bottom action bar with upward drawer for CRUD/load/selection/validation surfaces
  - added board-level fit-and-center control for the authored map viewport
- Corrected the editor shell UX after feedback:
  - removed the broken left-side drawer model and consolidated controls into a permanent sidebar
  - promoted `Save` to a top-level bottom-bar action
  - made `Load` the primary expandable drawer surface with recent-map quick access
  - bottom bar now opens its current drawer from the expand icon or blank-area click
- Expanded map-editor ownership and paint controls:
  - added clearer authored ownership rendering with adjustable ring radius, thickness, and HSLA-style tuning controls
  - added drag-paint support for ownership and fleet counts with a dedicated fleet paint brush
  - added global wipe actions for ownership, fleets, and connections
  - added transient paint-stroke finalization so drag painting does not create one autosave per hovered star

## Verification Notes

- `bunx tsc --noEmit -p common/tsconfig.json` passed.
- `bun run check` in `pax-fluxia/` still reports a large pre-existing client error baseline outside this feature slice.
- Filtered `svelte-check` output did not report new errors for:
  - `src/lib/components/editor/MapEditorCanvas.svelte`
  - `src/routes/dev/map-editor/+page.svelte`
  - `src/lib/editor/mapEditorStore.svelte.ts`
  - `src/lib/editor/mapEditorPresentation.ts`
  - `src/lib/components/ui/settings/ControlsSection-Debug.svelte`
  - `src/lib/components/game/GameContainer.svelte`
  - `src/lib/components/ui/TopBar.svelte`
- `bunx tsc --noEmit -p pax-server/tsconfig.json` is blocked by existing environment/dependency issues, primarily missing `@colyseus/core` type resolution in this worktree.

## Follow-Up

- Manual verification needed:
  - `/dev/map-editor` open/edit/save/export flows
  - `Test SP` path into `/play`
  - `Host MP` path with a custom authored map
  - authored measurement visibility from both HUD button and debug settings
- Consider breaking up the large new editor route/store files if we continue expanding editor polish work.
