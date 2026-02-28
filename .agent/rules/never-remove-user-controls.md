# Never Remove User Controls

**ABSOLUTE RULE**: Never remove, simplify away, or hardcode over any user-facing configuration property, UI slider, toggle, dropdown, or settings control — unless the user explicitly instructs removal.

## What counts as a user control:
- Any property in `GAME_CONFIG` / `game.config.ts` with a corresponding UI element
- Any slider, toggle, select, or input in `ControlsSection-*.svelte` files
- Any entry in `PANEL_CONFIG_MAP` in `settingsDefs.ts`
- Any entry in `categoryThemes.ts` category key lists

## Prohibited actions (without explicit user instruction):
- Deleting config properties to "simplify"
- Replacing configurable values with hardcoded ones
- Choosing a "cleaner" implementation that has fewer controls
- Merging code that discards sliders/controls from either branch
- Rationalizing removal as "architecturally cleaner" or "simpler"

## Required actions:
- When merging branches with different implementations of the same feature, **keep the version with MORE user controls**, or merge both
- When refactoring, preserve ALL existing config keys and UI elements
- Before any edit to a `ControlsSection-*.svelte` file, audit the full section to confirm no controls are being lost
- If a renderer supports a parameter, it MUST have a corresponding UI control

## Context:
In this project, **user configurability IS the product**. Dozens of iterations have been spent adding settings controls. Every hardcoded value is a potential slider. Fewer controls = regression. More controls = progress.
