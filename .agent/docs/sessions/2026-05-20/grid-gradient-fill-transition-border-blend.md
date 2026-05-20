# 2026-05-20 - Grid Gradient Fill Transition and Border Blend

## Scope

Grid Gradient remains a render-family mode. The work is presentation-only: PV ownership and territory geometry still decide previous/next owner, border distance, and wave timing. The shader field renderer now uses those existing inputs to animate fill marks and blend marks near ownership borders.

## Conquest Fill Transition

- Runtime path: `GridGradientFamily` -> shader field texture plan -> `GridGradientShaderFieldRenderer`.
- Inputs: previous owner index, next owner index, cell role, and `GridWavePlan.flipTimeByVId`.
- Behavior: changed cells draw two marks during the flip window. The old owner mark shrinks and fades out while the new owner mark grows and fades in. Native and unchanged cells draw one stable mark.
- Tunables:
  - `METABALL_GRID_FLIP_TRANSITION`
  - `METABALL_GRID_FLIP_WINDOW`
  - `GRID_GRADIENT_SHADER_TRANSITION_SCALE_MIN`

## Border-Proximity Blend

- Runtime path: shader field only.
- The metrics texture now stores raw nearest-border distance in its alpha channel. The old hash seed was replaced by a deterministic shader hash from cell coordinates and owner indices.
- A fill mark blends toward adjacent opposing owner colors when the mark touches the border or falls within `GRID_GRADIENT_BORDER_BLEND_RANGE_PX`.
- Tunables:
  - `GRID_GRADIENT_BORDER_BLEND_RANGE_PX`
  - `GRID_GRADIENT_BORDER_BLEND_STRENGTH`

## Boundary Notes

- Ownership: unchanged; still supplied by the existing owner index, previous owner, and next owner classification data.
- Geometry: unchanged; still supplied by PV and the existing grid classification/distance-field plan.
- Transition: uses the existing `GridWavePlan` flip timing instead of creating a separate runtime truth.
- Presentation: shader-only dual-mark transition and border color blending.

## Validation Targets

- `gridGradientShaderFieldPacking.test.ts` should assert raw border-distance packing in the metrics texture.
- Build should verify Svelte settings surfaces and TypeScript wiring.
- Visual verification should check that conquest flips show old marks shrinking out and new marks growing in, and that border-adjacent marks mix opposing colors without moving vector borders.

## Validation Completed

- `bunx vitest run src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts src/lib/territory/families/gridGradient/gridGradientScene.test.ts src/lib/components/game/territoryPresentationSpace.test.ts`
  - Passed: 3 files, 10 tests.
- `bun run build`
  - Passed. Existing CSS/chunk warnings remain.
- `bunx svelte-kit sync`
  - Passed.
- `bunx svelte-check --tsconfig ./tsconfig.json`
  - Failed on existing repo-wide type debt outside this change area, including archived UI, map editor, and territory orchestrator type issues.
