# Feature And Task Queue - 2026-05-20 - Grid Gradient Fill Transition

## Completed

- Implement Grid Gradient conquest fill transition in the existing render-family shader-field path.
- Back out the failed dual-mark shader transition, border-proximity blend, and Grid Gradient plan-worker handoff after user verification found no visible update, a large blue overlay, and intermittent multi-second loading stalls.
- Restore the shader-field presentation to the simpler texture-packed color-blend path that previously rendered without the blue overlay.
- Add a narrow local visual transition clock inside `GridGradientFamily` so a freshly built transition plan animates from progress `0` after the plan is available.
- Keep Grid Gradient on the render-family runtime path; no direct renderer path was added.
- Hide the player-facing backend selector; shader field is the normal path, graphics remains an internal fallback visible in diagnostics.
- Remove the failed transition-scale and border-blend controls from the surfaced settings metadata/UI.
- Fix shader-field border offset so a nonzero offset suppresses marks inside the offset band instead of only changing gradient size.
- Adjust `Shader Pulse`, mark jitter, field drift, and packed seed generation to use two-axis cell hashes after user verification showed the first pulse pass still looked column-grouped.
- Add `Fill Style` under Grid Gradient controls so the user can switch between `Pointillist` and `Solid Fill` for geometry verification.
- Align shader-field point fill to the same localized presentation coordinates as solid fill and borders.
- Scope `Shader Noise Roughness (Noise)` so it is disabled when the active fill path cannot consume it, instead of presenting an active no-op control.
- Remove the rejected color power/gamma shader path and replace it with `Fill HSLA` controls.
- Add an agent rule requiring visible control inventory before removing, hiding, renaming, disabling, or making a surfaced control irrelevant.
- Add an agent rule forbidding active player-facing controls that cannot affect the active render path.

## Validation

- Focused Grid Gradient shader/packing/scene plus presentation-space tests passed: 12 tests.
- `bun run build` in `pax-fluxia/` passed with existing unused-CSS and chunk-size warnings.
- Browser smoke confirmed: no blue overlay in screenshot, Grid Gradient selectable and dispatched as `grid_gradient`, WebGL shader-field backend active with no fallback, forced conquest changed ownership, and diagnostics showed `local / transition` with 221 active transition cells before returning to steady.

## Follow-Up Candidates

- Preserve the issue inventory in `.agent/docs/sessions/2026-05-20/grid-gradient-user-issue-inventory.md`; update it whenever new Grid Gradient feedback arrives.
- Reconsider border-proximity color blending only after the baseline shader path is stable again. Do not reuse the reverted alpha-channel border-distance shader as-is.
- If conquest should feel more directional, tune the existing wave seeding/geometry settings before adding any new transition source.
- Decide whether separate interior/edge alpha boosts should remain exposed, move to diagnostics-only, or be removed if they do not produce readable changes.
- Main-thread classification/wave planning is still a performance risk during conquest; any future off-main-thread attempt needs a Grid Gradient-specific worker contract and proof that it cannot leave the old plan visible indefinitely.
