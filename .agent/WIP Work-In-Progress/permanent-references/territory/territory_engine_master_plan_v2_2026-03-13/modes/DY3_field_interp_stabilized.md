# DY3 Field Interp Stabilized

## Plain-Language Explanation

`DY3` animates territory changes by interpolating between field states, then stabilizing the result to suppress flicker or jitter where the field is numerically fragile.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: selectable comparison path for field-interpolation dynamics

## Current Live Routing And Backend Reality

- Live only when `dynamic` mode is active and `DY3` is selected
- Current backend reality: adapter-backed through `DF`
- Current anchor static route: `FG3`

## Target Shape

`DY3` should become the native field-cache-and-stabilizer dynamic method for field-based territory motion.

## Backend Fit

- `DF`: strongest conceptual fit because it already hosts field-heavy comparison routes
- `PVV3`: useful later for parity against frontier-first playback
- `PVV2`: maintained comparison target

## Dependencies

- `DY-000` shared persistent frontier and holding IDs
- native or trustworthy field publishers from the selected static route
- screenshot validation on flutter-prone maps

## Atomic Tasks

- `DY-000` Add persistent frontier and holding IDs plus a shared delta-event substrate
- `DY3-001` Implement field interpolation cache and anti-flutter stabilizer
- `DY3-002` Implement correction pass near high-error zones

## Acceptance Checks

- Interpolation avoids visible flutter in high-error regions
- Correction pass is bounded and explainable
- Route truth remains consistent with the anchor static method

## Screenshot And Demo Scenarios

- Dynamic `DY3` on medium and high-churn maps
- One screenshot sequence showing stabilized behavior in a fragile contour area
- One comparison against an unstabilized baseline if available

## Stop Conditions

- Stop if smoothing hides instability without preserving route truth
- Stop if correction regions are unbounded or poorly explained
