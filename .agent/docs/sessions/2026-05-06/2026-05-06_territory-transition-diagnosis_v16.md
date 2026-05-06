# Territory Transition Diagnosis v16

Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Problem

`v15` was still incomplete.

Even after hoisting the local declaration, the outer diagnostics overlay path was
still conceptually wrong: it was trying to consume a callback-local
`canonicalRuntimeOutput` from outside the queued territory render callback.

## Correction

- introduced component-level `canonicalDebugRuntimeOutput`
- update it when canonical bridge rendering produces a runtime output
- clear it at the start of each queued territory render pass
- the outer `renderPerimeterFieldDebugOverlay(...)` path now reads
  `canonicalDebugRuntimeOutput`, not the callback-local variable

## Active File

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

## Validation

- `bun run build`
