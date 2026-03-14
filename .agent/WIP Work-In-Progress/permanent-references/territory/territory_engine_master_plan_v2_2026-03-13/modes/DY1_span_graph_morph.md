# DY1 Span Graph Morph

## Plain-Language Explanation

`DY1` animates territory changes by matching spans or edges from one holding layout to the next and then morphing those matched spans under constraints.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: selectable comparison path for span-based morphing ideas

## Current Live Routing And Backend Reality

- Live only when `dynamic` mode is active and `DY1` is selected
- Current backend reality: adapter-backed through `PVV3`
- Current anchor static route: `FG2`

## Target Shape

`DY1` should become the native span-correspondence dynamic method built on canonical frontiers and holding identities.

## Backend Fit

- `PVV3`: strongest current fit because it is the active frontier-first renderer host
- `PVV2`: maintained comparison target
- `DF`: maintained parity target after canonical artifacts stabilize

## Dependencies

- `DY-000` shared persistent frontier and holding IDs
- canonical static anchors, especially `FG2`
- validation protocol from `05_VALIDATION_AND_DEMO_PROTOCOL.md`

## Atomic Tasks

- `DY-000` Add persistent frontier and holding IDs plus a shared delta-event substrate
- `DY1-001` Implement span-graph morph correspondences
- `DY1-002` Implement constrained span playback and fallback rules

## Acceptance Checks

- Stable correspondences exist across spawn, split, merge, and vanish events
- Playback does not invent route truth that the static anchors do not support
- Fallback behavior is explicit when correspondences fail

## Screenshot And Demo Scenarios

- Dynamic `DY1` on medium and high-churn maps
- One screenshot pair or sequence showing a split or merge case
- One comparison against static `FG2` before and after a dynamic event

## Stop Conditions

- Stop if morphing is visually smooth but identity continuity is false
- Stop if the method depends on backend-specific heuristics instead of canonical correspondences
