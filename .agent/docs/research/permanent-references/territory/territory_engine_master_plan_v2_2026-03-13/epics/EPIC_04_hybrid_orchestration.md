# EPIC 04: Hybrid Orchestration

## Goal

Define and implement hybrid route composition so that each `HY*` plan is a clear orchestration contract rather than an ambiguous UI mix.

## Included Tasks

- `HY-000`
- `HY1-001`
- `HY2-001`
- `HY3-001`
- `HY4-001`
- `HY5-001`

## Dependencies

- `EPIC_01_foundation_and_contracts`
- relevant static publishers from `EPIC_02_static_methods`
- relevant dynamic methods from `EPIC_03_dynamic_methods`

## Execution Order

1. Define the shared hybrid route contract and exclusivity semantics.
2. Implement and validate the simplest/highest-value hybrid plans first.
3. Expand to the remaining hybrids once the necessary static and dynamic legs are native.

## Done Criteria

This epic is done when:

- each `HY*` plan has a clear static leg, dynamic leg, and backend expectation
- the live route of a hybrid plan is explicit in both code and UI
- hybrid demos can be validated without guessing which legs are actually active
