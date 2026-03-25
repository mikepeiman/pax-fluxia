# DY4 Optimal Transport

## Plain-Language Explanation

`DY4` treats territory change as a controlled movement problem. Instead of only patching or morphing edges, it moves control structures in a way that tries to preserve coherent mass and motion.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: selectable comparison path for transport-style dynamic motion

## Current Live Routing And Backend Reality

- Live only when `dynamic` mode is active and `DY4` is selected
- Current backend reality: adapter-backed through `PVV2`
- Current anchor static route: `FG1`

## Target Shape

`DY4` should become the native transport-inspired dynamic method for coherent holding motion and correction.

## Backend Fit

- `PVV2`: useful current comparison backend
- `PVV3`: important target once transport artifacts can drive the active renderer host
- `DF`: maintained parity target

## Dependencies

- `DY-000` shared persistent frontier and holding IDs
- meaningful control structures from the selected static method
- validation protocol for smoothness versus cost tradeoffs

## Atomic Tasks

- `DY-000` Add persistent frontier and holding IDs plus a shared delta-event substrate
- `DY4-001` Implement optimal-transport approximation for holding motion
- `DY4-002` Implement control-point advection and correction publish

## Acceptance Checks

- Motion remains coherent during large territory changes
- Correction publish is explicit and does not silently rewrite route truth
- Smoothness versus computational cost is documented and demoable

## Screenshot And Demo Scenarios

- Dynamic `DY4` on medium and large maps
- One screenshot sequence showing coherent motion during a major change
- One comparison against a non-transport dynamic baseline

## Stop Conditions

- Stop if motion looks elegant but canonical holdings are not preserved
- Stop if the method has no explicit correction or fallback path
