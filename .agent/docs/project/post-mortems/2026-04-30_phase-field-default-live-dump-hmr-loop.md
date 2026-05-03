# Post-Mortem - 2026-04-30 - Phase Field Default Live-Dump HMR Loop

## Summary

Entering the main menu from the landing page caused the shell to mount, then unmount and return to landing in a loop. The root cause was not the route transition itself. It was a bad source-of-truth decision in the new default-theme work.

## Cause

- I promoted `common/resources/settings-live/current-settings.json` directly into runtime source by importing it in `pax-fluxia/src/lib/config/game.config.ts` and `pax-fluxia/src/lib/config/builtinThemes.ts`.
- That file is also the dev-only output target of `pax-fluxia/src/lib/utils/settingsDump.ts`.
- `MainMenu.svelte`, `panelSync.ts`, and the old `themeStore` startup auto-apply path all perform save operations during normal shell/menu startup.
- Those saves triggered `dumpSettings()`, which posted the current config back to `current-settings.json`.
- Because Vite was now watching that imported JSON as source, each menu mount wrote to a watched file, forcing a hot reload and remounting the route.

## Mistaken Reasoning

- I treated the live dev dump file as if it were a safe checked-in baseline snapshot.
- I did not account for the fact that the client itself still writes that file during normal UI startup.
- I also left a startup `themeStore` auto-apply path in place, which made shell boot perform hidden config mutations instead of remaining state-only.

## Diagnostic Method

- Used the user-provided `HomeRoute` logs to confirm `open_game_shell` was succeeding and `GameContainer` was mounting before the route tore down.
- Verified that `showGame` was only reset on load failure, which ruled out the landing route as the owner of the regression.
- Traced menu-mount side effects and found that startup writes still flowed through `savePanelSettings()`, `saveVisuals()`, and `dumpSettings()`.
- Confirmed the new direct imports of `common/resources/settings-live/current-settings.json` in runtime source, which explained the HMR reload loop.

## Fix

- Removed runtime imports of `common/resources/settings-live/current-settings.json`.
- Removed the `themeStore` startup auto-apply block so shell boot no longer mutates config implicitly.
- Follow-up correction: promoted the Phase Field values into the actual owner default modules (`gameplay.config.ts`, `renderer.config.ts`, `territory.config.ts`, and territory-family defaults) instead of keeping a startup overlay file.
- Follow-up correction: changed the built-in `Phase Field Default` theme to derive from `DEFAULT_GAME_CONFIG`, and changed `resetToDefaults()` to reload into factory defaults instead of applying a theme overlay first.
- Final correction: made `dumpSettings()` opt-in instead of default-on during dev, because normal menu mount still triggers local UI persistence writes.
- Final correction: told Vite to ignore `common/resources/settings-live/**` and `common/resources/saved-maps/**` so dev artifact writes cannot bounce the route.

## Derived Rule

- Never import a live dev dump file into watched runtime source.
- If the app writes a file during normal UI interaction, that file must remain a dev artifact or be copied into a separate stable snapshot before runtime imports use it.
- Startup theme/default selection must not perform hidden writes during shell boot unless that behavior is explicitly required and verified.
- If the user asks to "update config defaults," update the owner default definitions instead of layering a runtime snapshot over them.
- Removing the import path is not sufficient if the app still writes watched files during ordinary mount effects; the write path itself must be opt-in or explicitly ignored by the dev watcher.
