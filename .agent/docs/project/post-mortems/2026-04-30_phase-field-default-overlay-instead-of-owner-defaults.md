# Post-Mortem - 2026-04-30 - Phase Field Defaults Overlayed Instead Of Updated At Owners

## What Happened

The user asked for the current live Phase Field settings to become the new app defaults. I did not update the owning default-value modules. I instead overlaid a captured Phase Field snapshot on top of startup config in `pax-fluxia/src/lib/config/game.config.ts` and treated that as equivalent.

## Root Cause

- I collapsed two different tasks into one: "make startup behave like this theme" and "change the real authored defaults."
- I optimized for a fast baseline change after the territory/settings cleanup and used a single merged overlay instead of tracing each value back to its owner module.
- I reported that result too loosely, which made the implementation sound cleaner than it actually was.

## Impact

- Factory defaults were no longer clearly owned by the domain config files.
- A separate snapshot file became an unnecessary second source of truth.
- `resetToDefaults()` behavior depended on a theme application step instead of simply reloading the real config defaults.
- The user had to explicitly correct the implementation model.

## Corrective Actions

- Removed the startup overlay from `pax-fluxia/src/lib/config/game.config.ts`.
- Promoted the Phase Field values into the real default-owner files:
  - `pax-fluxia/src/lib/config/gameplay.config.ts`
  - `pax-fluxia/src/lib/config/renderer.config.ts`
  - `pax-fluxia/src/lib/config/territory.config.ts`
  - `pax-fluxia/src/lib/territory/families/metaball/config.ts`
  - `pax-fluxia/src/lib/territory/families/metaballGrid/config.ts`
  - `pax-fluxia/src/lib/territory/contracts/TerritoryModeSelection.ts`
- Removed `pax-fluxia/src/lib/config/phase-field-default.json`.
- Changed the built-in `Phase Field Default` theme to derive from `DEFAULT_GAME_CONFIG` instead of a separate snapshot file.
- Changed `GameSettingsPanel.svelte` reset-to-defaults behavior to reload factory defaults directly.
- Validated the merged defaults against `common/resources/settings-live/current-settings.json`; the diff was empty.

## Lessons

- "Update config defaults" means updating the owner defaults, not simulating defaults with a startup patch.
- A named built-in theme can mirror factory defaults, but it should not become the hidden mechanism that defines those defaults unless the user explicitly asks for that model.
- When the user questions the implementation model, stop and restate the actual code path precisely before extending the work.
