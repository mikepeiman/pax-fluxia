# 2026-05-07 - Territory Transition Diagnosis v21

## What changed

- Replaced the live no-split PVV4 motion core with a real active-front correspondence path.
- `ActiveFrontTransition.ts` now:
  - computes a local change window for no-split fronts
  - builds equal-number monotonic `PRE` and `POST` active-front vertices
  - lerps those vertex pairs directly for the active front
  - exposes that correspondence for diagnostics/export via `getActiveFrontMonotonicCorrespondence(...)`
- `TransitionDiagnosticsAdapters.ts` now draws `front_reference.png` from the same correspondence data the runtime uses, instead of the older whole-path normalized approximation.

## Why this matters

- This is the first checkpoint on this branch where the active-front motion core is actually aligned with the specified `PRE front -> POST front -> equal-number monotonic change vertices -> lerp` algorithm for the no-split case.
- The package render should now show the real active-front correspondence instead of misleading proxy lines.

## Scope limits

- This checkpoint corrects the no-split motion core directly.
- Split/merge fronts still use whole-front monotonic resampling, not a richer branch-local active-front construction.
- Defect classification itself was not rebuilt in this checkpoint.

## Files changed

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

## Validation

- `bun vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun vitest run src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts src/lib/territory/devtools/TransitionBundleSerializer.test.ts`
- `bun run build`
