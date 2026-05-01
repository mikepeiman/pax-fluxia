# Post-Mortem: 2026-05-01 — Phase-Field Shape Sliders Disabled While +/- Nudges Stayed Live

## What Happened
The Phase Field `Shape` subsection exposed three controls:

- `Border Chaikin Passes`
- `Shared Edge Smoothing`
- `Shared Edge Trim`

The user correctly reported that the sliders were non-interactive by drag, while the `+/-` controls still worked.

This was not a browser or CSS slider defect. It was an implementation defect introduced by the agent.

## Exact Failure Mechanism
The three range inputs in [MetaballGridTuning.svelte](C:/Users/mikep/.codex/worktrees/bea2/pax-fluxia/pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte) are explicitly disabled in these cases:

- `disabled={isPhaseEdgesMode() || !usesGridEdgeShapingControls()}`
- `disabled={!usesGridEdgeShapingControls()}`

The gating function is:

- `usesGridEdgeShapingControls() = currentBorderMode() === 'territory_edge' && !usesGeometryFrontierBorders()`

So when Phase Field is using the smooth territory-outline border path, those sliders are intentionally disabled.

But the settings panel also mounts the global `nudgeSliders` action in [GameSettingsPanel.svelte](C:/Users/mikep/.codex/worktrees/bea2/pax-fluxia/pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte), which auto-wraps every `input[type="range"]` and injects `+/-` buttons from [nudgeSliders.ts](C:/Users/mikep/.codex/worktrees/bea2/pax-fluxia/pax-fluxia/src/lib/components/ui/settings/nudgeSliders.ts).

Those injected buttons do not respect `input.disabled`. They:

- read the slider min/max/step/value
- set the input value via the native setter
- dispatch a synthetic `input` event

So the result is a contradictory control:

- drag path: blocked
- nudge path: still active

That is why the user saw a "defective slider."

## Why This Happened
The agent made three bad decisions together:

1. It tried to encode semantic truth by disabling the sliders when the active border path would not use them.
2. It left those same controls visibly present instead of removing them or making them read-only.
3. It forgot that the shared `nudgeSliders` action bypasses the browser's disabled interaction model unless it explicitly checks `input.disabled`.

This is not an exotic bug. It is a straightforward failure of end-to-end control ownership.

## Mistaken Reasoning
- "The control is semantically inactive, so disabling the range is enough."
- "The shared `+/-` affordance is harmless infrastructure."
- "If the visible slider cannot drag, that is acceptable because the control is intentionally inactive."

All three are wrong.

If a control is on screen, the full control surface must agree on whether it is interactive:

- slider track
- thumb drag
- keyboard focus
- nudge buttons
- value text
- explanation copy

The agent reasoned locally about the range input and ignored the whole interaction surface.

## Why This Is A Serious UX Failure
To a human, the UI says:

- here is a live control
- here is a slider thumb
- here are nudge buttons

But the actual behavior is:

- one interaction path is dead
- another interaction path still works

That destroys trust quickly because it reads as sloppy or broken. It also forces the user to debug the UI instead of tuning the game.

## Diagnostic Method
The defect was traced from symptom to ownership:

1. Inspect the three reported controls in `MetaballGridTuning.svelte`
2. Confirm they use plain `<input type="range">`
3. Read the `disabled={...}` conditions
4. Trace shared slider augmentation through `use:nudgeSliders` in `GameSettingsPanel.svelte`
5. Read `nudgeSliders.ts`
6. Confirm the injected buttons never check `input.disabled`

At that point the failure is fully explained.

## Corrective Rule
Never ship a surfaced control whose interaction paths disagree about whether it is live.

More concretely:

- If a control is inactive for the current mode, hide it or replace it with plain read-only status.
- If a control is disabled, every auxiliary affordance for that control must also be disabled.
- Shared UI infrastructure must honor the browser's disabled state unless there is an explicit, deliberate exception.

## Derived Principles
- Visible is a promise.
- Disabled must mean disabled everywhere.
- Shared affordances are part of the control, not decoration.
- Do not solve semantic truth with half-disabled UI.
- End-to-end UX review must include every input path, not just the primary element.
