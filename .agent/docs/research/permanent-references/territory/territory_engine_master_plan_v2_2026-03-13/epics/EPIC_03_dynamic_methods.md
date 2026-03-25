# EPIC 03: Dynamic Methods

## Goal

Build a shared dynamic substrate for identity, events, and localized recomputation, then implement the five dynamic method families on top of that substrate.

## Included Tasks

- `DY-000`
- `DY1-001` and `DY1-002`
- `DY2-001` and `DY2-002`
- `DY3-001` and `DY3-002`
- `DY4-001` and `DY4-002`
- `DY5-001` and `DY5-002`

## Dependencies

- `EPIC_01_foundation_and_contracts`
- native static publishers from `EPIC_02_static_methods`, especially for the paired route each dynamic method depends on

## Execution Order

1. Add shared persistent frontier and holding IDs plus delta-event substrate.
2. Build the most closely related dynamic method on top of its static anchor.
3. Validate that the method preserves route truth and identity continuity.
4. Repeat for the remaining dynamic families.

## Done Criteria

This epic is done when:

- all dynamic methods operate on a shared identity/event substrate
- spawn, split, merge, vanish, and enclave cases are tracked consistently
- each dynamic method has explicit acceptance and visual validation criteria
