# Post-Mortem: 2026-04-14 - Stale Power-Voronoi Recorder Path

## What Happened
`perimeter_field` transition diagnostics and download bundles were expected to reflect the live gameplay render path. They did not. The recorder in `GameCanvas.svelte` was still wired to the old `exportPowerVoronoiGeometrySnapshot(...)` path and `TransitionSnapshotRecorder.capture(...)`, which are for the older Power-Voronoi / DY4 diagnostic flow.

As a result:
- perimeter-field conquests were not reliably captured in the Transition Debug recorder
- exported bundles did not represent the actual perimeter-field PREV/NEXT/interim states
- significant time was spent debugging wrong diagnostic artifacts instead of the real renderer state

## Root Cause
The diagnostic system was allowed to lag behind the active gameplay architecture.

The actual render path had moved to `PerimeterFieldFamily.update(...)` and `family.debugSnapshot`, but the recorder hook was never moved with it. That is a systems ownership failure:
- real gameplay truth lived in the render family
- diagnostic capture still lived in a legacy renderer-specific path

This happened because the diagnostic integration was treated as a peripheral add-on instead of as a first-class consumer of the active render path. Once `perimeter_field` became the working mode, the recorder should have been moved immediately to the family boundary.

## Impact
- wasted debugging cycles on invalid evidence
- delayed diagnosis of actual transition-state bugs
- misleading exported bundles
- additional user time spent pointing out that conquests were not being recorded at all
- avoidable trust damage, because the tooling claimed to exist but was not connected to the live mode

## Corrective Actions
- moved perimeter-field capture to the real gameplay loop immediately after `PerimeterFieldFamily.update(...)`
- added a pre-rendered bundle capture path to `TransitionSnapshotRecorder`
- made perimeter-field bundles use real family-produced PREV/NEXT/interim frames instead of the stale DY4 export path
- kept the old recorder path only for the older renderer families that still use it

## Lessons
- diagnostic tooling must attach to the current authoritative runtime boundary, not to a legacy renderer that used to be authoritative
- when a new render family becomes the active work surface, diagnostics must be migrated in the same pass, not later
- if a diagnostic/export tool is mode-specific in practice, that must be explicit in code ownership instead of hidden behind a generic recorder API
