# HY5 RT Publish + Corridor Events

## Plain-Language Explanation

`HY5` combines sampled or RT-assisted static publish from `FG5` with corridor-event-driven local updates from `DY5`. It is the highest-throughput hybrid concept in the current set.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: selectable comparison hybrid plan for RT-assisted high-load update behavior

## Current Live Routing And Backend Reality

- Live only when `hybrid` mode is active and `HY5` is selected
- Current backend reality: adapter-backed through `DF`
- Current static leg: `FG5`
- Current dynamic leg: `DY5`

## Target Shape

`HY5` should become the native hybrid plan for high-load territory updates driven by sampled ownership publish plus explicit event decomposition.

## Backend Fit

- `DF`: strongest current conceptual fit for RT/sample-heavy comparison
- `PVV3`: important future parity target for the active renderer host
- `PVV2`: maintained comparison target

## Dependencies

- `HY-000` common hybrid route contract
- `FG5` native RT-assisted publisher
- `DY5` native corridor-event path

## Atomic Tasks

- `HY-000` Define the common hybrid route contract and exclusivity semantics
- `HY5-001` Compose FG5 + DY5 and validate high-load dirty-region updates

## Acceptance Checks

- Static RT publish and dynamic event locality remain consistent with each other
- High-load updates do not create route-truth ambiguity
- Dirty-region behavior is demoable with saved evidence

## Screenshot And Demo Scenarios

- Hybrid `HY5` on large and high-churn maps
- One screenshot sequence showing localized updates under load
- One comparison against pure `DY5`

## Stop Conditions

- Stop if RT publish and corridor events disagree about the changed region
- Stop if the method cannot prove high-load locality with screenshots or trace output
