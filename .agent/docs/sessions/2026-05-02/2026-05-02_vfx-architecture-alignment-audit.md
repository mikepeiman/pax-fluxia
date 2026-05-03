# VFX Architecture Alignment Audit - 2026-05-02

## Question

Is the current frontier FX plan for `metaball_grid_phase_edges` fully aligned with the repo's existing VFX architecture guidance?

## Short Answer

No. It is directionally aligned, but not 100% aligned yet.

## Governing References Found

Use these in this order for this topic:

1. `.agent/docs/plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
2. `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
3. `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
4. `.agent/docs/game/vfx/VFX_TIMING_MODEL.md`
5. `.agent/docs/game/vfx/ANIMATION_GUIDE.md`
6. `.agent/docs/plans/2026-04-09/2026-04-09 Pax Fluxia review dump, human-manual.md`

## What These Docs Actually Say

### Territory runtime shape

- The repo is mixed-runtime today.
- `metaball_grid_phase_edges` is render-family work, not the coordinator-driven pipeline runtime.
- The old 4-layer territory doc is still useful for intent, but the current-state doc says not to pretend all modes already live behind one runtime shape.

### VFX ownership

- The render-family unified plan says runtime-owned territory VFX should come from ownership diffs through a `VFXBus`.
- Families may emit optional `events[]` for fine-grained sync, but VFX should not be invented ad hoc inside each family if it is event/timing driven.
- The timing model is strict: all in-game VFX use one clock, `gameNowMs`.

### Existing territory VFX contract

Current code is much thinner than the taxonomy:

- `pax-fluxia/src/lib/territory/vfx/VFXContracts.ts`
- `pax-fluxia/src/lib/territory/integration/TerritoryVFXBridge.ts`

Current territory events are only:

- `territory_conquest_start`
- `virtual_star_spawn`
- `territory_retreat`

Current command types are only:

- `spawn_particles`
- `play_sound`
- `debug_marker`

That means the current VFX infrastructure does not yet express the richer territory target taxonomy directly.

## Alignment Assessment

### Aligned

- One shared frontier-distance source for multiple effects is aligned with the existing architecture's push toward reusable shared truth instead of one-off renderer hacks.
- Splitting `Frontier FX` into a top-level UI section is aligned with the user's taxonomy and cleaner than burying these controls inside `Territory Styles`.
- Investigating end-transition jank as continuity/timing first, and only then easing/extra hold frames, is aligned with the timing and runtime guidance.

### Not Fully Aligned

- The current frontier FX plan mixes two categories that should be separated:
  - surface shaping / style
  - timed / animated / emitted VFX
- Clean offset and stepped-square moat can live as surface/family presentation controls.
- Hot plasma, ion drift, and geometry-strip pulse effects cross into timed VFX territory and should not stay purely renderer-local if we want to match the existing VFX guidance.
- The current territory VFX bus/contracts are too narrow for that richer taxonomy, so the plan currently outruns the infrastructure.

## Taxonomy Mapping

The user-provided taxonomy fits the repo better than the current territory VFX code does.

For the current frontier work, the cleanest mapping is:

- `VFX_TerritoryGeometryAdjustment`
  - clean offset
  - stepped-square moat
- `VFX_TerritoryFillStyle`
  - fill-side moat shading / banding
- `VFX_TerritoryBorderStyle`
  - blended border look
  - plasma ribbon look
  - geometry strip look
- `VFX_TerritoryFillTransition`
  - end-transition continuity / easing / hold work
- `VFX_TerritoryBorderTransition`
  - same end-transition continuity / easing / hold work for borders

The taxonomy is therefore compatible with the direction of the work, but it is not yet codified in the active code contracts.

## Practical Rule Going Forward

To stay aligned:

- Keep static or continuously sampled frontier surface shaping inside the render family / shared frontier surface library.
- Route event-driven or strongly time-authored frontier FX through explicit VFX contracts:
  - runtime ownership diff
  - `VFXBus`
  - or family `events[]` consumed by a VFX layer

## Recommendation

Treat the frontier work as two tracks:

1. **Surface track**
   - clean offset
   - stepped-square moat
   - fill/border-local shading based on frontier distance

2. **Timed VFX track**
   - plasma pulses
   - ion/ember particle drift
   - animated geometry strip pulses
   - transition-end polish effects

If the timed track is implemented, first extend the territory VFX contracts instead of burying it all in `MetaballGridPhaseEdgesFamily.ts`.
