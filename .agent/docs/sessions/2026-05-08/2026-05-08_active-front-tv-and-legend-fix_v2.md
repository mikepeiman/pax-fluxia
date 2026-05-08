# 2026-05-08 - Active Front TVs, Legend Unification, And Dual-Conquest Defect Diagnosis

## What was wrong

- TVs were not driving the rendered no-split active front geometry.
- The no-split local change window still used bad front-to-front projection, which skewed single-point fronts and left endpoint gaps near the CAs.
- The live overlay legend and exported render legend had drifted apart.
- Not every rendered symbol had a legend entry.
- The supplied snap package showed a real planner defect, not just bad rendering:
  - one local frontier was a valid active front
  - the other was a missing corresponding frontier case around a self-anchored / world-bound run

## What changed

- Added one shared active-front diagnostics style source:
  - `pax-fluxia/src/lib/territory/devtools/activeFrontDebugStyle.ts`
- Switched both the live HUD legend and exported debug renders to that one shared legend/style source.
- Added explicit legend entries for:
  - `PRE front`
  - `POST front`
  - `Active front`
  - `No-motion front`
  - `Defect front (missing corresponding frontier)`
  - `Defect front (split/merge mismatch)`
  - `Stable anchor`
  - `Change anchor`
  - `Defect anchor`
  - `Transition vertices (TVs)`
  - `Sample points`
- Made exported change-anchor symbols match the live overlay.
- Reworked no-split active-front correspondence so the local window is derived from true `PRE` and `POST` change spans, not nearest-point projection.
- Made the rendered active-front section use the correspondence TVs directly as section geometry.

## Exact defect diagnosis from package `14-14-52---673_cq_S16-to-S28_S40+1-to-S26_snap_tdp`

- There are `2` local front candidates in the same conquest area.
- One is a real planned active front.
- The failed red defect front is not random or misplaced.
- It is a `missing corresponding frontier` case:
  - `PRE` contains a local frontier run between unchanged anchors
  - `POST` does not preserve one corresponding run for that same local conquest locus
  - instead it fractures into self-anchored / world-bound fragments
- Current planner result:
  - valid local front gets animated
  - fractured local front is classified as defect and snaps

## Validation

- `bunx vitest run pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts pax-fluxia/src/lib/components/ui/settings/settingsSearch.test.ts pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts`
- `bun run build` in `pax-fluxia/`

## Next

- Re-test live conquest motion with the new no-split TV-driven front.
- Then handle the remaining dual-conquest defect case explicitly as a planner correspondence problem, not a rendering problem.
