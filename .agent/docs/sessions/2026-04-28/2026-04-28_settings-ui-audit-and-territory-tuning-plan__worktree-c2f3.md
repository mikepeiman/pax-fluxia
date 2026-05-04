# Merge Note

- source worktree: `c2f3`
- source commit: `cad080942cd19c311f7954fe342e3213663ce1dd`
- merge intent: fold deltas into the canonical unsuffixed master doc, do not overwrite it

# Settings UI Audit and Territory Tuning Plan â€” worktree `c2f3`

## Implemented Plan Basis

- Reorganize the full Settings UI around player intent
- Make `Diagnostics` a single Settings-owned surface
- Preserve the lower-right diagnostics launcher as a deep-link into Settings
- Split Territory into:
  - `Territory Modes & Transition`
  - `Territory Tuning & Constraints`
  - `Territory Styles`
- Enforce semantic naming across code and UI
- Fix topology-control ownership, correctness, and compute feedback

## Immediate Execution Order

1. Create merge-safe documentation and backfill the chat log
2. Refactor Settings shell and top-level section registry
3. Consolidate Diagnostics into Settings and rewire the launcher
4. Split Territory and re-home duplicated controls
5. Fix Power Voronoi tuning propagation and compile feedback
6. Add tests and run targeted verification

