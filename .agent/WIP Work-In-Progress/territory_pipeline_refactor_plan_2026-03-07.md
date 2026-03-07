# Territory Pipeline Refactor + Straight-Line Borders (Bridge Migration)

## Summary
Refactor settings/state flow to eliminate dual-write drift, fix transient DX behavior deterministically, and replace grid-sampled vector borders with true even-width straight-line border rendering that preserves DF fill alignment and morphing behavior. Keep bridge compatibility first, then cut over safely.

## Decision Log
- State migration: bridge then cutover.
- Borders V1: straight-line first.
- Morph status: currently non-functional in practice; restoration is required during implementation to satisfy acceptance.

## Implementation Changes
1. Create and save this plan document first.
2. Stabilize settings architecture with a single canonical write path (bridge phase):
   - Introduce a schema-backed settings layer as the only UI mutation path.
   - Keep `GAME_CONFIG` as compatibility read target during bridge.
   - Enforce universal pattern:
     - Read: `panel.<key> ?? GAME_CONFIG.<KEY>`
     - Write: `updatePanel(key, value)` only.
   - Remove mixed patterns in territory controls, especially DF corridor/disconnect and border controls.
   - Change panel->config sync from broad replay to key-delta apply.
   - Add dev guard to detect direct UI-layer writes to `GAME_CONFIG`.
3. DX transient/revert root-cause instrumentation and fix:
   - Add deterministic telemetry for input value, panel value, applied config value, topology fp, virtual-site count, packed virtual count.
   - Verify if disappearance is state overwrite vs feature compute drop.
   - Patch the confirmed cause while preserving deterministic virtual-site ordering and dedupe.
4. Replace current vector-grid border extraction with true straight-line border renderer:
   - Compute border graph from ownership boundaries.
   - Render world-space straight segments with even width, round joins/caps, optional softness halo, owner-pair blended color.
   - Remove vector-grid marching-cell wobble as primary path.
   - Rebuild/update graph on topology/morph ticks (throttled), render interpolated output every frame.
   - Keep DF fill ownership pipeline aligned.
5. Add extensible border-family framework for future curved + segmented modes:
   - Internal family enum and shared renderer interface:
     - `straight` (implemented)
     - `curved` (stub)
     - `segmented` (stub)
   - Expose user controls via the same universal settings pattern.
   - Keep defaults pinned to `straight`.
6. Cutover completion + cleanup:
   - Remove remaining direct UI writes to `GAME_CONFIG` in territory settings path.
   - Keep compatibility adapter only where renderers still consume `GAME_CONFIG`.
   - Update WIP/session notes and feature status with final behavior and follow-ups.

## Public Interfaces / Types
- Add schema/type layer for settings metadata and runtime key typing.
- Add settings write API:
  - `setSetting(key, value)`
  - `setManySettings(patch)` for transactional theme/sub-theme apply.
- Add user-facing border-family key:
  - `DF_BORDER_FAMILY: 'straight' | 'curved' | 'segmented'`
- Keep existing DF keys operational in bridge phase without breaking renames.

## Test Plan
1. State/reactivity integrity:
   - Slider/toggle change persists after input release.
   - Control readout matches runtime-applied value.
   - Theme/sub-theme loads update controls and runtime values atomically.
2. DX correctness:
   - DX-enabled disconnect sites persist after slider release.
   - Corridor slider changes with DX enabled do not cause transient show-and-revert behavior.
   - Virtual-site counts and topology fp stay stable for constant inputs.
3. Border quality/performance:
   - Straight-line mode shows even-width, smooth-edged, non-wobbly borders at high zoom.
   - Border width/softness/alpha/brighten controls respond consistently.
   - Morph transitions run without border popping.
4. Regression checks:
   - Territory-fill alignment remains correct.
   - Existing DF controls remain functional.
   - No regressions in non-DF territory modes.

## Assumptions and Defaults
- Bridge migration is preferred over hard cutover for safety.
- Straight-line border family is the first production target.
- Theme/sub-theme compatibility is preserved via transactional `setManySettings`.
- Work is committed as one commit per numbered implementation step.
