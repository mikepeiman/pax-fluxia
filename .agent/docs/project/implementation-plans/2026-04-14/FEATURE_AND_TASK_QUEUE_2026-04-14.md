# Feature and Task Queue — 2026-04-14

## Active
- Prototype `perimeter_field` experimental territory renderer:
  - ownership-derived base geometry
  - perimeter-vstar-only displayed field
  - conquest-local radial transition override
- Add concise required-reading index for rendering agents.

## Notes
- This experiment explicitly avoids changed-frontier extraction.
- Base ownership truth remains star/snapshot based.
- Prototype implemented in client:
  - new `perimeter_field` render mode
  - canonical-geometry-to-perimeter-sample scene builder
  - conquest-local radial override transition
  - Territory control surface and config wiring
- Added in-game diagnostics and paused scrub tooling for `perimeter_field`:
  - show underlying geometry
  - show perimeter vstars
  - paused transition scrub with current/next/interim overlays
  - semantic control labels/tooltips and explicit perimeter-vstar power control
