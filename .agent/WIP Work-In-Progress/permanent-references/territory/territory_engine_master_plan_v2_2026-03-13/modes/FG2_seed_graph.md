# FG2 Seed Graph

## Plain-Language Explanation

`FG2` builds territory from discrete frontier seeds, junctions, perimeter closure, and face/holding reconstruction. It is the graph-first method that has already proven a native canonical frontier path is viable.

## Current Implementation State

- Status: native
- Native maturity: strongest current method and current reference implementation
- Current role: canonical frontier/holding path for the new territory engine

## Current Live Routing And Backend Reality

- Live when `static` mode is active and `FG2` is selected
- Also acts as the anchor route for some dynamic and hybrid selections
- Current backend reality: native engine pipeline with direct consumption by `PVV3`

## Target Shape

`FG2` should remain the reference path for:

- shared frontier geometry
- holdings/components as primary ownership truth
- trace and step inspection of canonical artifacts
- screenshot-backed validation of route truth and visual quality

## Backend Fit

- `PVV3`: primary active backend and direct native consumer
- `PVV2`: maintained parity and comparison surface
- `DF`: maintained parity surface for canonical artifact rendering

## Dependencies

- `EPIC_01_foundation_and_contracts`
- route-truth and screenshot protocol from `05_VALIDATION_AND_DEMO_PROTOCOL.md`
- backend parity requirements from all backend docs

## Atomic Tasks

- `FG2-001` Rename primary geometry language from shell/hole truth to holding/component truth
- `FG2-002` Reproduce the remaining settled-state border/fill mismatch with dedicated screenshots
- `FG2-003` Eliminate remaining FG2 fill-border misalignment
- `FG2-004` Lock holding identity invariants across spawn, split, merge, vanish, and enclave cases
- `FG2-005` Add deterministic screenshot and fixture coverage for canonical FG2

## Acceptance Checks

- Shared frontiers are gap-free and pixel-aligned between neighbors
- Settled-state fills and borders match visually
- Holdings/components survive split, merge, vanish, and enclave cases without identity confusion
- Canonical artifacts are inspectable in trace/step tooling

## Screenshot And Demo Scenarios

- Static `FG2` on medium and world-edge stress maps
- Before/after screenshots for any fill-border alignment fix
- One trace-backed screenshot showing canonical holdings/components rather than only shell-style render artifacts

## Stop Conditions

- Stop if a change improves visuals but weakens canonical frontier truth
- Stop if a fix is claimed without saved screenshots proving the settled-state result
