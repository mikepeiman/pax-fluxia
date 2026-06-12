# 2026-05-20 - Grid Gradient HSLA Controls

## User Request

The user rejected the `Color Gamma` control and requested HSLA controls. The user also challenged the idea of controls that remain draggable while the active render path cannot consume them.

## Decision

- Removed the Grid Gradient shader post-color power/gamma setting from the surfaced UI and shader-field runtime.
- Added `Fill HSLA` to Grid Gradient controls:
  - Hue Shift: new Grid Gradient-specific palette hue shift in degrees.
  - Saturation, Lightness, Alpha: existing shared territory/metaball fill settings already consumed by Grid Gradient.
- Kept HSLA in presentation/palette construction. Ownership, geometry, and transition data remain unchanged.
- Updated the agent rules: visible controls must either affect the active render path or be visibly scoped/disabled.

## Implementation Notes

- `GRID_GRADIENT_FILL_HUE_SHIFT_DEG` is a Grid Gradient tunable key and settings field.
- `buildGridGradientPalette` applies hue shift plus saturation/lightness before fills, vector borders, and dotted borders consume owner colors.
- The shader field no longer declares or updates `uColorMixPower`.
- `Shader Noise Roughness (Noise)` is disabled when the active shape/fill/backend combination cannot consume it.
- Pointillist sampling controls are disabled when `Solid Fill` is active, except grid sampling rows that can still affect dotted borders.

## Verification Required

- User should verify that Grid Gradient controls show `Fill HSLA`, not `Color Gamma`.
- Hue Shift should visibly rotate player territory colors in pointillist fill, solid fill, vector borders, and dotted borders.
- `Shader Noise Roughness (Noise)` should only be active for shader-field pointillist noise marks.
- With `Solid Fill` active, pointillist-only rows should read inactive rather than accepting changes that cannot affect the fill.
