# MSR Normalized Star Bias - 2026-05-01

## Problem

The old advanced `MSR as star power` surface was fragile for structural reasons:

- baseline `MSR` local frontier clearance and solve-time star resistance were too tightly coupled
- the old `enabled + mode + gain + exponent + cap` math produced cliffs and saturation
- low-end `MSR` values such as `0/5/10` could be unsafe
- `CX`, `LP`, and `DX` could be visually flattened by star-pressure settings

## Correct Model

- baseline `MSR` means local post-solve frontier clearance only
- `MSR = 0` must be exact identity in that clearance pass
- solve-time star resistance is optional advanced behavior
- solve-time star resistance should be a bounded bias in the same unit family as corridor / lane-pair / disconnect virtual-site weights

## Implementation

### Surfaced control

- `TERRITORY_MSR_STAR_BIAS`
- range: `0..2`
- step: `0.05`
- default: `0`

UI ownership remains under `MSR as star power`, but the only normal surfaced control is `Star Bias`.

### Solve-time weighting

Implemented in `pax-fluxia/src/lib/territory/compiler/powerVoronoiWeights.ts`:

```ts
normalizedMsr = localMsrPx / (localMsrPx + 75);
realStarWeight = 75 * 75 * msrStarBias * normalizedMsr;
```

Important detail:

- the formula now uses each star’s resolved local `MSR` radius
- it does not blindly use the global requested `MSR`

That local-per-star feed is applied in:

- `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`
- `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
- `pax-fluxia/src/lib/renderers/PVV3Renderer.ts`
- `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer_DY4.ts`

### Compatibility

Legacy keys remain readable for one migration window:

- `TERRITORY_MSR_STAR_POWER_ENABLED`
- `TERRITORY_MSR_STAR_POWER_MODE`
- `TERRITORY_MSR_STAR_POWER_GAIN`
- `TERRITORY_MSR_STAR_POWER_EXPONENT`
- `TERRITORY_MSR_STAR_POWER_CAP_PX`

But they are no longer surfaced in normal UI. Runtime prefers `TERRITORY_MSR_STAR_BIAS` and only derives a fallback bias from legacy keys when the new key is absent.

## Diagnostics

Diagnostics now show:

- `Requested MSR`
- `Star Bias`
- `Stars Affecting Frontier`
- `Intervals Needing Clearance`
- `Local Repairs Accepted`
- `Local Repairs Rejected`
- `Last Rejection Reason`

## Verification

Executed:

```powershell
bunx vitest run src/lib/territory/compiler/powerVoronoiWeights.test.ts src/lib/config/geometry0319Debug.test.ts src/lib/territory/integration/TerritorySettingsBridge.test.ts src/lib/territory/geometry/minStarMargin.test.ts src/lib/territory/families/buildFamilyGeometry.test.ts src/lib/territory/integration/TerritoryArchitectureRouter.test.ts
```

Result:

- `6` files passed
- `31` tests passed

Filtered `bun run check` on the touched files only surfaced the pre-existing unused CSS warnings in:

- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`

## Remaining Live Verification

- `MSR = 0` should be neutral
- `MSR = 5` and `10` should no longer break regions
- `Star Bias = 0` should leave `CX`, `LP`, and `DX` visibly effective
- increasing `Star Bias` should feel smooth and bounded, not explosive
