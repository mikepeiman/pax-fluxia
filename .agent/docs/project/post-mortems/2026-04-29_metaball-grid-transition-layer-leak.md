# Post-Mortem: 2026-04-29 - Metaball Grid Retained Transition Layer Leak

## What Happened
The retained active-frontier optimization for `metaball_grid` left transition visuals on screen after a conquest ended. Users then saw large areas that continued to look like they were transitioning even when there was no active conquest.

## Root Cause
I introduced retained transition sprite layers in `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts` and only cleared them during the normal steady-state repaint path.

At the same time, the family has an early steady-state paint-skip gate:

- `allowPaintSkip = !input.activeTransition`
- if the new steady-state `paintSig` matched the last transition frame, the method returned early

That early return happened before the retained transition layers were rebuilt away, so the conquest-end cleanup frame could be skipped entirely.

## Mistaken Reasoning
- I treated the retained frontier optimization as purely an active-transition concern and underchecked the transition-to-steady-state boundary.
- I validated the fast path during conquest motion, but I did not explicitly test the `progress=1 -> no activeTransition` handoff.
- I focused on per-frame transition work reduction and missed the lifecycle requirement that retained visuals must force one cleanup repaint before steady-state skipping is allowed again.

## Diagnostic Method
- Re-read the active plan/spec path:
  - `pax-fluxia/docs/gameplay-performance-smoothness-first-plan-2026-04-28.md`
  - `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
- Traced the fast-path layer ownership and the paint-skip gate in `MetaballGridFamily.ts`
- Confirmed the leak boundary:
  - active transition frame records a `paintSig`
  - next steady-state frame can match that signature
  - early return bypasses retained-layer cleanup
- Added a regression test that exercises:
  - conquest frame at `progress=1`
  - immediate next update with `no activeTransition`
  - assertion that retained frontier state and visible transition sprites are cleared

## Derived Rule
Any retained visual layer optimization must explicitly test the lifecycle edge where animation ends and steady-state skipping resumes.

More concrete rule:

- never allow a steady-state early-return path to run while retained transition presentation state is still live
- add one regression test for every `active animation -> steady state` cleanup boundary
