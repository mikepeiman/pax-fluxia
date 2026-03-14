# FG1 Adaptive Field

## Plain-Language Explanation

`FG1` treats territory as the result of a biased influence field. Each player pushes outward from owned stars through a modified distance metric, and the frontier appears where those competing influences balance.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: selectable comparison path, not yet a canonical in-engine publisher

## Current Live Routing And Backend Reality

- Live only when `static` mode is active and `FG1` is selected
- Current backend reality: adapter-backed through `PVV2`
- Not a real live contributor when `dynamic` or `hybrid` routes anchor elsewhere

## Target Shape

`FG1` should become the native field-based publisher of:

- modified-distance ownership field
- shared frontier extraction from that field
- canonical holdings/components derived from that field

## Backend Fit

- `PVV2`: useful comparison and compatibility surface
- `PVV3`: important target once the field artifacts are canonical enough to render directly
- `DF`: natural fit for field-oriented validation and parity

## Dependencies

- `EPIC_01_foundation_and_contracts`
- field validation rules from `05_VALIDATION_AND_DEMO_PROTOCOL.md`
- backend parity expectations from the backend docs

## Atomic Tasks

- `FG1-001` Implement modified-distance metric with MSR/CX/DX integrated into the actual method contract
- `FG1-002` Implement adaptive ownership-field sampling
- `FG1-003` Implement shared-node zero-crossing extraction and holding publish
- `FG1-004` Validate FG1 on PVV2, PVV3, and DF backends

## Acceptance Checks

- Modified-distance logic is explicit and testable
- Frontier extraction produces shared geometry rather than per-owner drift
- Holdings publish without gaps in the ownership partition
- Browser validation exists on all three backends

## Screenshot And Demo Scenarios

- Static `FG1` on small, medium, and world-edge stress maps
- At least one backend-parity comparison screenshot against `PVV3` or `DF`
- One proof case showing field behavior under MSR/CX/DX tuning

## Stop Conditions

- Stop if `FG1` still depends on implicit backend behavior rather than its own canonical artifacts
- Stop if field extraction works visually but does not publish holdings/components cleanly
