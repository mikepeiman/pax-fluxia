# Post-Mortem: 2026-05-01 - Territory Mode Shortcuts Mounted On The Wrong Surface

## What Happened

The user asked for territory mode access to become a faster player action. Instead of placing mode shortcuts on a global game-HUD surface, I mounted them inside `GameSettingsPanel.svelte` and only showed them when a settings section was already open. That produced the opposite of the requested flow:

- opening Settings did not expose the shortcuts immediately
- opening any control section inserted unrelated mode buttons above that section
- section clicks no longer meant "show me these controls now"

The result was off-spec by interaction design, not just cosmetically awkward.

## Root Cause

The failure was an ownership-boundary mistake.

- I solved for the nearest existing render slot instead of the correct UI surface.
- I optimized for reuse of settings-panel state and markup instead of the player's task flow.
- I treated a global action as a child of a local panel lifecycle.

The underlying mindset error was: "there is room here, and the state already exists here, so this is a convenient place to render it." That is implementation convenience overriding product meaning.

## Impact

- Added clicks without adding capability.
- Polluted local control sections with unrelated global actions.
- Made Settings feel less direct and less trustworthy.
- Forced the user to correct an ownership mistake that should have been obvious from the instruction itself.

## Diagnostic Method

- Re-read the original request as an interaction spec rather than as a placement hint.
- Traced where the mode strip actually rendered and what condition caused it to appear.
- Compared that trigger path to the user's intended flow: global quick access in game, independent of section content.
- Audited adjacent quick-access surfaces and found the same fragmentation pattern across FPS/ships, floating HUD actions, and theme shortcuts.

## Corrective Actions

- Removed the misplaced mode strip from `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`.
- Added a dedicated desktop game HUD top bar in `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`.
- Moved FPS/ships readout, desktop quick actions, theme shortcuts, and territory mode shortcuts into that top bar through `pax-fluxia/src/lib/components/game/GameContainer.svelte`.
- Hid non-active territory modes (`Layered Runtime`, `Engine (DY4 pipeline)`, `PVV2 weighted`, `PVV2 DY4 ref`) from active selection via `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`.
- Added smaller mode buttons with distinct visual identities instead of large section-interrupting chips.

## Lessons

- Global actions belong on global surfaces.
- A section click must yield section-specific controls immediately; do not prepend unrelated controls above it.
- If the user specifies the desired click path, that is part of the spec and must be honored literally.
- "Nearest place that can render it" is not a UI placement principle.
