# Worktree Separation Architectural Audit Addendum

Date: 2026-04-26
Base document: `../2026-04-25/WORKTREE_SEPARATION_ARCHITECTURAL_AUDIT_2026-04-25.md`

## Purpose

This addendum does not replace the 2026-04-25 audit. It clarifies how to execute it against the current repo state without rewriting the historical audit itself.

## Execution Judgment

The 2026-04-25 audit is good to act on. No new planning pass is required.

What is required before implementation is a small execution clarification layer:
- treat `diag` as diagnostics, harnesses, metrics, profiling helpers, debug surfaces, and benchmark scripts
- keep performance implementation work in the owning lane:
  - renderer perf -> `render-infra` or `render-family/*`
  - gameplay perf -> `gameplay`
  - UI perf -> `ui-settings` or `ui-surfaces`
- treat `ui-surfaces` as a lane family with expected sublanes:
  - landing / website
  - main menu
  - in-game HUD / overlays
  - map editor

## Current-State Clarification

The UI-settings portion of the 2026-04-25 audit is directionally right but slightly stale in one important respect:
- section components already exist under `pax-fluxia/src/lib/components/ui/settings/`
- the remaining coupling is concentrated in:
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
  - `pax-fluxia/src/lib/components/ui/settingsState.ts`
  - `pax-fluxia/src/lib/components/ui/panelSync.ts`

So the practical Phase 2 target is no longer "split the panel into sections." It is "split settings registry and sync ownership by domain while keeping the panel shell stable."

## Shared File Ownership

Use the following ownership rules during worktree execution:

| File / Surface | Owner | Allowed Cross-Lane Changes |
|---|---|---|
| `src/lib/config/game.config.ts` | shared aggregator; domain content owned by lane-specific config modules | append-only exports or mechanical aggregator wiring only |
| `src/lib/components/ui/GameSettingsPanel.svelte` | `ui-settings` shell | append-only section composition or prop wiring only |
| `src/lib/components/ui/settingsDefs.ts` | `ui-settings` until split; then domain-owned registry files | do not mix unrelated domain edits in one change |
| `src/lib/components/ui/settingsState.ts` | `ui-settings` | shell-level orchestration only; domain helpers should move out over time |
| `src/lib/components/ui/panelSync.ts` | `ui-settings` | shell-level orchestration only; no lane-specific logic unless temporary |
| `src/lib/components/game/GameCanvas.svelte` | `render-infra` | all non-trivial edits require explicit boundary note |
| `src/lib/stores/gameStore.svelte.ts` | `gameplay` | all non-trivial edits require explicit boundary note |
| `src/lib/renderers/RenderContext.ts` and other shared renderer infra | `render-infra` | append-only contracts preferred |

When a change must cross one of these boundaries, log it in the session or branch note and keep the diff mechanically narrow.

## Phase 1 Guardrails

For the first config split:
- no runtime behavior change
- preserve the unified `GAME_CONFIG.*` read/write surface for all existing consumers
- keep import churn inside `pax-fluxia/src/lib/config/` for the initial slice
- treat `game.config.ts` as an aggregator only; domain defaults move out, callers do not

## First Execution Slice

The first implementation branch should be deliberately narrow:
1. Split `game.config.ts` defaults into domain files.
2. Keep the exported unified `GAME_CONFIG` surface intact.
3. Do not rewrite downstream callers outside `src/lib/config/` in that first slice.
4. Land these ownership rules in-repo so future worktrees share the same protocol.

Implementation status on 2026-04-26:
- completed as a narrow config-only slice
- the unified `GAME_CONFIG` surface is still exported from `game.config.ts`
- downstream callers were not rewritten
- defaults are now sourced from:
  - `pax-fluxia/src/lib/config/gameplay.config.ts`
  - `pax-fluxia/src/lib/config/ai.config.ts`
  - `pax-fluxia/src/lib/config/renderer.config.ts`
  - `pax-fluxia/src/lib/config/territory.config.ts`
  - `pax-fluxia/src/lib/config/audio.config.ts`

This is intentionally not the final granularity for config ownership. Finer `ui` and `vfx` config separation remains available as a follow-on slice once real merge pressure justifies it.

## Phase 2 Clarification

The practical Phase 2 target is:
- keep `GameSettingsPanel.svelte` as a thin composition shell
- split settings metadata by domain so lanes stop editing one giant registry
- split persistence and hydration helpers by domain where practical
- preserve one stable shell-level apply path for settings import/export and theme apply

Suggested target shape:

```
components/ui/
├── GameSettingsPanel.svelte
├── panelSync.ts
├── settingsState.ts
├── settings/
│   ├── ControlsSection-*.svelte
│   ├── settings.ai.ts
│   ├── settings.renderer.ts
│   ├── settings.territory.ts
│   ├── settings.vfx.ts
│   ├── settings.gameplay.ts
│   ├── settings.audio.ts
│   └── settingMetadata.ts
```

## Test Gate Clarification

The UI-settings gate should be interpreted as:
- `bun run check`
- panel opens
- sliders work
- theme apply works

## Operational Conclusion

The audit is ready for execution with this addendum. The next correct move is Phase 1's narrow config split.
