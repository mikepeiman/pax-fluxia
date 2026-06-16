# Territory Transition Diagnosis v9

Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Exact correction

Island collapse planning no longer uses boundary-section influence to decide whether a region disappears.

The active PVV4 path now decides collapse from authoritative `previousGeometry.territoryRegions` membership:

- transition planning receives `previousGeometry.territoryRegions`
- a region is collapse-eligible only if:
  - it belongs to the conquered `previousOwner`
  - it has exactly one `anchorStarId`
  - that exact star was conquered on this tick
- collapse center is that star's live position when available

## Files changed

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
- `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`

## Why this is the correct layer

Region disappearance is a region-membership question.

It is not a boundary question.

`primaryStarId` and `secondaryStarId` remain section-local attribution only. They are no longer used to infer island membership for collapse.

## Current scope

This checkpoint corrects the single-star island path.

It does not yet generalize multi-star full-region disappearance onto the same region-membership model. That is the next extension if gameplay still exposes collapse defects beyond islands.

## Validation

- `bun vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`
