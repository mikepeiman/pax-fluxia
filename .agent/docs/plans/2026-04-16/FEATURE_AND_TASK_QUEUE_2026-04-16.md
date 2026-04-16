# Feature And Task Queue - 2026-04-16

## Purpose

Diagnose why imported and saved themes were not activating the expected territory render modes, correct the live apply path, and record the regression/process failure honestly.

## Completed This Slice

- [x] Accept the user report as ground truth that the imported theme audit was wrong in live app behavior.
- [x] Trace the real theme apply path through `pax-fluxia/src/lib/stores/themeStore.svelte.ts`, `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`, `pax-fluxia/src/lib/components/ui/settingsState.ts`, and `pax-fluxia/src/lib/components/game/GameCanvas.svelte`.
- [x] Prove the actual regression cause: themes that omit `TERRITORY_RENDER_MODE` inherit the currently active renderer instead of reaching legacy boolean fallback.
- [x] Normalize legacy theme values to an explicit `TERRITORY_RENDER_MODE` in `pax-fluxia/src/lib/config/themeRouting.ts`.
- [x] Apply normalization to built-in theme loading in `pax-fluxia/src/lib/config/builtinThemes.ts`.
- [x] Apply normalization to user theme import/load paths in `pax-fluxia/src/lib/stores/themeStore.svelte.ts`.
- [x] Route canvas-side active territory-mode resolution through the same helper in `pax-fluxia/src/lib/components/game/GameCanvas.svelte`.
- [x] Add focused verification coverage in `pax-fluxia/src/lib/config/themeRouting.test.ts`.
- [x] Clean up imported and user-theme names so they resolve to a semantic label plus date, using source filenames when available and generated render-family names as fallback.
- [x] Add naming coverage in `pax-fluxia/src/lib/config/themeNames.test.ts`.
- [x] Write the required post-mortem at `.agent/docs/project/post-mortems/2026-04-16-theme-import-regression.md`.
- [x] Trace the branch screenshot mismatch far enough to prove the attached images are not the same runtime state: different theme selection, different theme counts, different tick values, different commander totals, and different map topology.
- [x] Verify that `pax-theme-apr_16_metaball_tweak-2026-04-16T18-11-44.json` matches the `codex/perimeter-field-audit-20260414` worktree live settings exactly, while `master` differs only on `CONQUEST_TRAVEL_SPEED`.
- [x] Prove the `MetaballRenderer` perf rewrite is not the primary semantic break by reproducing old/new owner-grid equivalence on synthetic scenes.
- [x] Fix a real shared-renderer cache bug: scene-driven `influenceRadiusPx` / `ownershipMarginPx` were omitted from the metaball/perimeter cache fingerprint, allowing stale field reuse across theme changes inside the same render family.
- [x] Add focused regression coverage in `pax-fluxia/src/lib/renderers/MetaballRenderer.test.ts`.
- [x] Definitively identify the live theme-apply wiring gap: `themeStore.applyTheme()` fell back to a raw `applyThemeToConfig()` path whenever `GameSettingsPanel` was unmounted, so sidebar theme selection skipped the panel/runtime synchronization path entirely.
- [x] Identify the specific background mismatch bug inside the mounted apply path: `applyConfigPatch()` wrote `GAME_CONFIG.BG_IMAGE_URL` before visual sync, suppressing the `pax-bg-change` event and allowing the previous background sprite to persist.

## In Progress

- [ ] User verification that older legacy themes now switch into their expected render families in the live app.
- [ ] User verification that explicit-mode themes like `pax-theme-apr_15_metaball-2026-04-16T16-40-14.json` still reproduce as expected.
- [ ] User verification of the renderer-cache fix using perimeter-field themes that differ mainly by influence radius / ownership-margin-adjacent behavior.
- [ ] User verification that sidebar theme selection now fully refreshes background, alpha, and territory visuals even with the settings panel closed.

## Notes

- The imported pack from `C:\Users\mikep\Downloads\Pax Themes` was not actually committed into `pax-fluxia/src/lib/config/builtin-themes/`; the live bug here is theme application semantics, not missing JSON files in the repo.
- The fix is intentionally small: make legacy themes self-contained at load/import/apply time instead of depending on ambient `GAME_CONFIG` state.
- The decisive bug was architectural, not in `MetaballRenderer` winner resolution: theme application had two runtime paths. `GameSettingsPanel` registered the canonical apply callback only while mounted, but the always-visible sidebar selector still called `themeStore.applyTheme()`. With the panel closed, that path wrote config values without the visual/runtime sync side effects.
- The screenshots also show a second non-theme render input difference: territory colors come from the live player roster (`activeGameStore.getPlayerColor`), not from the theme payload. Different commander rosters/colors will therefore change the rendered appearance even with identical territory tuning values.
- Verification runs completed:
  - `bun x vitest run src/lib/config/themeRouting.test.ts src/lib/components/ui/settingsDefs.test.ts`
  - `bun x vitest run src/lib/renderers/MetaballRenderer.test.ts src/lib/config/themeRouting.test.ts src/lib/components/ui/settingsDefs.test.ts`

## Lossless User Instruction Log

1. "No, this is terrible. Not a single one presents a useable theme; previous themes have disappeared. You broke it."
2. "Dig deep and diagnose what you did wrong."
3. "The themes are not activating different render modes correctly."
4. "The most recent theme downloaded, \"pax-theme-apr_15_metaball-2026-04-16T16-40-14\", when I import it, it does switch modes and provide the appearance I expect, more or less. None of the others do."
5. "Excuse me, why no commit? Follow the rules [AGENT.md](.agent/AGENT.md)"
