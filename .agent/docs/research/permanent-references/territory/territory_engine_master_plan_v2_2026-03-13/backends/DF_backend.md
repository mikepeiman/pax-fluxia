# DF Backend

## Purpose

`DF` is a maintained backend for field-oriented territory execution and comparison. It remains important because several field-heavy methods currently route through it, and it provides useful contrast against graph-first approaches.

## Strengths

- Natural fit for field-oriented and RT-assisted concepts
- Useful comparator backend for implicit and sampling-heavy methods
- Helps preserve optionality while native static methods are expanded

## Weaknesses

- Still mostly adapter-backed in the 15-mode system
- Not yet a canonical-artifact-first backend in practice
- Can hide route truth if validation focuses only on visuals and not on artifact provenance

## Current Live Routes

Today `DF` is the active backend for these route families:

- `FG3 Implicit Trace`
- `FG5 RT-Assisted Publish`
- `DY2 Local Delta Patch`
- `DY3 Field Interp Stabilized`
- `HY3 Implicit Field + Transport`
- `HY5 RT Publish + Corridor Events`

## Target Parity Responsibilities

`DF` should be able to:

- consume canonical frontiers and holdings when the underlying methods publish them
- support backend-parity demos for field-oriented methods
- make fallback vs native behavior explicit in trace tooling
- remain a maintained validation surface rather than a neglected branch

## Artifact Consumption Requirements

The planning target expects `DF` to consume:

- canonical frontiers when methods publish them
- holdings/components where relevant
- field-specific diagnostic artifacts for debugging
- route/backend provenance metadata for validation and screenshots

## Render Responsibilities

`DF` is responsible for:

- rendering fills and borders in a way that can be compared to `PVV2` and `PVV3`
- honoring the live route selected by the engine
- supporting meaningful evaluation of field-heavy methods and hybrids

## Debug Hooks

Useful debug hooks for `DF` should include:

- route/backend labeling
- field-resolution or RT provenance markers where relevant
- explicit fallback labeling
- screenshot-friendly benchmark outputs

## Acceptance Tests

`DF` backend work is acceptable when:

- it correctly reports the live route and backend in validation notes
- demo-ready routes render without visible ownership gaps
- field-oriented methods can be compared against other backends with saved screenshots
- backend-parity differences are documented rather than left implicit
