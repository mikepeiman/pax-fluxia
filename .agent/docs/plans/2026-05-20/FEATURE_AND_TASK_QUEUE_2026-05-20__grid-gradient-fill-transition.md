# Feature And Task Queue - 2026-05-20 - Grid Gradient Fill Transition

## Completed

- Implement Grid Gradient conquest fill transition in the existing render-family shader-field path.
- Add presentation-only blending for fill marks that touch, or sit within a tunable range of, ownership borders.
- Surface tuning controls in the existing Grid Gradient settings panel.
- Hide the player-facing backend selector; shader field is the normal path, graphics remains an internal fallback visible in diagnostics.
- Reuse the existing metaball-grid plan worker so transition classification/wave planning no longer runs on the main thread after the initial cached plan.
- Add a Grid Gradient local visual clock so worker-built transition plans animate from the start instead of snapping to the scheduler's already-advanced progress.
- Clarify partially opaque shader controls: edge feather, noise roughness, pulse speed units, and color gamma.

## Validation

- Focused Grid Gradient packing/scene tests passed.
- `bun run build` in `pax-fluxia/` passed.
- `svelte-check` remains blocked by pre-existing repo-wide errors outside this change area.
- Browser smoke selected Grid Gradient without shader/WebGL compile errors. Screenshot capture timed out on the heavy canvas page, so user visual verification is still required.
- User visual verification: select Grid Gradient, trigger conquest, and confirm old marks shrink/fade while new marks grow/fade without moving vector borders. Diagnostics should show local clock / requested plan during the fill transition.

## Follow-Up Candidates

- If border blending is too local, consider expanding neighbor sampling from adjacent grid cells to a small radius kernel.
- If conquest should feel more directional, tune the existing wave seeding/geometry settings before adding any new transition source.
- Decide whether `Color Gamma` and separate interior/edge alpha boosts should remain exposed, move to diagnostics-only, or be removed if they do not produce readable changes.
