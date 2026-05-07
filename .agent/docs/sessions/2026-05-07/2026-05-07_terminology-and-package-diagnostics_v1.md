# Terminology And Package Diagnostics v1

Date: 2026-05-07
Branch: `codex/render-infra/pvv4-transition-bets`

## Prompt

The user called out a direct failure to answer terminology corrections, demanded a post-mortem, and added three concrete package/overlay problems:

1. package names were not semantic
2. the snap package render showed the wrong star and the wrong defect front
3. the overlay legend used the wrong terms

## Direct Corrections

- Added post-mortem:
  - `.agent/docs/project/process/POST_MORTEM_2026-05-07_TERMINOLOGY_NON_RESPONSE.md`
- Updated communication rules:
  - explicit terminology corrections must be answered directly
  - UI/debug labels must use project terms
  - defect labels must be defined in one sentence

## Code Changes

- Legend terminology corrected in:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`
- Package conquest labels made more semantic in:
  - `pax-fluxia/src/lib/territory/devtools/conquestNaming.ts`
- Transition package naming now adds `_snap` for classification-defect / no-front snap exports in:
  - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
- Reference frame now focuses on the actual conquest stars first, instead of drawing every remote defect equally:
  - `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`

## Validation

- `bun vitest run src/lib/territory/devtools/conquestNaming.test.ts src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts src/lib/territory/devtools/TransitionBundleSerializer.test.ts`
- `bun run build`
