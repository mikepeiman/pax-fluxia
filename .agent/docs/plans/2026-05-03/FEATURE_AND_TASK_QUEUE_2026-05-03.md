# Feature And Task Queue - 2026-05-03

## Active

- Continue `metaball_grid_phase_edges` performance and memory stabilization.
- Preserve the accepted look exactly:
  - no visual regressions
  - no responsiveness regressions
  - no downsampling / coarse fallback hacks

## Current pass

- Add precise diagnostics for the live Phase Edges hot path.
- Use those diagnostics to target one more structural runtime reduction.
- Revalidate with targeted tests, benchmark hooks, and production build.
- Diagnostics added in this pass:
  - Phase Edges captured-session rebuild events and plan-build timing
  - scene owner occupancy timing
  - owner-layer timing
  - pair-layer timing
  - localized territory-presentation cache hit/miss/eviction stats
- Runtime reduction added in this pass:
  - avoid cloning the base scene-cell array unless captured-session overlays are actually present
  - continue reusing owner occupancy grids in the live Phase Edges path

## Next

- Re-profile the exact live 6px scenario after the next structural slice.
- If stable, move to the queued end-transition 1-3 frame pop audit.
