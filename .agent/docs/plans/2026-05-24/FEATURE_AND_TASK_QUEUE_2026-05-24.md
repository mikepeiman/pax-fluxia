# Feature And Task Queue - 2026-05-24

## Active

- Review live Settings Ribbon correction on `codex/ui-hud-development`.
- Follow-up candidate: split the remaining large `GameSettingsPanel.svelte` into smaller rail/panel components and remove stale search/import/export code that is no longer rendered.
- Follow-up candidate: move deeper diagnostics-only ruler controls into a clearer Dev Options subsection if the Settings taxonomy is expanded.
- Review restored bottom-center command bar placement against the selected-star tray at 1280x720, 1600x900, and 1920x1080.

## Completed

- Corrected Settings Ribbon ownership: topbar-left stub, left master rail, adjacent single active panel.
- Removed duplicate bottom/right settings menu path and old live-game save/load map/game menu surface.
- Removed nonfunctional art palette and misplaced fit/ruler/settings/diagnostics quick-access actions from the bottom-right quick dock.
- Added/normalized required settings rail items.
- Put Theme Library and Appearance/Typography into the rail panel pattern.
- Kept Diagnostics in the same adjacent panel pattern.
- Added Star View previous/next owned-star cycling, zoom-selected-star, and fit-map controls.
- Added selected-star tray collapse transition with semantic chevrons.
- Halved the dark stop in live HUD gold-to-dark border gradients.
- Added Appearance/Typography scale sliders for UI text, titles, labels, data, and icons.
- Restored the persistent bottom-center command bar.
- Extracted PDF atlas icons into `pax-fluxia/static/icons/td-atlas/` and registered selected `td-*` aliases.
- Added post-mortem for the bottom-center command bar removal failure.

## Validation Plan

- `git diff --check`: passed.
- `bun run --cwd pax-fluxia build`: passed.
- `bun run --cwd pax-fluxia check`: failed on repository baseline with `329 errors and 819 warnings in 64 files`.
- Browser QA passed for settings collapse/open, Theme Library panel, Appearance/Typography panel, Diagnostics panel, removed duplicate quick-access settings path, and Star View owned-star cycling.
- Browser QA for the latest bottom-command/scale/atlas patch is still pending human or Browser-MCP visual review; production build passed, and `check` remains at the existing `329 errors and 819 warnings in 64 files` baseline.
