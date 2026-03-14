# EPIC 02: Static Methods

## Goal

Turn the static frontier-generation methods into canonical publishers of shared frontier geometry and holdings, using FG2 as the reference implementation and then expanding native coverage across the remaining static methods.

## Included Tasks

- `FG2-001` through `FG2-005`
- `FG1-001` through `FG1-004`
- `FG3-001` through `FG3-004`
- `FG4-001` through `FG4-004`
- `FG5-001` through `FG5-004`

## Dependencies

- `EPIC_01_foundation_and_contracts`

## Execution Order

1. Harden `FG2` terminology, validation, alignment, and identity invariants.
2. Implement `FG1` native modified-distance and field publish path.
3. Implement `FG3` native implicit trace path.
4. Implement `FG4` native pairwise arrangement path.
5. Implement `FG5` native RT-assisted publish path.
6. Validate each native publisher on `PVV2`, `PVV3`, and `DF`.

## Done Criteria

This epic is done when:

- all five static methods publish canonical frontier and holding artifacts natively
- `FG2` remains the reference path and no longer has known settled-state fill/border drift
- each static method has backend validation evidence across the maintained backends
