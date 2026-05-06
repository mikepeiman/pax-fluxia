# Territory Transition Diagnosis v10

Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Overlay

Implemented a live PVV4 boundary-and-vertices classification overlay.

What it now does:

- classifies every visible frontier section as:
  - `unchanged`
  - `active`
  - `gap`
  - `split`
  - `no-span`
- classifies every visible structural vertex as:
  - `vertex`
  - `stable`
  - `defect`
  - `front`
- labels active sub-sections with their local point-index span
- can pause immediately on conquest start
- can still pause on boundary-classification defect

Files:

- `pax-fluxia/src/lib/territory/devtools/activeFrontClassificationOverlay.ts`
- `pax-fluxia/src/lib/territory/adapters/pixi/PixiTerritoryDebugOverlay.ts`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/territory/devtools/overlayConfig.ts`

## Two-star snap diagnosis

Likely root cause for the 2-star-to-1-star snap:

- conquest-local anchor-pair gating only used:
  - captured star
  - attacker star(s)
- for a 2-star previous region, the changed frontier can still be attributed to the surviving star
- when that surviving star was not in the gating set, the planner could drop the local pair entirely
- result: no front planned, visible snap

## Targeted fix

For conquest-local gating only:

- if the conquered star belonged to a `previousRegion` with exactly two `anchorStarIds`
- include both of those region stars in the relevant conquest star set

This keeps the surviving star available to section-attribution gating without reopening global region-wide gating.

## Validation

- `bun vitest run src/lib/territory/devtools/activeFrontClassificationOverlay.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`
