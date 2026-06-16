# Territory Transition Diagnosis v15

Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Problem

`canonicalRuntimeOutput is not defined` was still happening after `v14`.

The remaining bug was not inside `renderActiveFrontDebugOverlay(...)` anymore.
It was at the call site: `renderPerimeterFieldDebugOverlay(...)` was being called
outside the inner render block where `canonicalRuntimeOutput` had been declared.

## Correction

- hoisted `canonicalRuntimeOutput` to the enclosing territory-frame scope inside
  `GameCanvas.svelte`
- removed the inner shadow declaration

## Active File

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

## Validation

- `bun run build`
