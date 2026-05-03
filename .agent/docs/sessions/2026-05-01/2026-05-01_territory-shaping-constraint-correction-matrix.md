# Territory Shaping Constraint Correction Matrix - 2026-05-01

## Corrections To Prior Audit

The earlier audit needed correction in three ways:

1. `MSR` was framed too much as a lane-routing concern.
   - Correct intent: `MSR` primarily shapes owned territory/frontier stand-off around stars so borders do not cut through or crowd stars.
   - `Lane Margin` is separate.
   - `MSR` intentionally remains the fallback lane margin when dedicated lane margin is disabled.

2. The wording should use real file/pipeline names instead of vague phrases.
   - Use `Geometry_0319`, `buildFamilyGeometry`, `PowerVoronoiRenderer`, `MetaballRenderer`, and similar concrete names.

3. All four constraints are supposed to be geometry-stage, pre-render constraints and should behave consistently across territory modes.
   - That is the core requirement this matrix is measuring against.

## Required Rule

Every active territory mode should either:

- consume the same pre-render territory geometry result, or
- consume the same normalized geometry settings through the same shared utility layer

If a mode reads raw config directly and interprets the constraint differently, the constraint is not actually universal.

## Matrix

### MSR

#### Intended Meaning

- Minimum stand-off between a star center and its owned territory boundary
- Gives stars visual breathing room
- Should affect all territory modes consistently
- Should also serve as the fallback lane margin when dedicated lane margin is off

#### Surfaced Controls

- `Minimum Star Margin`
- `Lane Margin` and `Lane Margin Enabled` remain separate controls elsewhere

#### Current Owners

- UI: `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- Territory defaults: `pax-fluxia/src/lib/config/territory.config.ts`
- Lane fallback utility: `pax-fluxia/src/lib/lanes/laneMargin.ts`
- Family-geometry tunables: `pax-fluxia/src/lib/territory/geometry/geometryTuning.ts`
- Explicit post-merge clamp: `pax-fluxia/src/lib/territory/geometry/minStarMargin.ts`
- Direct renderer consumers still reading config themselves:
  - `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts`
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
  - `pax-fluxia/src/lib/renderers/ModifiedVoronoiRenderer.ts`

#### Current Divergence

- The design intent is correct in practice, but the documentation/comments are not fully aligned.
- `pax-fluxia/src/lib/config/game.config.ts` currently says `MODIFIED_VORONOI_STAR_MARGIN` is "not used for mapgen lane clearance", which is false because `laneMargin.ts` intentionally falls back to it.
- `MSR` is also being reused as the default spacing input for lane midpoint pairs, which is a different concept.
- Some paths consume shared geometry-stage settings; some renderers still read `MSR` directly and build geometry locally.

#### Correction Required

1. Correct the comments/tooltips/spec text to state the real purpose:
   - primary = territory/frontier breathing room
   - secondary = fallback lane margin when dedicated lane margin is off
2. Keep `laneMargin.ts` fallback behavior as-is.
3. Stop using `MSR` as an unspoken default for unrelated lane-pair spacing unless that coupling is made explicit.
4. Move active territory modes toward one shared geometry-stage application path.

#### Acceptance Condition

- Raising `MSR` pushes owned frontiers away from stars in every active territory mode the same way.
- Disabling dedicated lane margin makes lane routing/rendering fall back to `MSR`.
- No comments or UI copy misstate the relationship.

### CX

#### Intended Meaning

- Corridor virtual sites shape territory along lanes so same-owner corridors remain legible and cross-owner fronts stay structured.

#### Surfaced Controls

- `Corridor Virtual Sites (CX)`
- `Corridor Sample Count`
- `Corridor Weight`
- `Corridor Spacing`

#### Current Owners

- UI: `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- Defaults: `pax-fluxia/src/lib/config/territory.config.ts`
- Shared corridor builder: `pax-fluxia/src/lib/territory/corridor/buildCorridorVirtualSites.ts`
- Family-geometry normalization: `pax-fluxia/src/lib/territory/geometry/geometryTuning.ts`
- Direct renderer/config readers:
  - `pax-fluxia/src/lib/renderers/territoryFeatures.ts`
  - `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts`
  - `pax-fluxia/src/lib/territory/orchestrator/engine.ts`

#### Current Divergence

- `Corridor Weight` UI slider allows `0..2`, but `geometryTuning.ts` clamps it to `0..1` for the family-geometry path.
- `Corridor Sample Count` UI slider allows `0..20`, but `geometryTuning.ts` clamps it to `0..10` for the family-geometry path.
- Direct renderer paths can still consume raw config values.

#### Correction Required

1. Decide the real supported ranges for:
   - count
   - weight
   - spacing
2. Put those ranges in one shared geometry normalization utility.
3. Make all active territory modes consume those normalized values instead of raw config.
4. Keep `buildCorridorVirtualSites.ts` as the single corridor-site builder.

#### Acceptance Condition

- The same `CX` settings produce the same corridor-site intent regardless of active territory mode.
- UI ranges and geometry-stage ranges match.

### LP

#### Intended Meaning

- Lane midpoint pairs add owner-biased virtual pairs on contested lanes so cross-owner frontiers stay shaped and legible.

#### Surfaced Controls

- `Lane Midpoint Pairs`
- `Lane Midpoint Pair Count`
- `Lane Midpoint Pair Weight`
- `Lane Midpoint Pair Spacing`

#### Current Owners

- UI: `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- Defaults: `pax-fluxia/src/lib/config/territory.config.ts`
- Corridor feature wrapper: `pax-fluxia/src/lib/renderers/territoryFeatures.ts`
- Shared builder: `pax-fluxia/src/lib/territory/corridor/buildCorridorVirtualSites.ts`
- Family-geometry normalization for count/weight: `pax-fluxia/src/lib/territory/geometry/geometryTuning.ts`

#### Current Divergence

- `LP` spacing is not owned by an `LP` setting.
- `territoryFeatures.ts` currently sets `crossOwnerMidpointPairSpacing = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45`.
- That means changing `MSR` also changes:
  - how far the midpoint pair is split around the lane midpoint
  - how far repeated midpoint pairs shift along the lane when pair count > 1

#### What "Piggybacking On MSR" Actually Means

It is not vague ontology language. It is a direct code dependency:

- the lane midpoint pair system has no spacing control of its own
- so it silently borrows `MSR`
- therefore one slider is currently steering two different ideas:
  - star-to-frontier breathing room
  - contested-lane midpoint-pair spacing

That coupling may be acceptable only if it is deliberate and explicitly documented. Right now it is implicit.

#### Correction Required

Implemented on 2026-05-01:

1. Added dedicated `TERRITORY_CX_CONTEST_PAIR_SPACING`
2. Surfaced it in `Frontier Topology`
3. Passed it through the shared corridor builder and active geometry/render consumers

#### Acceptance Condition

- `LP` spacing now has its own named control.
- No active territory mode invents its own LP spacing behavior from raw config.

### DX

#### Intended Meaning

- Keep disconnected same-owner holdings from falsely merging into one continuous territory shape by introducing separation pressure between components.

#### Surfaced Controls

- `Disconnect Gaps (DX)`
- `Disconnect Weight`
- `Disconnect Distance`

#### Current Owners

- UI: `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- Defaults: `pax-fluxia/src/lib/config/territory.config.ts`
- Interface/comments: `pax-fluxia/src/lib/config/game.config.ts`
- Shared disconnect builder: `pax-fluxia/src/lib/territory/disconnect/buildDisconnectVirtualSites.ts`
- Family-geometry normalization: `pax-fluxia/src/lib/territory/geometry/geometryTuning.ts`
- Direct renderer/config readers:
  - `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts`
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
  - `pax-fluxia/src/lib/territory/orchestrator/engine.ts`

#### Current Divergence

- UI `Disconnect Weight` slider allows `0..2`
- `territory.config.ts` default is `3`
- `game.config.ts` comment says default `0.3` and range `0.0-2.0`
- `geometryTuning.ts` clamps disconnect weight to `0..1`
- direct renderer / engine paths can still consume the raw config value instead of the normalized one

This is the clearest example of architecture-path-dependent behavior.

#### Correction Required

1. Decide the real `DX` weight scale.
2. Make defaults, UI range, comments, and geometry normalization agree.
3. Route all active territory modes through one shared `DX` normalization path.
4. Ensure `buildDisconnectVirtualSites.ts` remains the one disconnect-site builder, with renderers only consuming its results.

#### Acceptance Condition

- One `DX` weight value means the same thing everywhere.
- No active mode can exceed or reinterpret the surfaced value behind the user's back.

## Architecture-Level Correction Order

### 1. Normalize surfaced ranges and defaults first

Fix the contradictions between:

- UI slider ranges
- `territory.config.ts` defaults
- `game.config.ts` comments
- `geometryTuning.ts` clamps

Do this for at least:

- `TERRITORY_DX_WEIGHT`
- `TERRITORY_CX_WEIGHT`
- `TERRITORY_CX_COUNT`

### 2. Remove hidden config interpretation from active renderers

Active territory modes should not each reinterpret raw geometry config. They should consume:

- one shared normalized geometry settings object, or
- one shared precomputed geometry artifact

### 3. Decide LP spacing ownership

This is a product decision:

- explicit coupling to `MSR`
- or dedicated LP spacing control

Update 2026-05-01:

- Resolved in favor of dedicated LP spacing control.
- Remaining follow-through is `DX`/`CX` contract normalization and broader shared-geometry consolidation.

### 4. Correct comments and UI copy

Especially:

- `MSR` meaning
- `MSR` / lane margin fallback relationship
- any comments implying those settings are renderer-specific rather than geometry-stage

## Recommended Immediate Fix Queue

1. `DX` weight contract unification
2. `CX` weight/count contract unification
3. `MSR` comment and tooltip correction
4. consolidate active territory modes onto one shared pre-render geometry contract

## Status Update - 2026-05-01

Implemented after the matrix was written:

- `geometryTuning.ts` now owns an explicit shared limits/defaults contract for the active topology controls.
- `TerritorySettingsBridge.ts` now returns normalized geometry tunables instead of raw values.
- `ControlsSection-Territory.svelte` slider ranges now match the shared geometry limits for `Frontier Resolution`, `CX Count`, `CX Weight`, `LP Weight`, `LP Spacing`, `DX Distance`, and `DX Weight`.
- `GameCanvas.svelte` now keys territory geometry invalidation from normalized geometry key parts instead of raw config fragments.
- Active geometry consumers now read the shared normalized constraint tuple instead of raw per-renderer literals:
  - `PowerVoronoiRenderer.ts`
  - `PVV3Renderer.ts`
  - `MetaballRenderer.ts`
  - `territory/orchestrator/engine.ts`
- The hidden DY4 reference renderer was also updated to the same normalized CX/LP/DX tuple.

Remaining boundary:

- Hidden legacy `ModifiedVoronoiRenderer.ts` still contains its own bespoke disconnect-buffer path instead of the shared DX builder. That does not affect the current visible mode set, but it is the main remaining legacy outlier if that path is ever reactivated.
