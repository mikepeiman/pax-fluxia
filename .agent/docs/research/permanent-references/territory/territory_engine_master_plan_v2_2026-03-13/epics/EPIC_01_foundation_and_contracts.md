# EPIC 01: Foundation And Contracts

## Goal

Establish the new planning source of truth, correct the method-vs-backend architecture language, document current runtime truth, and define the packet format that later execution work will use.

## Included Tasks

- `DOC-001` Create the bundle folder, index, and reading order
- `DOC-002` Write the non-CompSci executive overview
- `DOC-003` Write the glossary and mental-model reference
- `DOC-004` Write the architect-review document
- `DOC-005` Build the current-state matrix for 15 modes x 3 backends
- `DOC-006` Build the validation and demo protocol
- `DOC-007` Create all 15 mode docs with the fixed template
- `DOC-008` Create all 3 backend docs with the fixed template
- `DOC-009` Create the 5 epic docs and task index/template docs
- `ARC-001` Reclassify PVV3 everywhere in the new bundle as an active runtime/backend
- `ARC-002` Define the method-vs-backend separation model
- `ARC-003` Define route-resolution and backend-resolution separately
- `ARC-004` Record the exact live routing truth for `static`, `dynamic`, and `hybrid`
- `ARC-005` Record the exact current status of FG2 as the only native end-to-end method
- `ARC-006` Flag historical docs with stale wording or merge-conflict contamination for later cleanup

## Dependencies

This epic has no prerequisite epic. It must be complete before the later epics are executed as one-shot implementation packets.

## Execution Order

1. Write and index the bundle root docs.
2. Lock the planning vocabulary and current-state truth.
3. Record validation requirements.
4. Generate backend, mode, epic, and task packet docs.
5. Flag historical documents that need cleanup but should not be deleted.

## Done Criteria

This epic is done when:

- the entire bundle exists on disk
- `PVV3` is consistently treated as an active backend
- route truth is explicit enough to explain misleading UI combinations
- every atomic task has a unique packet-ready ID and owner mapping
