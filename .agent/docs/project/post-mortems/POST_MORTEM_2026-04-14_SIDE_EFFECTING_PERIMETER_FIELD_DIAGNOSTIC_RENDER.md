# Post-Mortem: 2026-04-14 - Side-Effecting Perimeter-Field Diagnostic Render

## What Happened
`perimeter_field` conquest capture was implemented by re-rendering diagnostic PREV/NEXT/intermediate frames through `PerimeterFieldFamily.renderSceneToDiagnosticCanvas()`. That helper called `renderMetaball()` on a temporary PIXI container during the live render loop. Because `MetaballRenderer` owns module-global `Graphics` state, that diagnostic re-render mutated and reparented the same live graphics objects used by gameplay. On first conquest, live territory rendering could disappear and the recorder could fail to produce bundles.

## Root Cause
The diagnostic path was designed as if `renderMetaball()` were a pure function over an arbitrary container. It is not. The renderer has shared mutable state and is only safe on the live path. The deeper mistake was architectural: instead of tapping the already-rendered gameplay frame, diagnostics tried to synthesize a second render from the side. That duplicated work, bypassed the real gameplay path, and introduced a hidden stateful dependency.

## Impact
- Live `perimeter_field` territory could vanish at conquest time.
- Transition bundle capture showed zero bundles even when recording was enabled.
- Time was wasted debugging false transition behavior caused by the recorder itself.
- The code path diverged from the user's explicit requirement to capture real gameplay PREV/NEXT/intermediate states.

## Corrective Actions
- Removed the live call site that invoked `PerimeterFieldFamily.buildTransitionDiagnosticCapture()`.
- Switched `perimeter_field` recording to passive live-frame capture from `pf.displayRoot` in `GameCanvas.svelte`.
- Added a capture session in the real gameplay loop:
  - last stable PREV frame is retained while no transition is active
  - live transition frames are recorded directly from the active render output
  - NEXT is finalized from the first settled frame after the transition ends
- Left diagnostics data in `extraDiagnostics` as compact snapshots attached to the real captured frames instead of synthesizing a second renderer path.

## Lessons
- Do not build diagnostics by re-running a stateful renderer from the side.
- If the user says diagnostics must reflect real gameplay, the correct design is to hook into the live render path, not simulate it elsewhere.
- Shared mutable renderer state must be assumed unsafe for offscreen/debug reuse unless proven otherwise.
