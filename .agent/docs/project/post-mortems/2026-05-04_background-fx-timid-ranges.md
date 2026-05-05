# Post-Mortem: 2026-05-04 - Background FX Timid Control Ranges

## What Happened

The background FX controls existed, but their practical output range was too weak. The slider schema stayed in narrow `0..1` or `0..2` bands, many renderer paths clamped values back to `0..1`, and live regional FX were still inheriting the legacy background image opacity path. The user correctly called out that the surface needed roughly `10x-100x` control range.

## Root Cause

- I kept conservative prototype-era ranges instead of treating the surface like a real tuning tool.
- I widened behavior in concept but left internal `clamp01` logic in place, which flattened stronger values back into subtle output.
- I reused `BG_IMAGE_ALPHA` for live FX container opacity, which silently weakened live effects even when the live-mode tunables were increased.

## Impact

- The feature read as underpowered even after it became discoverable.
- Higher slider values would not have produced proportionally stronger visual output.
- Legacy-image compatibility leaked into the live-FX path and reduced the ceiling of the system.

## Corrective Actions

- Expanded shared live-FX tunables to much broader ranges, including `Intensity` up to `24` and several mode-specific controls up to `8-24`.
- Reworked the game and menu background renderers so live-mode tunables above `1` are no longer flattened by `clamp01`.
- Increased count, blur, width, and alpha response curves so density and intensity controls have a materially stronger top end.
- Decoupled live gameplay background opacity from the legacy image opacity path and relabeled the remaining slider as `Legacy Image Opacity`.

## Lessons

- A tuning surface that tops out at “barely noticeable” is not a tuning surface.
- Widening slider metadata is insufficient if the renderer still clamps the values internally.
- Legacy compatibility paths must not silently cap the strength of newer live systems.
