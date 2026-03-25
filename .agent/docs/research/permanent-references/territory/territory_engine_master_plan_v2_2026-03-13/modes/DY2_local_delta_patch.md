# DY2 Local Delta Patch

## Plain-Language Explanation

`DY2` avoids recomputing the full map for every change. It detects the affected local region, recomputes only that window, and then stitches the result back into the unchanged territory.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: selectable comparison path for patch-based dynamic updates

## Current Live Routing And Backend Reality

- Live only when `dynamic` mode is active and `DY2` is selected
- Current backend reality: adapter-backed through `DF`
- Current anchor static route: `FG3`

## Target Shape

`DY2` should become the native local-recompute dynamic method for efficient incremental territory updates.

## Backend Fit

- `DF`: strong current fit because of its field-oriented locality assumptions
- `PVV3`: important target for patch-based playback once artifacts are canonical
- `PVV2`: maintained comparison target

## Dependencies

- `DY-000` shared persistent frontier and holding IDs
- local dirty-region logic tied to the selected static anchor
- screenshot validation for seam behavior

## Atomic Tasks

- `DY-000` Add persistent frontier and holding IDs plus a shared delta-event substrate
- `DY2-001` Implement local recompute-window detection from conquest and order events
- `DY2-002` Implement patch stitching with locked boundary zones and seam validation

## Acceptance Checks

- Dirty-region detection is explicit and reproducible
- Patch seams do not create visible discontinuities or route-truth drift
- Unchanged territory remains stable outside the patch window

## Screenshot And Demo Scenarios

- Dynamic `DY2` on medium and world-edge stress maps
- One screenshot focused on seam behavior after a local event
- One comparison against a full recompute reference for the same event

## Stop Conditions

- Stop if patching is fast but produces seam artifacts or route drift
- Stop if the method cannot prove which region stayed locked during recompute
