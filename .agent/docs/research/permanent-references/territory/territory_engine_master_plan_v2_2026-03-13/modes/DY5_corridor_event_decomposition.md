# DY5 Corridor Event Decomposition

## Plain-Language Explanation

`DY5` updates territory by recognizing event types in the local corridor or lane structure and recomputing only the pieces those events actually disturb.

## Current Implementation State

- Status: partial
- Native maturity: not yet native end-to-end
- Current role: strongest current dynamic comparison path and one of the most promising next native dynamic candidates

## Current Live Routing And Backend Reality

- Live only when `dynamic` mode is active and `DY5` is selected
- Current backend reality: adapter-backed through `PVV3`
- Current anchor static route: `FG2`
- Route truth for this path has already been verified in the UI and docs

## Target Shape

`DY5` should become the native event-driven dynamic method built on corridor taxonomy, dirty-region management, and explicit anchor rules.

## Backend Fit

- `PVV3`: strongest fit because it is the active renderer host and already carries this dynamic comparison path
- `PVV2`: maintained parity target
- `DF`: useful parity target for dirty-region validation

## Dependencies

- `DY-000` shared persistent frontier and holding IDs
- canonical `FG2` anchor artifacts
- route-truth validation and screenshots

## Atomic Tasks

- `DY-000` Add persistent frontier and holding IDs plus a shared delta-event substrate
- `DY5-001` Define corridor-event taxonomy and dirty-region manager
- `DY5-002` Implement event-driven recompute and publish path with explicit anchor rules

## Acceptance Checks

- Event taxonomy is explicit and maps to predictable recompute behavior
- Dirty-region updates stay local without breaking route truth
- Anchor rules are documented so UI selections cannot mislead validation

## Screenshot And Demo Scenarios

- Dynamic `DY5` on medium, high-churn, and enclave maps
- One screenshot proving route truth and backend truth for `DY5`
- One screenshot sequence showing a localized update that does not perturb unrelated territory

## Stop Conditions

- Stop if event-driven updates are fast but route truth remains ambiguous
- Stop if locality is claimed without a screenshot or trace showing what remained unchanged
