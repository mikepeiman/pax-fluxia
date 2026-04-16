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
- [x] Compare the user-provided `current-settings 1420 master thread.json` and `current-settings 1422 rendering branch.json` files and verify that the imported theme did not diverge on any actual perimeter-field geometry/constraint tunables.
- [x] Prove the remaining live-setting deltas are runtime-only fields: `_MAP_HEX_RADIUS`, `_MAP_WIDTH`, `_MAP_HEIGHT`, `_MAP_PADDING_X`, `_MAP_PADDING_Y`, and `__TERRITORY_VISUAL_EPOCH`.
- [x] Trace perimeter-field geometry inputs to confirm `_MAP_*` values are only used for the debug hex overlay, while perimeter-field geometry itself is built from `star.ownerId`, star positions, lane endpoints, and the geometry tunables in `buildPerimeterFieldRenderFamilyGeometry()`.
- [x] Identify and fix a separate theme hygiene bug: exported/imported themes were still carrying `__TERRITORY_VISUAL_EPOCH`, a runtime cache-invalidation counter that should never serialize.
- [x] Add focused coverage in `pax-fluxia/src/lib/config/themes.test.ts` so theme snapshot/apply paths ignore internal runtime keys.
- [x] Diff `master` against `codex/perimeter-field-audit-20260414` and identify the concrete branch wiring gap: the rendering branch still lacks the `applyConfigPatch()` side effects that dispatch background events and bump territory visual invalidation after theme import/apply.
- [x] Prove the remaining geometry divergence path is stale paused-render state, not different owner assignment: `GameCanvas.svelte` was using a hand-built `territoryConfigFp` that omitted geometry-driving keys like `FRONTIER_RESOLUTION`, `CHAIKIN_BOUNDARY_PAD`, `CHAIKIN_BOUNDARY_EPS`, `PERIMETER_FIELD_GEOMETRY_SOURCE`, `TERRITORY_FILL_MODE`, `TERRITORY_FILL_TRANSITION_MODE`, `TERRITORY_BORDER_TRANSITION_MODE`, and `TERRITORY_STYLE_MODE`.
- [x] Replace the narrow paused-render fingerprint with `pax-fluxia/src/lib/territory/buildTerritoryConfigFingerprint.ts` and add focused coverage in `pax-fluxia/src/lib/territory/buildTerritoryConfigFingerprint.test.ts`.

## In Progress

- [ ] User verification that older legacy themes now switch into their expected render families in the live app.
- [ ] User verification that explicit-mode themes like `pax-theme-apr_15_metaball-2026-04-16T16-40-14.json` still reproduce as expected.
- [ ] User verification of the renderer-cache fix using perimeter-field themes that differ mainly by influence radius / ownership-margin-adjacent behavior.
- [ ] User verification that sidebar theme selection now fully refreshes background, alpha, and territory visuals even with the settings panel closed.

## Notes

- The imported pack from `C:\Users\mikep\Downloads\Pax Themes` was not actually committed into `pax-fluxia/src/lib/config/builtin-themes/`; the live bug here is theme application semantics, not missing JSON files in the repo.
- The fix is intentionally small: make legacy themes self-contained at load/import/apply time instead of depending on ambient `GAME_CONFIG` state.
- The decisive bug was architectural, not in `MetaballRenderer` winner resolution: theme application had two runtime paths. `GameSettingsPanel` registered the canonical apply callback only while mounted, but the always-visible sidebar selector still called `themeStore.applyTheme()`. With the panel closed, that path wrote config values without the visual/runtime sync side effects.
- The two user-provided live settings files differ only on runtime map metadata and a visual-epoch counter. The theme file `pax-theme-apr_16_metaball_tweak-2026-04-16T18-11-44.json` does not contain `_MAP_*` fields at all, so those values cannot be reconciled through theme import/export.
- Earlier queue notes incorrectly blamed commander/ownership drift for the geometry mismatch. The user was right to reject that. The confirmed geometry divergence is stale render state: the rendering branch can update `GAME_CONFIG` and visible controls while a paused perimeter-field frame still reuses old geometry because the invalidation fingerprint missed several geometry-driving keys.
- The cross-branch visual mismatch is the combination of two issues: the rendering branch is missing the theme-apply side effects now present on `master`, and the paused `GameCanvas` invalidation path was too narrow to force a re-render when imported themes changed omitted geometry keys.
- Verification runs completed:
  - `bun x vitest run src/lib/config/themeRouting.test.ts src/lib/components/ui/settingsDefs.test.ts`
  - `bun x vitest run src/lib/renderers/MetaballRenderer.test.ts src/lib/config/themeRouting.test.ts src/lib/components/ui/settingsDefs.test.ts`
  - `bun x vitest run src/lib/config/themes.test.ts src/lib/config/themeRouting.test.ts src/lib/config/themeNames.test.ts`
  - `bun x tsc --noEmit`
  - `bun x vitest run src/lib/territory/buildTerritoryConfigFingerprint.test.ts src/lib/config/themes.test.ts src/lib/config/themeRouting.test.ts`

## Lossless User Instruction Log

1. "No, this is terrible. Not a single one presents a useable theme; previous themes have disappeared. You broke it."
2. "Dig deep and diagnose what you did wrong."
3. "The themes are not activating different render modes correctly."
4. "The most recent theme downloaded, \"pax-theme-apr_15_metaball-2026-04-16T16-40-14\", when I import it, it does switch modes and provide the appearance I expect, more or less. None of the others do."
5. "Excuse me, why no commit? Follow the rules [AGENT.md](.agent/AGENT.md)"
