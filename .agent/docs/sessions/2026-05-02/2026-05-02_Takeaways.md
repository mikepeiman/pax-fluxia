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
- The old boundary inset owner was structurally incapable of satisfying the real `Inward Offset` spec:
  - `computeBoundaryInset(...)` clamps to `spacingPx * 0.45`
  - that mathematically limits the effect to roughly one frontier ring
- The first practical fix is not another slider tweak. It is a reusable frontier-distance source that can own:
  - clean offset
  - stepped moat bands
  - later border-adjacent surface shading / timed VFX masks
- The VFX architecture audit is now folded into the implementation plan:
  - surface-track work belongs in the shared frontier/family layer
  - timed/emitted work should extend territory VFX contracts or family `events[]`
- A second practical lesson followed immediately:
  - a distance field alone is not enough if every surviving band is still clipped locally
  - for the clean-offset interpretation, inner bands must suppress wholesale once the requested width reaches the band centerline
- The live `24px` snap was not arbitrary:
  - with `12px` spacing, `24px` landed exactly on the next band boundary
  - widening the slider alone would only move that failure unless the band-suppression rule changed too
- Another concrete renderer failure mode is legacy fallback repaint:
  - the new square-bounds offset path can intentionally return `null` for a fully suppressed square band
  - if the draw loop then falls back to legacy square fill, the visual result will look glitchy, unstable, or capped even if the suppression math is correct
  - suppression must remain authoritative all the way to the final draw loop
- The next clean architectural step after the fill/border fix was not to bury new effects in the existing styles card.
  - a top-level `Frontier FX` section is the right ownership surface
  - it keeps border-adjacent fill VFX separate from topology and separate from basic fill/border styling
- The first three shippable frontier VFX can stay on the surface track:
  - `soft_fade`
  - `stepped_moat`
  - `plasma_rim`
- For correctness, any fill-side VFX that modulates per-cell color/alpha must disable sprite fast fill paths for the active frame unless the fast path itself is upgraded to carry the same modulation.
- Animated frontier FX needs paint invalidation from `nowMs`; otherwise the visuals will silently freeze behind a valid draw-cache signature.
- The next major task remains the end-transition 1-3 frame pop.
  - do not let the new FX work distract from that handoff audit
- UI drift can silently remove core controls without deleting them.
  - In this case `Cell Spacing` and `Grid Density` still existed, but bad applicability gates marked them `.disabled`
  - because shared panel CSS uses `pointer-events: none` there, they were effectively gone
  - core lattice controls for Metaball Grid / Phase Edges must never be gated as if they are only control-path knobs
