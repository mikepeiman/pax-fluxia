# Post-Mortem - 2026-04-13 - Metaball Transition Gate And False Completion

## What went wrong

I said the first Metaball conquest transition was implemented, but the ordinary runtime still did not reliably use the transition-capable path.

Two separate mistakes created that gap:

- I wired the conquest transition samples only into the family-built Metaball scene path, while ordinary `metaball` rendering in `GameCanvas` still branched on `USE_RENDER_FAMILIES`.
- Even on the family path, the conquered target star was still rendered at full new-owner strength immediately after conquest, which visually flattened the temporary advancing and retreating transition samples.

That meant the code technically contained transition samples, but the live presentation either bypassed them or visually canceled them.

## Root cause

- I stopped at "the code path exists" instead of tracing the complete runtime path the user was actually using.
- I treated `USE_RENDER_FAMILIES` as an acceptable transitional runtime gate for Metaball, even though the only Metaball path with conquest transitions lived behind that gate.
- I verified the existence of transition samples in unit-level scene assembly, but I did not ask the harder question: "what is the visible winning influence field after the conquered star flips owner immediately?"
- I declared progress too early without proving that ordinary gameplay produced an observable transition.

## Impact

- Wasted user time on a branch that was supposed to be focused on renderer work.
- Reduced trust because I reported a Metaball transition implementation that was not visibly present in normal use.
- Added avoidable back-and-forth around settings and mode-path tracing before the real runtime boundary was corrected.

## Motion-surface variables audited

For the Metaball conquest handoff, I explicitly rechecked these active controls before changing behavior:

- `TERRITORY_TRANSITION_MS`
- `TERRITORY_TRANSITION_BIND_TO_TICK`
- `BASE_TICK_MS`
- `METABALL_STRENGTH_MULT`
- `MODIFIED_VORONOI_CORRIDOR_ENABLED`
- `MODIFIED_VORONOI_DISCONNECT_ENABLED`
- `TERRITORY_CX_CONTEST_MIDPOINT_VSTARS`
- `TERRITORY_CX_WEIGHT`
- `TERRITORY_DX_WEIGHT`
- `METABALL_FILL_FOLLOWS_GEOM`

No new transition control was introduced in this fix. The existing transition timing controls remain the authority for duration and tick binding.

## Fix applied

- Removed the runtime split for normal `metaball` rendering in `GameCanvas`; ordinary Metaball now always renders through the family-built scene-input path.
- Kept the family-built scene as the single place where Metaball ownership-adjacent samples are assembled: real stars, CX virtuals, DX virtuals, and conquest transition samples.
- Made the conquered target star's base Metaball influence ramp in over transition progress instead of appearing at full strength immediately.
- Strengthened the advancing attacker sample and retreating previous-owner sample so the handoff is materially visible.
- Added a focused scene-builder assertion that the conquered target sample is suppressed during transition instead of remaining full-strength.

## Validation I ran

- `bunx vitest run src/lib/territory/families/metaball/buildMetaballScene.test.ts src/lib/territory/disconnect/buildDisconnectVirtualSites.test.ts`
- `bunx tsc -p tsconfig.json --noEmit --pretty false`
- `bun run build`

All three passed in `pax-fluxia/`.

## Corrective actions

- When I say a renderer feature is implemented, I must trace and state the exact ordinary runtime path that uses it, not just the helper or family path that contains it.
- For territory transitions, I must reason in terms of the final influence field that wins on screen, not just whether temporary samples exist.
- I should not leave one visual mode split across two runtime paths unless both paths are required and explicitly equivalent.

## Rule derived

Before declaring a territory-render transition implemented:

1. Trace the exact mode dispatch from panel setting to render branch.
2. Verify the ordinary runtime path, not only an optional or gated path.
3. Check whether the steady-state owner sample overwhelms the transient samples and makes the transition visually inert.
4. Only then report the feature as implemented, and still ask the user to verify the live visual result.
