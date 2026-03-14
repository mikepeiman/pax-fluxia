# FG2 Owner-Region Loops and Trace Overlay

Date: 2026-03-12
Worktree: `C:\Users\mikep\Desktop\WebDev\PRISM-territory-work`
Branch: `codex/territory-active`

## Scope
This slice advances FG2 from pairwise frontier/face diagnostics toward actual territory-candidate geometry.

Implemented in `pax-fluxia/src/lib/territory-engine/methods/fg2SeedGraph.ts`:
- stronger exterior-face selection using `boundary_perimeter` participation before world-boundary touch and raw area
- explicit pairwise `regionLoops` artifacts in loop stage
- owner-attributed `ownerRegionLoops` artifacts promoted from canonical face walks
- trace overlay rendering for owner-region loops in actual player color

## Key idea
The half-edge graph already carries owner provenance on topology links:
- `star_arc.viaOwner`
- `boundary_extension.viaOwner`

That means loop ownership can stay a derived classification step instead of being baked into graph construction.

For each canonical face walk:
1. gather its half-edges
2. resolve those half-edges back to topology links
3. count owner hints from `viaOwner`
4. if one owner has a strict majority, promote the walk to an `ownerRegionLoop`
5. if tied, keep the loop diagnostic-only

## Why this matters
Before this slice, FG2 could show:
- frontier seeds
- owner-pair topology links
- pairwise face walks

But it could not yet show candidate territory pieces. After this slice, trace mode can display owner-colored loop candidates that are much closer to the eventual fill reconstruction target.

## Current artifact semantics
Loop-stage artifacts now separate into two levels:

### 1. `regionLoops`
These are owner-pair loop artifacts.
They include:
- canonical candidate loops
- current exterior candidate loops

Use them to debug:
- half-edge face extraction
- exterior vs canonical classification
- world-perimeter closure quality

### 2. `ownerRegionLoops`
These are owner-attributed loop artifacts promoted only from canonical candidates.
They include:
- `ownerId`
- `opposingOwnerId`
- `ownerHintCount`
- `opposingHintCount`
- `confidence`

Use them to debug:
- whether FG2 is recovering player-colored region pieces
- whether link provenance is strong enough for fill reconstruction
- where attribution remains ambiguous

## Demo instructions
The slice is inspectable now in the worktree build.

Use:
- `TERRITORY_ENGINE_ENABLED = true`
- `TERRITORY_ENGINE_STATIC_METHOD = 'fg2_seed_graph'`
- `TERRITORY_ENGINE_TRACE_MODE = true`

Expected visual layers in trace mode:
1. owner-region loop overlays in player color
2. faint pairwise region loop overlays
3. owner-pair topology graph links and nodes
4. final frontier polylines
5. seed markers

## Verification
Targeted verification passed after the slice:
- `bun run check` with territory-engine filtering reported no diagnostics for `src/lib/territory-engine/*`

## Remaining gap
This does not yet reconstruct final owner fills.
It is still a diagnostic/intermediate geometry layer.
The next likely steps are:
- expose stored territory trace runs in the developer UI for step-debug inspection
- or join owner-region candidates into fill-ready owner loops and region-normalized shared boundaries