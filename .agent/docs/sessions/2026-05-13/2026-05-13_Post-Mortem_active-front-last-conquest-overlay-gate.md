# Post-Mortem: 2026-05-13 - Active Front Last-Conquest Overlay Gate

## What Happened

The user reported that transition vertices were not moving. The screenshot HUD showed `source=frozen-last-conquest` and `progress=0.000`, but I did not identify the simple blocking gate: `Show last conquest overlay` was enabled.

That toggle intentionally freezes the active-front diagnostics overlay at the last captured conquest state. It can hide live transition-vertex motion even when the live transition vertices are moving.

## Failure Characterization

This was careless visual debugging. I treated a gated diagnostic view as live evidence. I then reasoned about geometry and transition code while failing to check the UI state that directly controlled what was visible.

## Root Cause

- I did not perform a gate audit before interpreting the screenshot.
- I did not trace `source=frozen-last-conquest` back to the `Show last conquest overlay` toggle.
- I let implementation investigation outrun the simplest visible explanation.
- I over-weighted prior browser evidence instead of reconciling it with the exact screenshot HUD state.

## Impact

- I created unnecessary confusion about whether transition vertices were moving.
- I challenged the wrong layer first.
- I wasted debugging time and reduced trust in the diagnostics work.
- I risked making code changes for a visibility-state problem.

## Corrective Rule

Before diagnosing any visual overlay or animation failure, identify every UI/debug gate that can change what is displayed. Report those gate states before claiming the renderer, planner, or geometry layer is failing.

Required gate audit for active-front transition diagnostics:

- `Show active front diagnostics`
- `Show last conquest overlay`
- live versus frozen overlay source
- displayed transition progress
- selected territory render mode
- pause/freeze conditions

## Operational Check

If an overlay reports `source=frozen-last-conquest`, do not use it as evidence for live animation behavior. Turn off `Show last conquest overlay`, then observe the live source during an active conquest.

## Lesson

When a visual diagnostic is mediated by UI toggles, the first suspect is the selected diagnostic view, not the geometry algorithm.
