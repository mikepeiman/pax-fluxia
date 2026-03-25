# FG5 RT-Assisted Publish

## Plain-Language Explanation

`FG5` uses a render-target or sampled ownership pass to detect territory transitions, then converts that sampled ownership field back into shared vector frontiers and holdings.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: selectable comparison path for RT-assisted frontier extraction ideas

## Current Live Routing And Backend Reality

- Live only when `static` mode is active and `FG5` is selected
- Current backend reality: adapter-backed through `DF`
- Not yet a native RT-to-canonical publish path

## Target Shape

`FG5` should become the native sampled-field publisher of:

- ownership RT/sub-texel transitions
- centerline or shared-edge vector reconstruction
- canonical holdings/components derived from sampled ownership

## Backend Fit

- `DF`: strong natural fit for field and sample-heavy validation
- `PVV3`: important target once canonical vectors are published cleanly
- `PVV2`: maintained parity and comparison surface

## Dependencies

- `EPIC_01_foundation_and_contracts`
- benchmark and screenshot protocol from `05_VALIDATION_AND_DEMO_PROTOCOL.md`

## Atomic Tasks

- `FG5-001` Implement ownership RT pass and sub-texel transition extraction
- `FG5-002` Implement centerline graph build and shared-edge-preserving vector publish
- `FG5-003` Calibrate RT resolution and error budgets
- `FG5-004` Validate FG5 on all three backends

## Acceptance Checks

- Sampled transitions reconstruct shared edges rather than per-owner drift
- Error budgets are explicit and validated on stress maps
- Holdings/components publish as a full partition
- Backend validation exists on `PVV2`, `PVV3`, and `DF`

## Screenshot And Demo Scenarios

- Static `FG5` screenshots on medium and large maps
- One screenshot proving resolution/error-budget tradeoffs on a dense case
- One backend comparison screenshot against `FG2`

## Stop Conditions

- Stop if RT extraction is fast but cannot publish stable canonical vectors
- Stop if resolution tuning is claimed without saved screenshot evidence
