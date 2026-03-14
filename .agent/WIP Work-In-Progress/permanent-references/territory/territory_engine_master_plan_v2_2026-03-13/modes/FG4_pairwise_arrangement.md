# FG4 Pairwise Arrangement

## Plain-Language Explanation

`FG4` generates frontier primitives pair by pair, clips them into a planar arrangement, and then labels the resulting faces to recover canonical frontiers and holdings.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: selectable comparison path for exact arrangement-style geometry

## Current Live Routing And Backend Reality

- Live only when `static` mode is active and `FG4` is selected
- Current backend reality: adapter-backed through `PVV2`
- Hybrid routes that mention `FG4` still depend on their own orchestration path

## Target Shape

`FG4` should become the native exact-geometry publisher of:

- pairwise bisector primitives
- planar arrangement graph
- face labels that produce canonical frontiers and holdings

## Backend Fit

- `PVV2`: good comparison and exactness baseline while the method matures
- `PVV3`: important target once arrangement faces publish canonical artifacts clearly
- `DF`: maintained parity target, not the conceptual center

## Dependencies

- `EPIC_01_foundation_and_contracts`
- backend parity requirements from the backend docs

## Atomic Tasks

- `FG4-001` Implement pairwise bisector primitive generation and clipping
- `FG4-002` Implement planar arrangement graph and face labeling
- `FG4-003` Publish canonical frontiers and holdings from arrangement faces
- `FG4-004` Validate FG4 on all three backends

## Acceptance Checks

- Arrangement faces agree with shared-edge ownership truth
- No duplicate or drifting borders between neighboring holdings
- Holdings/components publish from labeled faces without gaps
- Backend validation exists on all three backends

## Screenshot And Demo Scenarios

- Static `FG4` screenshots on small and medium maps
- One screenshot focused on multi-owner junction exactness
- One backend comparison screenshot against `FG2` or `FG3`

## Stop Conditions

- Stop if arrangement output is exact locally but does not produce a full ownership partition
- Stop if face labeling remains backend-specific instead of canonical
