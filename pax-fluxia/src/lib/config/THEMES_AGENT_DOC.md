# Theme System — Agent Documentation

## Overview
Themes are complete snapshots of GAME_CONFIG settings (minus a small denylist of map/AI keys).
They capture timing, animation, combat feel, visual appearance, and all gameplay tuning.

## Architecture

### Active System (used in GameSettingsPanel)
- **`themes.ts`** — Core operations: `extractTheme()`, `applyTheme()`, `saveTheme()`, `loadThemes()`, `exportThemeJSON()`
- **`builtinThemes.ts`** — Curated presets: Smooth Bezier, Flow Ships, Arrow Capture, Orb Flow
- Uses **denylist** approach: all GAME_CONFIG keys are included EXCEPT those in `THEME_DENYLIST`

### Denylist (excluded from themes)
Map internals (`_MAP_*`), map structure (`STARS_PER_PLAYER`, `MAX_LINKS_PER_STAR`), AI tuning (`AI_*`), hex grid toggle.

### Storage
- Built-in: hardcoded in `builtinThemes.ts`
- User-saved: `localStorage` key `pax-game-themes`

## Versioning Policy
When user provides updated values for a named theme, create a versioned copy (e.g., "Smooth Bezier v2").
Never overwrite existing theme definitions.
