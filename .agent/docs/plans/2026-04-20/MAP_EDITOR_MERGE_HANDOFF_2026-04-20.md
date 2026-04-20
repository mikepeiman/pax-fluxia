# Map Editor Merge Handoff

## Purpose

Help another agent merge the custom map editor work from this worktree into another branch with the least guesswork possible, and with clear separation between what is known, what is only inferred from code and git state, and what still needs in-app verification.

## Scope Snapshot

This worktree contains two layers of map-editor work:

1. A large committed base:
   - commit: `e55ddd1bf953a05f2d453dff3efe8cc6a9cf6f8f`
   - subject: `Implement custom map editor`
2. A second, uncommitted follow-up layer:
   - mostly UI-shell and interaction refinements on top of the committed base
   - currently not committed in this worktree

If you are trying to get the "best current state" onto another branch, you almost certainly want:

1. the committed base, then
2. a manual port of the uncommitted follow-up files listed below

Do not assume the committed base alone represents the latest editor UX. It does not.

## Facts I Know For Sure

These are directly confirmed from git state or from files present in this worktree.

### Current branch and refs

- Current local branch in this worktree: `codex/1455-custom-map-editor`
- Current local `HEAD`: `e55ddd1bf953a05f2d453dff3efe8cc6a9cf6f8f`
- In this worktree, `origin/codex/1455-custom-map-editor` points to `967ead05`

That means local `HEAD` is ahead of the visible remote ref in this worktree. I am not inferring that. That is what `git log --oneline --decorate -5` showed.

### Committed base contents

The committed base is large and real. `git show --stat --summary e55ddd1b` confirms it adds the shared authored-map foundation and the first complete editor implementation.

High-signal committed files:

- Shared map foundation:
  - `common/src/maps/types.ts`
  - `common/src/maps/validation.ts`
  - `common/src/maps/measurement.ts`
  - `common/src/maps/runtime.ts`
  - `common/src/maps/loaders.ts`
  - `common/src/maps/importers.ts`
  - `common/src/maps/index.ts`
- Shared mapgen/editor lattice:
  - `common/src/mapgen/placement.ts`
- Client editor core:
  - `pax-fluxia/src/lib/editor/mapEditorPresentation.ts`
  - `pax-fluxia/src/lib/editor/mapEditorStore.svelte.ts`
  - `pax-fluxia/src/lib/editor/mapEditorSymmetry.ts`
  - `pax-fluxia/src/lib/components/editor/MapEditorCanvas.svelte`
  - `pax-fluxia/src/routes/dev/map-editor/+page.svelte`
- Gameplay/editor integration:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `pax-fluxia/src/lib/components/game/GameContainer.svelte`
  - `pax-fluxia/src/lib/territory/devtools/authoredMeasurementsUi.ts`
  - `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
  - `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts`
  - `pax-server/src/rooms/GameRoom.ts`
  - `pax-fluxia/src/routes/play/+page.svelte`

### Current uncommitted follow-up layer

These are the files currently changed or newly added in the worktree after the committed base:

Modified:

- `common/resources/saved-maps/first_symmetry-6_april_17b.json`
- `common/resources/settings-live/current-settings.json`
- `pax-fluxia/src/lib/components/editor/MapEditorCanvas.svelte`
- `pax-fluxia/src/lib/editor/mapEditorStore.svelte.ts`
- `pax-fluxia/src/routes/dev/map-editor/+page.svelte`

Untracked:

- `pax-fluxia/src/lib/components/editor/MapEditorBoardHud.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorCommandDock.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorLibrarySheet.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorOverflowSheet.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorSelectionPanel.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorToolRail.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorValidationPanel.svelte`
- `pax-fluxia/src/lib/editor/mapEditorUiStore.svelte.ts`
- `.agent/docs/plans/2026-04-18/FEATURE_AND_TASK_QUEUE_2026-04-18.md`

Also present and intentionally out of scope:

- `common/resources/settings-live/current-settings 1420 master thread.json`

Do not accidentally merge that stray file unless you have a specific reason.

### Typecheck / check facts

I know these checks passed in this worktree during implementation:

- `bunx tsc --noEmit -p common/tsconfig.json`
- later runs of `bunx tsc --noEmit -p ../common/tsconfig.json` from `pax-fluxia/`

I also know filtered `svelte-check` runs did not report direct hits for the edited editor shell files in the latest pass.

I do **not** know that the full repo is clean. It was not. There was an existing broader baseline outside this feature slice.

## What The Uncommitted Follow-Up Layer Appears To Do

This section is based on reading the current files in the worktree. I am confident in the code-level description, but some of it still needs visual verification.

### Shell/UI rework

The route file `pax-fluxia/src/routes/dev/map-editor/+page.svelte` is no longer just a large inline page. It has been reworked to compose a board-first shell from smaller surfaces:

- `MapEditorToolRail.svelte`
- `MapEditorBoardHud.svelte`
- `MapEditorCommandDock.svelte`
- `MapEditorSelectionPanel.svelte`
- `MapEditorLibrarySheet.svelte`
- `MapEditorValidationPanel.svelte`
- `MapEditorOverflowSheet.svelte`
- `mapEditorUiStore.svelte.ts`

This means the merge target branch needs to accept a structural UI split, not just a few style tweaks.

### Interaction fixes included in the current worktree

From code inspection, the uncommitted layer also includes these targeted fixes:

- tool flyouts are overlaid instead of participating in layout flow
- board dismiss layer closes open tool panels or sheets on outside click
- `Escape` closes active sheet/tool panel via the route handler
- `Measurements` is tooltip-only, not a flyout
- `Connect Lanes` is tooltip-only, not a flyout
- right-click in `measure` or `connect-lane` cancels draft interactions and returns tool mode to `auto`
- tool rail reflects current star type and current faction color instead of staying generic gray
- `MapEditorCanvas.svelte` and `mapEditorStore.svelte.ts` contain explicit draft-cancel behavior

### Merge shape of the route

The current `+page.svelte` is heavily changed relative to the committed base. `git diff --stat` shows a large replacement:

- `pax-fluxia/src/routes/dev/map-editor/+page.svelte`
  - `368 insertions`
  - `1200 deletions`

That is the main manual-merge hotspot.

## What I Believe, But Have Not Fully Verified In Browser

These are code-backed expectations, not promises.

- The tactical-workbench shell should now keep the board more dominant than the older permanent-control layout.
- Tool rail flyouts should overlay on top of the board without pushing layout.
- Tooltips should no longer render underneath the board after the rail/stage z-index changes.
- Clicking outside an open flyout/sheet should close it through the dismiss layer.
- Right-click in ruler or connect mode should now cancel that mode instead of opening the normal star/lane context menu.

I believe those are implemented correctly in code. I have **not** visually verified them in-browser from this worktree.

## Things I Explicitly Do Not Know

- I do not know whether the current uncommitted shell is fully satisfying from a UX perspective. The user was still iterating quickly and finding issues.
- I do not know whether the latest overlay z-index is correct on every viewport size.
- I do not know whether the split shell components will merge cleanly if the destination branch has changed the same route or editor APIs.
- I do not know whether `common/resources/settings-live/current-settings.json` should be brought over as-is to the destination branch. This repo often wants it committed, but that does not mean every branch should blindly accept this exact version.
- I do not know whether `common/resources/saved-maps/first_symmetry-6_april_17b.json` is a desired content artifact for the destination branch or just a local authored example that happened to evolve during editor work.

## Recommended Merge Strategy

### Safeest sequence

1. Start from the destination branch.
2. Cherry-pick the committed base:
   - `git cherry-pick e55ddd1bf953a05f2d453dff3efe8cc6a9cf6f8f`
3. Resolve any cherry-pick conflicts, especially in:
   - `common/src/mapgen/placement.ts`
   - `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
   - `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts`
   - `pax-server/src/rooms/GameRoom.ts`
   - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
4. After that, manually port the current uncommitted follow-up layer:
   - copy in the new UI components
   - reapply the current route shell
   - reapply the current `MapEditorCanvas.svelte` and `mapEditorStore.svelte.ts` changes
5. Re-run checks and then do browser verification on `/dev/map-editor`

### Why not just copy the whole worktree state?

Because the uncommitted layer is not packaged as a clean commit yet, and because there are also content/settings artifacts mixed in:

- `common/resources/settings-live/current-settings.json`
- `common/resources/saved-maps/first_symmetry-6_april_17b.json`

Those may or may not belong in the destination branch.

## Merge Hotspots And Why

### `pax-fluxia/src/routes/dev/map-editor/+page.svelte`

Highest-risk conflict file.

Why:

- it started as the entire editor page
- then it was reworked into a composed shell
- it now owns keyboard handling, sheet/tool-panel close behavior, recent maps, selection wiring, and board dismiss behavior

If the destination branch changed editor actions or route layout, expect manual merge work here.

### `pax-fluxia/src/lib/editor/mapEditorStore.svelte.ts`

High-risk conflict file.

Why:

- this is the editor’s central state model
- many features accumulated here: placement, ownership, fleets, lanes, measurements, autosave, undo/redo, symmetry, templates, launch/export coercion, and now explicit draft-cancel behavior

If the target branch touched editor actions or map typing, merge carefully.

### `pax-fluxia/src/lib/components/editor/MapEditorCanvas.svelte`

High-risk conflict file.

Why:

- it handles almost all pointer behavior
- it contains pan, drag move, paint drag, lane chaining, measurement authoring, selection, context menu, right-click cancellation, and visual overlays

Any mismatch between route/store and canvas will break interaction quickly.

### `common/src/mapgen/placement.ts`

Important if destination branch changed map generation.

Why:

- committed work intentionally reused the game’s grid/placement system rather than a separate editor-only guess
- this was a source of user-reported problems earlier

Do not regress back to a local editor-only grid approximation.

### `pax-fluxia/src/lib/stores/gameStore.svelte.ts`, `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts`, `pax-server/src/rooms/GameRoom.ts`

Important integration boundary.

Why:

- the map editor is not just UI; it wires authored maps into SP and MP launch paths
- if the destination branch changed room creation or game bootstrap, these need close review

## New UI Surface Files To Bring Over Together

These new editor UI files are designed to work together. Port them as a group, not one by one in isolation:

- `pax-fluxia/src/lib/editor/mapEditorUiStore.svelte.ts`
- `pax-fluxia/src/lib/components/editor/MapEditorToolRail.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorBoardHud.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorCommandDock.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorSelectionPanel.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorLibrarySheet.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorValidationPanel.svelte`
- `pax-fluxia/src/lib/components/editor/MapEditorOverflowSheet.svelte`

If you only port some of them, the route will likely compile-break or the new shell state model will be incomplete.

## Content / Artifact Files: Bring Or Skip Deliberately

### Likely optional

- `common/resources/saved-maps/first_symmetry-6_april_17.json`
- `common/resources/saved-maps/first_symmetry-6_april_17b.json`
- `common/resources/saved-maps/test1.json`

These look like authored sample/output maps, not structural code requirements.

### Likely required but branch-sensitive

- `common/resources/settings-live/current-settings.json`

This repo tends to track it, but the exact contents may differ by branch intent. Treat it as a deliberate decision, not an automatic merge.

### Definitely ignore unless specifically needed

- `common/resources/settings-live/current-settings 1420 master thread.json`

## Verification Checklist For The Agent Doing The Merge

### Code / static verification

1. `bunx tsc --noEmit -p common/tsconfig.json`
2. `bunx tsc --noEmit -p pax-fluxia/tsconfig.json`
3. `bunx svelte-check --tsconfig pax-fluxia/tsconfig.json`

Expect unrelated baseline issues may still exist outside this slice. Do not assume every failure is caused by the map editor merge.

### In-app verification on `/dev/map-editor`

Check at minimum:

1. Page opens and shell renders without throwing.
2. Place star works.
3. Select star works.
4. Drag move works.
5. Ownership paint works:
   - click faction with selection
   - drag paint over stars
6. Fleet paint works:
   - slider changes value
   - drag paint applies counts
7. Connect mode works:
   - click-chain creates lanes
   - drag-through creates lanes
   - `Ctrl` in connect mode clears lanes
   - right-click cancels connect mode
8. Measure mode works:
   - click two anchors creates measurement
   - right-click cancels measurement mode
9. Tooltips and flyouts:
   - tooltips are fully visible above board
   - clicking outside closes open flyouts/sheets
   - `Escape` closes open flyouts/sheets
10. Save / Load / Export
11. `Test SP`
12. `Host MP`
13. Authored measurements can be shown/hidden in-game

### High-value regression checks

These were areas of prior user dissatisfaction and should be checked first:

1. Grid parity with the real gameboard lattice
2. Placement snapping to real hex centers
3. No text-selection weirdness while clicking and dragging in canvas
4. Ownership ring colors actually visible
5. Tool rail overlays not shifting or resizing the board

## If You Need To Trim Scope

If the destination branch cannot absorb everything cleanly in one pass, preserve the following order:

1. Shared map schema / validators / runtime adapters
2. Core editor store and canvas
3. SP/MP integration
4. Then the later shell/UI rework

That order keeps the authored-map system intact even if the newest tactical-workbench shell has to be postponed.

## Bottom-Line Recommendation

If the goal is "merge the real feature, not just a subset":

- cherry-pick `e55ddd1bf953a05f2d453dff3efe8cc6a9cf6f8f`
- then manually port the current uncommitted UI-shell follow-up files from this worktree
- treat content/settings artifacts as deliberate decisions
- assume browser verification is still required, especially for tool overlays and pointer workflows

## Source Of This Handoff

This handoff was written from:

- current git state in this worktree on `2026-04-20`
- direct inspection of the current edited files
- prior implementation notes from the same session history

It is intentionally conservative. Where I was not sure, I said so.
