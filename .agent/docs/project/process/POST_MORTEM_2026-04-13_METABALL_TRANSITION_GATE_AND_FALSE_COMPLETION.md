# Post-Mortem - 2026-04-13 - Metaball Transition Gate And False Completion

## What went wrong

I said the first Metaball conquest transition was implemented, but live gameplay still snapped immediately to the post-conquest territory state.

There were two real gaps:

- I had initially wired the conquest transition samples only into the family-built Metaball scene path, while ordinary `metaball` rendering in `GameCanvas` still branched on `USE_RENDER_FAMILIES`.
- After removing that gate, the scene still built its base clusters and corridor geometry from the already-conquered ownership state. That meant the attacker-target lane immediately became a same-owner connection, so the base topology snapped to the new state before the transition samples had any chance to read on screen.

That meant the code technically contained transition samples, but the live presentation either bypassed them or overrode them with already-flipped base topology.

## Root cause

- I stopped at "the code path exists" instead of tracing the complete runtime path the user was actually using.
- I treated `USE_RENDER_FAMILIES` as an acceptable transitional runtime gate for Metaball, even though the only Metaball path with conquest transitions lived behind that gate.
- I verified the existence of transition samples in unit-level scene assembly, but I did not ask the harder question: "what ownership/topology view is the base influence field using while the conquest transition is active?"
- I reasoned about extra samples without first checking whether base clusters, CX lanes, and disconnect handling were still being built from the instant post-conquest state.
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
- Made the base Metaball scene transition-aware by holding an actively conquered target on its `previousOwner` for base cluster/corridor/disconnect construction while the handoff is in progress.
- Reduced that transitioning target's base strength over progress so the old owner weakens in place instead of disappearing instantly.
- Made the new-owner advancing sample grow over time toward the target, and the old-owner retreat sample peel away from the target instead of duplicating the old owner at full strength from frame one.
- Added a focused scene-builder assertion that the conquered target remains on a different owner cluster than the attacker while the transition is active, and that the new-owner advancing sample is present.

## Validation I ran

- `bunx vitest run src/lib/territory/families/metaball/buildMetaballScene.test.ts src/lib/territory/disconnect/buildDisconnectVirtualSites.test.ts`
- `bunx tsc -p tsconfig.json --noEmit --pretty false`
- `bun run build`

All three passed in `pax-fluxia/`.

## Corrective actions

- When I say a renderer feature is implemented, I must trace and state the exact ordinary runtime path that uses it, not just the helper or family path that contains it.
- For territory transitions, I must reason in terms of the final influence field and topology that win on screen, not just whether temporary samples exist.
- I should not leave one visual mode split across two runtime paths unless both paths are required and explicitly equivalent.
- For ownership-driven renderers, I must explicitly decide which ownership snapshot drives the base geometry during transition: previous state, next state, or a blended model.

## Rule derived

Before declaring a territory-render transition implemented:

1. Trace the exact mode dispatch from panel setting to render branch.
2. Verify the ordinary runtime path, not only an optional or gated path.
3. Identify which ownership/topology snapshot the base geometry is using during the transition window.
4. Check whether the steady-state owner sample or post-conquest topology overwhelms the transient samples and makes the transition visually inert.
5. Only then report the feature as implemented, and still ask the user to verify the live visual result.
