# HY1 Static Backbone + Dynamic Refine

## Plain-Language Explanation

`HY1` keeps a stable static backbone from `FG1` and applies `DY1` only where dynamic refinement is needed. It is meant to combine steady field-based ownership truth with localized morph-style motion.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: selectable comparison hybrid plan

## Current Live Routing And Backend Reality

- Live only when `hybrid` mode is active and `HY1` is selected
- Current backend reality: adapter-backed through `PVV2`
- Current static leg: `FG1`
- Current dynamic leg: `DY1`

## Target Shape

`HY1` should become the native orchestration plan for `FG1 + DY1`, with explicit rules for when the dynamic refine layer is allowed to diverge from the static backbone.

## Backend Fit

- `PVV2`: current comparison and compatibility surface
- `PVV3`: important future target once the hybrid contract is native
- `DF`: maintained parity target for field-oriented comparison

## Dependencies

- `HY-000` common hybrid route contract
- `FG1` native publisher
- `DY1` native correspondence and playback

## Atomic Tasks

- `HY-000` Define the common hybrid route contract and exclusivity semantics
- `HY1-001` Compose FG1 + DY1 and validate localized updates

## Acceptance Checks

- The static backbone remains authoritative outside the refined region
- Route truth is explicit in UI and trace output
- Localized updates do not corrupt the field-based partition

## Screenshot And Demo Scenarios

- Hybrid `HY1` on medium and high-churn maps
- One screenshot sequence showing stable backbone plus localized refine
- One comparison against pure `FG1` and pure `DY1`

## Stop Conditions

- Stop if the hybrid behaves like an undocumented override of either leg
- Stop if the refined region cannot be identified clearly in validation output
