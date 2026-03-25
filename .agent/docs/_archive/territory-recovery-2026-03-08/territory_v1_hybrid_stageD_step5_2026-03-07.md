# Territory V1 Hybrid - Stage D Step 5 (2026-03-07)

## Scope
Implement Step 5 from the locked hybrid plan:
- Border morph readiness + fallback ladder
- Morph easing control plumbing
- Keep alignment contract and two-pass/geometry border integration intact

## Code Changes

### 1) Morph easing support (fill + border timing)
- Added `DF_MORPH_EASING` setting support in renderer and UI schema.
- Added easing functions in `DistanceFieldTerritoryRenderer.ts`:
  - `normalizeMorphEasing(raw)`
  - `applyMorphEasing(rawT, easing)`
- Morph factor now uses eased time:
  - `easedT = applyMorphEasing(rawT, morphEasing)`
  - `morphFactor = 1 - easedT`

### 2) Visual fingerprint fix (determinism)
- Fixed `buildVisualFp()` to include morph-easing dimension.
- Current visual fp suffix now includes:
  - `DF_MIN_STAR_RADIUS`
  - `TERRITORY_TRANSITION_MS`
  - `DF_MORPH_EASING`

### 3) Border fallback ladder for geometry path
- Refactored field-border branch into helper:
  - `renderFieldBorderOverlay(...)`
- Changed border-family dispatch to readiness contract:
  - `renderBorderFamilyOverlay(...) => boolean`
  - `renderVectorBorderOverlay(...) => boolean`
- Canonical flow in geometry mode:
  - Try geometry border render
  - If geometry is not publish-ready (chunk build in-flight), render field border as local fallback for continuity

### 4) UI/settings wiring
- `game.config.ts`
  - Added typed key: `DF_MORPH_EASING: 'linear' | 'easeInOutQuad' | 'easeInOutCubic' | 'smoothstep'`
  - Added default: `DF_MORPH_EASING: 'linear'`
- `settingsDefs.ts`
  - Added mapping entry: `{ panelKey: 'dfMorphEasing', configKey: 'DF_MORPH_EASING' }`
- `ControlsSection-Territory.svelte`
  - Added Morph Easing control group (Linear / Smooth / Quad / Cubic)
  - Uses universal `updatePanel(...)` write path

## Validation

### Tooling status
- `bun install --force` executed to repair Bun bin remap state.

### Checks
- Full `bun run check` still reports many existing project-wide warnings/errors (pre-existing, outside this step scope).
- Focused check output for touched files (`DistanceFieldTerritoryRenderer.ts`, `game.config.ts`, `settingsDefs.ts`, `ControlsSection-Territory.svelte`) returned no diagnostics.

## Notes
- This step intentionally does not switch canonical border family implementation details beyond readiness/fallback behavior.
- Next step remains the border-family expansion and final cleanup path from the staged plan.