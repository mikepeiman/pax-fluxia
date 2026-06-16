# 2026-05-07 - Fix Last-Conquest Overlay Scope Leak

## Problem

The live diagnostics overlay crashed with:

- `displayedActiveFrontOverlayRuntime is not defined`

This happened in `GameCanvas.svelte` during the perimeter debug overlay render pass.

## Cause

`displayedActiveFrontOverlayRuntime` was declared inside the territory update block, then referenced later in the frame render path outside that block.

So the overlay render could reach:

- `renderPerimeterFieldDebugOverlay(...)`

without a variable in scope.

## Fix

- Hoisted `displayedActiveFrontOverlayRuntime` to frame scope before the overlay render / input-yield branch.
- Removed the inner block-local declaration.

## File

- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\components\game\GameCanvas.svelte`

## Validation

- `bun run build`
