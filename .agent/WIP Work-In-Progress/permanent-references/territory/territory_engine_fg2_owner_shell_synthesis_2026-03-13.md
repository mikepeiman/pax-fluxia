# FG2 Owner Shell Synthesis — 2026-03-13

## Scope

This slice promotes FG2 from owner-attributed region candidates to fill-ready owner shell geometry.

The key change is that FG2 no longer stops at `ownerRegionLoops` as its highest-value ownership artifact. It now derives owner shell loops from the globally resolved frontier arrangement and uses those shell artifacts as the primary fill geometry in the native renderer.

## Problem

Before this slice, FG2 could:
- generate contested-lane frontier seeds
- build owner-pair topology graphs
- close those graphs against the world rectangle
- walk pair and global faces
- attribute canonical/global faces to owners

But it still lacked a stronger territory fill artifact.

`ownerRegionLoops` were useful diagnostics, but they were still face candidates rather than owner shell boundaries. Shared edges between same-owner faces were still implicitly present in the arrangement, so the engine did not yet have a cleaner owner-level boundary product.

## Implementation

### 1. Shared chain extraction helper
- Refactored generalized graph traversal so FG2 can extract reusable `nodeIds + linkIds + closed` chains from any typed topology graph.
- This is now used as a common primitive for frontier extraction and owner-shell tracing.

### 2. Owner shell graph synthesis from the global arrangement
- Built `buildOwnerShellGraphs(...)`.
- Input: global topology graph + global half-edge graph + resolved global owner-region loops.
- Mechanism:
  - map resolved owner face ownership onto half-edges
  - inspect each global link from both half-edge sides
  - if the two sides do not belong to the same owner, treat that link as owner-exposed
  - project those owner-exposed links into an owner-specific shell graph
- Result:
  - same-owner internal shared edges are dropped automatically
  - only exposed owner boundaries remain in the owner shell graph

### 3. Owner shell loop classification
- Built `buildOwnerShellArtifacts(...)`.
- Extracts closed loops from each owner shell graph.
- Computes loop area and world-boundary touch flags.
- Computes nesting by containment.
- Classifies loops as `shell` or `hole` by nesting depth.
- Normalizes winding direction for future fill/hole work.
- Publishes:
  - `ownerShellLoops`
  - `ownerShells`
  - `ownerShellCount`
  - `ownerShellLoopCount`
  - `ownerShellHoleCount`
  - `openOwnerShellLoopCount`
  - `ownerShellGraphCount`

### 4. Fallback behavior
- If global owner-shell synthesis produces nothing usable, FG2 falls back to one-to-one shell artifacts from `ownerRegionLoops`.
- This keeps the renderer alive during ambiguous or partial checkpoints.

### 5. Native render integration
- FG2 native render now fills `ownerShells` first, then draws frontier strokes on top.
- In trace mode, owner-region loops and pair-region loops remain visible as diagnostics, while shell holes are outlined separately for inspection.
- This is the first FG2 slice where the main visible fill product is owner-shell-oriented rather than candidate-face-oriented.

## Outcome

FG2 now has a better ownership artifact chain:

`global topology -> global face walk -> resolved owner faces -> owner-exposed shell graph -> owner shells -> fill rendering`

That is materially closer to the target architecture where fill and border derive from the same canonical frontier truth.

## Verification

- `bun run check` still exits nonzero on the wider repo due existing baseline issues/warnings.
- Filtered check output showed no diagnostics referencing `src/lib/territory-engine/methods/fg2SeedGraph.ts`.
- Existing `ControlsSection-Territory.svelte` unused CSS warnings remain unchanged.

## Demo Status

Worktree:
- `C:\Users\mikep\Desktop\WebDev\PRISM-territory-work`

Recommended demo config:
- `TERRITORY_ENGINE_ENABLED=true`
- `TERRITORY_ENGINE_STATIC_METHOD='fg2_seed_graph'`
- `TERRITORY_ENGINE_TRACE_MODE=true`

What should now be visibly different:
- owner shell fills should appear before frontier strokes
- same-owner internal face boundaries should no longer act like the highest-level fill artifact
- trace mode should expose shell-vs-hole diagnostics in addition to owner-region candidate overlays

## Next

The next highest-value slice is to harden shell correctness and animation readiness:
- improve shell-loop continuity at difficult world-edge / multi-owner junction cases
- replace fallback shelling with fully global resolution everywhere possible
- start deriving transition-ready correspondences between previous and next shell loops for dynamic territory morphing
