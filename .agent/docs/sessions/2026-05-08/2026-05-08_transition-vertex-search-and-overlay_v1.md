# 2026-05-08 - Transition Vertex Search And Overlay Cleanup

## Problem

- Searching for `morph` surfaced results inside the legacy Render Families territory panel even though the live PVV4 conquest control is in the dedicated PVV4 Transition section.
- The class of failure was:
  - stale duplicate UI control still present in the old territory panel
  - search metadata still describing that old wording instead of the real current PVV4 control
- Live transition vertices also read as mostly static because the overlay emphasized correspondence lines and endpoint dots instead of the moving active TVs.

## Cause

1. A stale `Morph Control Points` slider still existed in:
   - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte`
2. Settings search is built from static metadata, not from the live DOM:
   - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\settingMetadata.ts`
   - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\settingsSearch.ts`
3. The live overlay draw path in:
   - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
   still drew strong correspondence scaffolding and static endpoint dots, which visually obscured the moving TVs.

## Fix

- Added a standing AGENT rule:
  - if a UI element, function, or feature is mentioned, trace and confirm that it is present, correct, wired up, and available in the UI
- Removed the stale `Morph Control Points` slider from the legacy territory panel
- Renamed old `Morph Easing` to `Territory Engine Morph Easing`
- Re-labeled the live PVV4 control in search metadata as:
  - `Transition Vertices (TVs)`
- Added search aliases so old wording still finds the right control:
  - `Morph Control Points`
  - `TV count`
  - `transition vertices`
  - `TVs`
- Routed `TERRITORY_MORPH_CONTROL_POINTS` explicitly into the PVV4 Transition search section
- Changed live overlay TV drawing so the moving active TV dominates visually:
  - faint correspondence line
  - no static PRE/POST endpoint dots
  - visible active-TV halo
  - visible active-TV dot

## Files

- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\AGENT.md`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\settingMetadata.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\settingsSearch.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\ui\settings\settingsSearch.test.ts`

## Validation

- `bun vitest run src/lib/components/ui/settings/settingsSearch.test.ts src/lib/territory/integration/TerritorySettingsBridge.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`
