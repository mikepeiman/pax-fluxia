# Feature And Task Queue - 2026-05-20 - Grid Gradient Fill Transition

## Completed

- Implement Grid Gradient conquest fill transition in the existing render-family shader-field path.
- Add presentation-only blending for fill marks that touch, or sit within a tunable range of, ownership borders.
- Surface tuning controls in the existing Grid Gradient settings panel.

## Validation

- Focused Grid Gradient packing/scene tests passed.
- `bun run build` in `pax-fluxia/` passed.
- `svelte-check` remains blocked by pre-existing repo-wide errors outside this change area.
- User visual verification: select Grid Gradient, use Shader Field backend, trigger conquest, and confirm old marks shrink/fade while new marks grow/fade without moving vector borders.

## Follow-Up Candidates

- If border blending is too local, consider expanding neighbor sampling from adjacent grid cells to a small radius kernel.
- If conquest should feel more directional, tune the existing wave seeding/geometry settings before adding any new transition source.
