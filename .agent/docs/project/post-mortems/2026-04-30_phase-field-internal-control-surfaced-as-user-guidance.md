# Post-Mortem: 2026-04-30 - Phase-Field Internal Control Surfaced As User Guidance

## What Happened

After shipping the `metaball_grid_phase_field` prototype, I told the user to seek out and adjust `Derived Geometry Input` as part of the feature's visible tuning surface.

That was the wrong instruction.

`Derived Geometry Input` in `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte` and `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte` is an internal pipeline selector for upstream territory geometry compilation (`power_voronoi_0319` vs `canonical_vector`). It is not a player-facing phase-field control, and it is not even good primary UX for a developer who is trying to evaluate the feature visually.

I answered from the implementation graph instead of from the human experience of using the feature.

## Root Cause

### 1. I treated architecture visibility as UX completeness

The feature was runtime-complete enough that I could trace it through the renderer stack, so I described the surfaces that existed in code rather than the surfaces that should matter to a person.

That is an architecture-first answer, not an end-to-end product answer.

### 2. I leaked an internal boundary into the primary tuning story

`Derived Geometry Input` is an upstream source-of-truth switch. Changing it does not mean "make the phase-field look sharper" or "make the transition read more clearly." It changes which geometry compiler the renderer derives from.

That is internal ownership and debugging language. It should not have been presented as normal feature guidance.

### 3. I used shared-control availability as a proxy for suitability

Because the mode reuses shared geometry infrastructure, the control is technically live. I let "technically live" become "appropriate to recommend."

That is the wrong bar. A live control can still be the wrong control to expose or recommend.

### 4. I did not hold the sprint to a UX-legibility standard

The real user outcome here was: can a human enter the game, switch to the new mode, and immediately understand what changed, what matters, and what to adjust?

The answer was no. I had implemented a renderer path, but I had not completed the experience.

## Impact

### Human developer impact

Even for a developer of this game, `Derived Geometry Input` is poor primary UX:

- it describes implementation provenance, not visible outcome
- it makes renderer comparison unstable because it changes the base territory truth, not just the style layer
- it forces the developer to reason about pipeline names instead of visual intent
- it blurs the distinction between "debug the geometry compiler" and "tune the mode"

That is bad DX. A developer should be able to evaluate the phase-field mode without mentally decoding the territory architecture.

### New-player impact

For a random player, this is completely unsuitable:

- `Derived Geometry Input` has no intuitive meaning
- `Power Voronoi (0319)` and `Canonical Vector` are project-internal terms
- the control gives no clear promise about what will change on screen
- the user can change a foundational input without understanding that they are no longer comparing the same underlying territory shape

This violates basic UX clarity. A player should never need to understand upstream geometry compilation to appreciate or tune a conquest visual effect.

## Mistaken Reasoning

My mistaken reasoning was:

- the control exists
- the mode consumes it
- therefore it belongs in the guidance I give the user

That logic ignores the actual responsibility of end-to-end feature development.

End-to-end ownership means I am responsible not only for whether the mode renders, but also for whether the path to using it is coherent, teachable, and appropriate for the audience.

I described the feature like an engine maintainer talking to another engine maintainer. The user needed product guidance.

## Why This Was Not Responsible End-To-End Work

Responsible end-to-end work has to terminate in a good human experience.

That means:

- the main control surface should be phrased in outcome language
- the default path should produce the intended result without architecture knowledge
- internal switches should be hidden, demoted, or clearly marked as developer-only diagnostics
- a mode should not rely on the user manually discovering the "correct" upstream compiler just to see what the mode is supposed to be

I failed that standard here.

If changing the geometry source is necessary to make the mode look right, then that is not "advanced tuning." It is a sign that the implementation has not fully owned its inputs or defaults yet.

## What I Should Do Differently

### 1. Separate user-facing tuning from internal diagnostics

`Derived Geometry Input` should not be part of the primary tuning story for this mode.

Better options:

- move it into a developer-only diagnostics or geometry-lab surface
- collapse it behind an advanced disclosure with explicit debug framing
- remove it from this flow entirely if the mode should own its source geometry internally

### 2. Expose outcome-based controls instead of pipeline names

For phase field, the primary controls should answer visible questions such as:

- how dense are the reveal cells
- how sharp or soft is the frontier
- how much border emphasis is present
- how fast or wide is the reveal wave
- how geometric vs organic the territory surface feels

Those are meaningful levers. `Power Voronoi (0319)` is not.

### 3. Make the mode opinionated by default

If `metaball_grid_phase_field` is intended to read best from one geometry source, the mode should default to that source or enforce it internally.

The user should not need to discover a hidden implementation dependency to get the intended result.

### 4. Validate the feature from the user's point of view before calling it complete

Before I report a sprint as complete, I should ask:

- can a person find the mode easily
- can they see the difference without a developer explanation
- do the surfaced controls describe visible outcomes
- are any recommended controls actually debug controls in disguise

If the answer is no, the feature is not end-to-end complete yet, even if the runtime path exists.

### 5. Keep renderer evaluation on a stable truth surface

When comparing renderer modes, the base ownership geometry should stay stable unless the task is specifically to debug geometry compilation.

Otherwise the user is not evaluating one visual family against another. They are changing both the base truth and the presentation at once.

## Corrective Actions

- Do not recommend `Derived Geometry Input` as a normal phase-field tuning surface again.
- Treat it as an internal geometry/debug selector unless and until the product explicitly needs that comparison surface.
- Reframe future phase-field guidance around the controls that produce visible, local, understandable changes: cell density, cell shape, inset, border treatment, frontier emphasis, and transition timing.
- If phase-field still depends materially on the geometry source to read correctly, treat that as unfinished integration work rather than acceptable user burden.

## Derived Rule

Never present an internal pipeline selector as primary feature UX.

More concrete rule:

- if a control is named in renderer/compiler/source-of-truth language, it is probably a diagnostics surface, not a main tuning surface
- if a feature requires that control to "work right," the feature is not finished end-to-end
- user guidance must be written in terms of visible outcomes, not implementation provenance

## Generalized Principles

- UX is the real delivery boundary. Runtime-complete is not feature-complete.
- Internal architecture is not product guidance. Live/debuggable does not mean user-facing.
- Defaults are part of the feature. If users must discover hidden setup to get the intended result, the feature is unfinished.
- One surface, one concern. Do not mix source-of-truth switches with appearance tuning.
- Use outcome language, not implementation language. Controls should describe what changes on screen.
- Keep comparison surfaces stable. When evaluating a visual mode, hold the underlying truth constant.
- Shared controls are not automatically good controls. Technical availability is not UX permission.
- Advanced controls must be explicitly framed as advanced. Hidden complexity is still complexity.
