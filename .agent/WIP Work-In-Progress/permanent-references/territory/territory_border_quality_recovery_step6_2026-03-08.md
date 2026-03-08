# Border Quality Recovery - Step 6 (2026-03-08)

## Scope
- Milestone: Step 6 from `Border Quality Recovery Plan`.
- Goal: expose explicit border engine choice in UI and gate legacy-only controls by active engine mode.

## Implemented
1. Border engine selector in territory panel:
- Added `Border Engine` segmented control in `ControlsSection-Territory.svelte`.
- Options:
  - `Mesh (Clean)`
  - `Legacy Field (Reference)`
  - `Legacy Grid (Reference)`
- Selector writes through canonical panel path: `updatePanel("dfBorderEngine", value)`.

2. Legacy-control gating:
- High-quality legacy field controls (`High Quality Borders`, `HQ Supersample`, `HQ Max Texture`) now render only when `activeBorderEngine === "legacy_field"`.
- Legacy grid controls (`Vector Borders`, `Vector Grid`, `Vector Straighten`, `Vector Simplify`, `Vector Update`) now render only when `activeBorderEngine === "legacy_grid"`.

3. Compatibility behavior:
- Selecting `Legacy Grid` forces `dfVectorBordersEnabled = true` to keep older theme snapshots compatible with expected legacy-grid behavior.
- If the `Vector Borders` legacy toggle is turned off while in legacy-grid mode, UI auto-routes engine back to `legacy_field`.

## Notes
- This step intentionally keeps legacy controls and legacy engines available as reference/fallback paths.
- Mesh remains the default engine via `GAME_CONFIG.DF_BORDER_ENGINE` default already established in Step 1.