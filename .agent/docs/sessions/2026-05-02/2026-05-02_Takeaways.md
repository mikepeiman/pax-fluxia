# Takeaways - 2026-05-02

## Technical

- The decisive bug was not the slider math by itself. It was ownership drift:
  - blended border mode had its own fill-shaping path
  - boundary fill controls were tied to transition scene roles instead of the ownership frontier
- `Centered-blended borders` must stay border-only. When a border-style toggle starts owning fill geometry, the renderer becomes impossible to reason about.
- For this surface, `native` / `dispossessed` / `emergent` / `vacating` are transition semantics, not steady frontier ownership semantics. They are the wrong owner for steady-state fill contraction.
- A border-only contract is still insufficient if the border path coordinates are owned by a different geometry than the visible fill. Border ownership includes the stroke path, not just the layer toggle.
- Another failure mode is path misidentification: the live issue was on `marching_triangles_gradient`, while several fixes targeted the shared-edge control path. Reading the live settings file earlier would have avoided that.
- In contour techniques, pairwise blended border construction and fill ownership must be separate contracts. Reusing the same pair-layer source for both is what made `Centered-blended borders` secretly alter fill.

## Process

- The user's comparison of two visible modes was the highest-value debugging input:
  - `centered-blended off` = working reference
  - `centered-blended on` = broken branch
- That should have driven a direct code diff much earlier.

## Pending

- Live visual verification is still required.
- Transition-end jank remains queued after this fix.
- `Inward Offset` must be redefined around frontier distance ownership, not frontier-adjacent cell ownership.
- A viable fallback / stylistic variant is stepped square distance bands that create a pixellated moat.
- Offset/moat tuning should become its own top-level UI surface, not remain buried inside styles.
- End-transition jank is now explicitly specified as a 1-3 frame handoff pop between final transition frame and first steady-state frame.
- The current frontier FX plan is not 100% aligned with existing VFX architecture yet:
  - surface-local frontier shaping is aligned with the family/shared frontier library direction
  - timed/emitted frontier FX is not yet aligned unless the territory VFX contracts are extended
- The current territory VFX runtime is narrow:
  - events: `territory_conquest_start`, `virtual_star_spawn`, `territory_retreat`
  - commands: `spawn_particles`, `play_sound`, `debug_marker`
- The user-provided territory VFX taxonomy already exists in the repo and is a useful planning target:
  - `.agent/docs/plans/2026-04-09/2026-04-09 Pax Fluxia review dump, human-manual.md`
