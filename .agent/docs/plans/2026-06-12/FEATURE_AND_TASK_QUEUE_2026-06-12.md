# Feature And Task Queue - 2026-06-12

## Active

### Grid Gradient conquest transition continuity and star glow blend

Purpose: preserve the now-visible Grid Gradient fill transition, add a star glow ownership blend on conquest, and remove animation jank where the transition can repeat one or more times.

User-reported state:

- Grid Gradient fill transition is now visible.
- Star glow snaps on conquest and needs to blend-fade.
- Conquest transition animation sometimes repeats once or several times.

Relevant architecture status:

- Territory fill transition remains a render-family presentation path.
- Star glow is a separate star presentation path in `StarRenderer.ts`.
- The transition lifecycle is shared through `buildRenderFamilyTransitionLifecycle()`.
- The implementation was off-spec because pending conquest preview transitions could restart from zero on repeated pre-consume frames, and star visuals held previous owner color until a deadline then snapped.

Implemented correction:

- Stabilized pending conquest preview start times in `GameCanvas.svelte`.
- Passed those stable first-seen times into `buildRenderFamilyTransitionLifecycle()`.
- Reused stable preview start times when the handler-owned active transition entry arrives, so preview-to-active handoff does not restart progress.
- Added star owner blend input from all active render-family transition sessions.
- Changed star owner ring and outer glow to draw previous/new owner color passes with cross-faded alpha during conquest.
- Extended pending conquest visual state with new owner, start time, and duration so fallback star color changes fade instead of snapping.

Validation:

- `bun test src/lib/territory/transitions/renderFamilyTransitionLifecycle.test.ts src/lib/renderers/StarRenderer.test.ts src/lib/territory/families/gridGradient/gridGradientScene.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldShaders.test.ts`
- `bun run build` in `pax-fluxia/` passed. Existing broad Svelte unused-CSS and chunk-size warnings remain unrelated to this pass.

User verification needed:

- In Grid Gradient, trigger conquest and watch the conquered star's ownership ring and outer glow. They should fade between player colors instead of snapping.
- Watch the territory fill transition for a repeated restart at the beginning or after handoff. It should advance once through the conquest.
