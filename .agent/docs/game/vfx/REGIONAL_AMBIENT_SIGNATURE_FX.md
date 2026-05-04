# Regional Ambient Signature FX

**Date:** 2026-05-04  
**Status:** Proposed - implementation planning complete, code not started  
**Owner lane:** `vfx`  
**Primary worktree:** `C:\Users\mikep\.codex\worktrees\abc9\pax-fluxia`

## Purpose

"developing next-level SFX/VFX for my game backgrounds"

This document locks the intended direction for player-owned regional background effects in Pax Fluxia. The goal is not generic "more particles." The goal is to make each owned region feel alive, sovereign, and cosmetically distinct without damaging gameplay readability or performance.

## Vision

Each player's territory should carry a subtle ambient signature:

- the frontier should feel claimed
- the interior should feel inhabited
- the whole region should occasionally breathe or pulse

These are not hero effects, explosions, or noisy screen spam. They are ambient identity layers.

The correct mental model is:

> owned space should feel "owned and alive" at a glance, but never busy, childish, or unreadable

## Product Goals

- Give each player a strong territorial identity.
- Keep the effects mostly non-gameplay and non-obstructive.
- Make the system themeable, collectible, and pack-friendly.
- Keep the runtime cheap enough for multiple simultaneous players.
- Build a composable system instead of one-off bespoke effects.

## Non-Goals

- No fireworks-style constant spectacle.
- No dense particle spam across every owned region.
- No unique shader program per cosmetic.
- No new ownership, geometry, or transition truth.
- No implementation that only works for one territory mode and forks the architecture.

## Spec Alignment With Current Architecture

Relevant current terminology:

- `territory` = connected same-owner stars and the space within their bounds
- `frontier` = the boundary geometry where territories meet
- `region` = a contiguous area owned by one player

Relevant current architecture:

- territory truth still flows through `ownership -> geometry -> transition -> presentation`
- the repo currently has mixed territory runtime shapes:
  - pipeline runtime
  - render-family runtime
  - direct legacy renderer runtime
- the general game FX system already exists in `pax-fluxia/src/lib/fx/`
- territory-local VFX seams already exist in:
  - `pax-fluxia/src/lib/territory/integration/TerritoryFxBridge.ts`
  - `pax-fluxia/src/lib/territory/integration/TerritoryVFXBridge.ts`
  - `pax-fluxia/src/lib/territory/vfx/`

Current implementation status:

- `FXRegistry` and `FXOrchestrator` are real and usable.
- `territoryTransitionHandler` already bridges conquest events into territory transition state.
- `TerritoryVFXBridge` plus `VFXBus` already support territory-scoped VFX commands.
- No current system provides continuous region-scoped ambient signature FX.
- No current data model exists for per-player ambient cosmetic profiles.

Conclusion:

Regional ambient signature FX should be implemented as a presentation/VFX consumer of existing territory truth, not as a new territory-truth generator.

## Experience Model

There are three design layers, and four practical implementation layers.

### Design layers

#### 1. Frontier layer

What happens near the boundary.

Examples:

- faint shimmer
- drifting sparks
- thin rune tracery
- dust or glow current moving along the frontier

#### 2. Interior ambient layer

What happens softly inside the region.

Examples:

- motes
- haze
- faint streaks
- symbol ghosts
- soft flow lines

#### 3. Accent pulse layer

A rare intermittent event that makes the cosmetic feel premium.

Examples:

- slow heartbeat pulse through owned space
- faint energy wash
- emblem apparition
- ripple through the region

### Implementation layers

In practice the system should be built as:

1. `interior shader`
2. `sparse ambient particles`
3. `frontier treatment`
4. `accent event`

The interior shader is the cheapest always-on base. Frontier treatment carries most of the identity. Particles should stay sparse. Accent events should be rare.

## Core Design Rules

- subtle beats flashy
- low-frequency beats constant churn
- masked shader beats brute-force particles
- frontier identity beats interior clutter
- parameter bundles beat one-off special cases
- presentation-only beats geometry mutation

## Technical Rules

- one shared shader family, not one compiled shader per player
- player-specific uniforms and palettes only
- pooled particles only
- no random per-frame allocations
- no full-region blur passes per player unless proven cheap
- no effect may extend outside owned region bounds except deliberate frontier glow
- all in-game timing must use game time / FX clock semantics, not raw wall time

This follows the existing timing rule in `.agent/docs/game/vfx/VFX_TIMING_MODEL.md`.

## Data-Driven Model

Do not build every cosmetic as a separate code path.

Use a data-driven profile contract:

```ts
type RegionAmbientSignatureProfile = {
  id: string
  displayName: string

  interiorShaderPreset: string | null
  frontierPreset: string | null
  particlePreset: string | null
  accentPreset: string | null

  palette: {
    primary: string
    secondary: string
    glow: string
    shadow: string
  }

  params: {
    intensity: number
    driftSpeed: number
    particleDensity: number
    accentFrequency: number
    borderBrightness: number
    interiorContrast: number
  }

  behaviors: {
    ambientParticleType: 'motes' | 'embers' | 'petals' | 'glyphs' | 'snow'
    flowStyle: 'drift' | 'swirl' | 'wave' | 'rising'
    interiorPattern: 'noise' | 'veins' | 'cloud' | 'runic'
    accentEvent: 'pulse' | 'ripple' | 'flare' | 'symbol'
    frontierBehavior: 'sparkle' | 'crawl' | 'shimmer' | 'arc'
  }
}
```

Important constraint:

- presets define behavior families
- palettes and params define cosmetic variation
- code should not branch per theme name

## Recommended Effect Families

The following families are high-value, subtle enough, and compatible with the game's visual language.

### Celestial / noble / clean

- `Starlit Dust`
- `Nebula Veil`
- `Starstream`

### Arcane / mystical

- `Rune Dust`
- `Leyline Flow`
- `Warding Frontier`

### Elemental

- `Ember Kingdom`
- `Frost Veins`
- `Verdant Spores`
- `Storm Current`

### Regal / imperial

- `Heraldic Ghosts`
- `Banner Light`
- `Court Fireflies`

### Dark / ominous

- `Shadow Mist`
- `Void Fracture`
- `Cinder Veins`

## Best First-Wave Set

The safest first implementation wave is:

### Core Set 1

- `Starlit Dust`
- `Nebula Veil`
- `Ember Kingdom`
- `Frost Veins`
- `Shadow Mist`
- `Banner Light`

### Premium Set 2

- `Leyline Flow`
- `Rune Dust`
- `Storm Current`
- `Heraldic Ghosts`
- `Mycelial Dream`
- `Solar Silk`

Why this order:

- broad aesthetic spread
- clear player identity
- mostly cheap implementation primitives
- high likelihood of looking premium without becoming noisy

## Architecture Recommendation

### Rule: treat ambient signatures as presentation consumers

Ambient region FX must consume territory truth from the existing systems. They must not alter:

- ownership
- geometry
- conquest transition truth
- presentation frame topology

### Recommended runtime split

#### Continuous ambient layers

Belong in a new territory ambient presentation subsystem that reads owned-region geometry each frame.

#### Event-driven accent layers

Belong in the existing `FXRegistry` or territory-local VFX bridge paths when triggered by:

- conquest
- tick cadence
- rare timed pulses
- special premium cues

### Recommended file seams

Add new ambient-specific code under the territory VFX/presentation area, not inside `GameCanvas.svelte`:

```text
pax-fluxia/src/lib/territory/vfx/ambient/
  RegionAmbientTypes.ts
  RegionAmbientProfileRegistry.ts
  RegionAmbientState.ts
  buildRegionAmbientFrame.ts
  computeRegionAmbientInputs.ts
  presets/
    interiorPresets.ts
    frontierPresets.ts
    particlePresets.ts
    accentPresets.ts

pax-fluxia/src/lib/territory/adapters/pixi/
  PixiRegionAmbientPresenter.ts
```

Use existing seams:

- global FX:
  - `pax-fluxia/src/lib/fx/orchestrator.ts`
  - `pax-fluxia/src/lib/fx/FXRegistry.ts`
  - `pax-fluxia/src/lib/fx/handlers/territoryTransitionHandler.ts`
- territory-local FX:
  - `pax-fluxia/src/lib/territory/integration/TerritoryFxBridge.ts`
  - `pax-fluxia/src/lib/territory/integration/TerritoryVFXBridge.ts`
  - `pax-fluxia/src/lib/territory/vfx/VFXBus.ts`
- presentation:
  - `pax-fluxia/src/lib/territory/adapters/pixi/PixiTerritoryPresenter.ts`
  - `pax-fluxia/src/lib/territory/adapters/pixi/PixiFillPresenter.ts`
  - `pax-fluxia/src/lib/territory/adapters/pixi/PixiBorderPresenter.ts`

### Boundary guidance

Keep edits to these shared choke points minimal and mechanical:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/config/territory.config.ts`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`

Prefer new leaf modules plus narrow integration points.

## Runtime Strategy By Territory Shape

Because the repo is mixed today, ambient support must be staged carefully.

### Pipeline runtime

Best first target.

Use region/frontier truth already produced by the pipeline presentation data. This path gives the cleanest region masks and frontier geometry.

### Render-family runtime

Second target.

Use the family adapter's already-prepared region/fill output instead of recomputing ownership or geometry.

### Direct legacy renderer runtime

Do not write bespoke ambient implementations per legacy renderer in phase 1.

Phase 1 fallback options:

- frontier-only treatment
- lightweight interior veil from existing polygon/mask outputs if available
- otherwise no ambient signature until family migration or shared presenter support exists

This prevents architecture drift.

## Proposed Layer Responsibilities

### Interior shader layer

- masked to owned region geometry
- low-contrast animated noise, flow, or banding
- always-on
- cheapest baseline

Good presets:

- `Nebula Veil`
- `Banner Light`
- `Shadow Mist`
- `Leyline Flow`

### Sparse ambient particles

- pooled
- very low density
- local-space if possible
- clipped to region mask or spawned from region sample points

Good presets:

- `Starlit Dust`
- `Embers`
- `Snow motes`
- `Spores`

### Frontier treatment

- strongest identity-per-cost layer
- should read cleanly at normal zoom
- should follow actual frontier truth

Good presets:

- `Shimmer`
- `Runic trace`
- `Electric crawl`
- `Glow current`

### Accent event layer

- rare only
- event-driven or very low-frequency timed
- should feel premium, not omnipresent

Good presets:

- `Pulse`
- `Wave sweep`
- `Emblem apparition`
- `Localized constellation glint`

## Marketplace / Cosmetic Packaging

The sellable unit should be theme packs, not isolated particle tricks.

Example pack names:

- `Imperial Radiance`
- `Void Dominion`
- `Aurora Covenant`
- `Ember Throne`
- `Verdant Mycelium`
- `Stormforged`
- `Runic Ascendancy`
- `Royal Observatory`

Possible pack contents:

- region ambient signature
- frontier treatment
- optional conquest pulse style
- optional badge or crest treatment
- optional ship-trail tint later

This is secondary to implementation quality. The system should be built to support this, but not driven by monetization shortcuts.

## Implementation Phases

### Phase 0 - baseline audit

Outputs:

- confirm best presentation seam for owned-region masks
- record current runtime shapes that can and cannot support ambient overlays cleanly
- identify where cosmetic profile selection should eventually live

### Phase 1 - profile registry and presenter scaffold

Outputs:

- `RegionAmbientSignatureProfile` types
- profile registry
- empty `PixiRegionAmbientPresenter`
- narrow wiring from territory presentation into ambient presenter

No user-facing themes yet beyond a neutral baseline.

### Phase 2 - interior shader wave

Ship 2 to 3 always-on interior presets first:

- `Nebula Veil`
- `Banner Light`
- `Shadow Mist`

These should prove:

- masking
- game-time animation
- per-player palette uniforms

### Phase 3 - frontier identity wave

Ship 2 to 3 frontier treatments:

- `Shimmer`
- `Glow current`
- `Storm crawl`

This is the most important identity step.

### Phase 4 - sparse particles

Add pooled low-density particles only after the masked interior and frontier layers are stable.

Start with:

- `Starlit Dust`
- `Embers`

### Phase 5 - accent events

Add rare premium touches:

- low-frequency pulses
- rare emblem apparition
- conquest-follow accent wash if it remains subtle

Prefer global FX hooks for timing and ownership-safe triggers.

### Phase 6 - UI and content scaling

Only after the runtime is stable:

- settings/debug toggles
- profile selection
- theme pack expansion
- validation across map density and speed ranges

## Validation Plan

### Visual checks

- effect stays inside owned region
- frontier treatment actually tracks frontier truth
- no loss of star, lane, ship, or label readability
- effects still read well at common zoom levels
- effects remain tasteful with 4 to 6 simultaneous players

### Timing checks

- pause freezes in-game ambient motion correctly
- speed changes affect ambient timing coherently
- accent events do not double-fire on pause/resume

### Performance checks

- no per-player shader recompilation
- stable particle pool counts
- no obvious allocation churn
- no visible hitching on conquest
- acceptable cost on the mixed runtime paths that support the feature

### Architecture checks

- no new geometry truth
- no special-case behavior by theme id
- no one-off code path per renderer family unless explicitly temporary and documented

## Risks

- The mixed runtime architecture means region masking may be easy on one path and awkward on another.
- Frontier effects can become visually noisy very quickly.
- Sparse particles can still look cheap if spawn logic is not spatially coherent.
- Accent events can easily cross the line from premium to spam.
- Shared choke points can create merge pain if integration is not staged carefully.

## Immediate Next Steps

1. Audit which current runtime paths expose reliable owned-region polygons or masks to a shared presenter.
2. Decide whether phase-1 support should be pipeline-only or pipeline-plus-family.
3. Scaffold `RegionAmbientSignatureProfile` plus preset registries.
4. Add `PixiRegionAmbientPresenter` with one neutral interior shader path.
5. Prototype `Nebula Veil` and `Banner Light` first.

## Final Design Advice

If these effects are subtle, they will:

- age better
- stack better
- interfere less with gameplay
- feel more premium

The failure mode is obvious:

too bright, too frequent, too many particles, too many gimmicks

The winning direction is:

atmosphere, sovereignty, identity, underlying power
