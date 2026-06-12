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

## Current Follow-Up

### Grid Gradient terminal-frame alignment

User-reported state:

- The star glow transition is improved, but the prior implementation used a wrong timing thought: star glow fallback duration was tied to Conquest `Color Delay` instead of the territory transition duration.
- The final frame of the fill transition does not match the settled NEXT state; the dots are different or in different places.

Correction plan:

- Use `TERRITORY_TRANSITION_MS`, with `TERRITORY_TRANSITION_BIND_TO_TICK` clamping through `resolveTerritoryTransitionDurationMs()`, for the star owner blend duration.
- Keep `CONQUEST_COLOR_DELAY_TICKS` only as the legacy pending `transitionTime` timestamp, not as conquest-transition visual duration.
- Change Grid Gradient transition endpoints so a full-alpha terminal side uses settled/native dot sizing, border-offset suppression, and seed behavior.
- Validate with focused Grid Gradient shader/scene tests, star timing tests, and `bun run build`.

Implemented:

- Added `buildConquestStarOwnerPendingState()` and routed `conquestHandler.ts` pending star owner state through it.
- Updated shader-field and CPU fallback fill rendering so terminal transition sides resolve with settled dot sizing and seed behavior.
- Added regression tests for timing source, endpoint sizing, shader endpoint semantics, and config restoration between tests.

Validation:

- Focused transition/Grid Gradient/star tests passed.
- `bun run build` in `pax-fluxia/` passed with existing unused-CSS and chunk-size warnings.

## Performance Follow-Up

### Grid Gradient conquest jank

User-reported state:

- Transition end now looks smooth.
- Performance jank during Grid Gradient conquest is severe.
- User requires major improvements only and no visual quality compromise.

Investigation summary:

- User Chrome trace screenshots show a `~448 ms` animation-frame/function-call spike.
- Dominant cost is synchronous plan/classification work: `buildGridGradientPlan` about `347 ms`, `buildGridClassification` about `318 ms`, and `resolveOwnerAt` about `302 ms` self time.
- This is CPU ownership classification blocking the main thread, not shader draw cost.

Plan document:

- `.agent/docs/plans/2026-06-12/GRID_GRADIENT_PERFORMANCE_MAJOR_FIX_PLAN_2026-06-12.md`
