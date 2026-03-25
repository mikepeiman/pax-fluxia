# Territory Recovery Chunks 01-04 Note (2026-03-08)

## Scope
This note records completion of Chunks 01-04 from the 16-chunk recovery package.

## Chunk 01 - Baseline Decision
- Working tree had a single repo-tracked dirty file: `DistanceFieldTerritoryRenderer.ts`.
- Dirty state was treated as a partially-valid Phase 1 recovery attempt and completed, not discarded.
- Existing untracked phase note files were retained and superseded by this chunk note.

## Chunk 02 - Emergency Runtime Gate
- Added explicit internal canonical runtime mode gate:
  - `DF_CANONICAL_FRONTIER_RUNTIME_MODE: 'disabled' | 'diagnostic' | 'production'`
- Set to `'disabled'` to keep canonical frontier code compiled but non-visible.
- `renderMeshBorderOverlay(...)` now publishes legacy vector geometry first and uses it as active mesh input while canonical mode is disabled.

## Chunk 03 - Published Owner-Grid Snapshot Contract
- Added `PublishedOwnerGridSnapshot` cache separate from `cachedVectorBuildJob`.
- Stage 2B owner-grid input now comes only from the published snapshot path.
- Published snapshot is captured only after vector border build completion.
- Stale snapshot and global reset paths now clear published snapshot state.
- Removed runtime dependency on in-progress `cachedVectorBuildJob.ownerGrid` for canonical field frontier use.

## Chunk 04 - Working-State Verification
- Verified code-level recovery conditions:
  - canonical path is not visible in runtime mode `disabled`,
  - mesh path no longer uses incomplete owner-grid job buffers as Stage 2B inputs,
  - legacy path remains available and selected as active geometry source during recovery.
- Targeted `bun run check` filtering did not report new `DistanceFieldTerritoryRenderer.ts` diagnostics after fixing an interrupted syntax splice.

## Intentional Temporary Divergence
- Canonical frontier runtime output remains intentionally disabled until Stage 2B contour-local grouping and canonical readiness checks are implemented (Chunks 12-14).
- This is a temporary safety divergence from full canonical promotion order to restore immediate playable stability.
