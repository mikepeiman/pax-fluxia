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
- [x] Write the required post-mortem at `.agent/docs/project/post-mortems/2026-04-16-theme-import-regression.md`.

## In Progress

- [ ] User verification that older legacy themes now switch into their expected render families in the live app.
- [ ] User verification that explicit-mode themes like `pax-theme-apr_15_metaball-2026-04-16T16-40-14.json` still reproduce as expected.

## Notes

- The imported pack from `C:\Users\mikep\Downloads\Pax Themes` was not actually committed into `pax-fluxia/src/lib/config/builtin-themes/`; the live bug here is theme application semantics, not missing JSON files in the repo.
- The fix is intentionally small: make legacy themes self-contained at load/import/apply time instead of depending on ambient `GAME_CONFIG` state.
- Verification run completed: `bun x vitest run src/lib/config/themeRouting.test.ts src/lib/components/ui/settingsDefs.test.ts`

## Lossless User Instruction Log

1. "No, this is terrible. Not a single one presents a useable theme; previous themes have disappeared. You broke it."
2. "Dig deep and diagnose what you did wrong."
3. "The themes are not activating different render modes correctly."
4. "The most recent theme downloaded, \"pax-theme-apr_15_metaball-2026-04-16T16-40-14\", when I import it, it does switch modes and provide the appearance I expect, more or less. None of the others do."
5. "Excuse me, why no commit? Follow the rules [AGENT.md](.agent/AGENT.md)"
