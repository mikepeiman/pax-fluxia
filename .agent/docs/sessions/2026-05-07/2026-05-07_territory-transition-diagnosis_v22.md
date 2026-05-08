# 2026-05-07 - PVV4 TV Controls And Persistent Last-Conquest Overlay

## Scope

Direct response to three concrete gaps on the active PVV4 branch:

1. `TV` control was not exposed in the PVV4 transition controls.
2. The diagnostics overlay could not reliably hold onto the last conquest, especially on failed/snap conquests.
3. Transition vertices were not visually clear enough in the live overlay.

`TV` = `transition vertex`.

## Runtime Changes

- Added `pvv4TransitionVertexCount` to territory tunables.
- Wired that tunable from the existing shared config variable:
  - `TERRITORY_MORPH_CONTROL_POINTS`
- Exposed it in the PVV4 transition settings panel as:
  - `Transition Vertices (TVs)`

## Overlay Changes

- Added diagnostics toggles for:
  - `Show last conquest overlay`
  - `Transition vertices (TVs)`
- Live overlay now captures the last conquest snapshot whenever a conquest occurs, including defect/snap captures.
- Live HUD summary now reports:
  - evaluation
  - fronts
  - pairs
  - no-motion
  - defects
  - TV count
  - `source=last conquest` when that toggle is active

## Visual Change

- TV correspondence lines are now stronger.
- Active TVs now render with their own dedicated color and larger dots.
- PRE/POST sample dots are smaller so the active TVs read clearly instead of blending into the front colors.

## Validation

- `bun vitest run src/lib/territory/integration/TerritorySettingsBridge.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts src/lib/territory/devtools/activeFrontClassificationOverlay.test.ts src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts`
- `bun run build`

## Important Limitation

This checkpoint improves control exposure and diagnostic visibility.

It does **not** claim that the live conquest motion is now fully correct in all cases. The remaining question is gameplay truth: whether the visible active-front motion now matches the specified PVV4 transition algorithm across real conquest cases.
