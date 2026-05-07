# Session - 2026-05-07 - Attached Menu Panels And Confirmations

## Goal
Make the right-sidebar action controls behave like attached UI instead of detached utilities.

## Facts
- The user explicitly rejected the detached post-stack open pattern.
- The user explicitly required restart and map delete confirmations.
- The user explicitly asked for 200ms transition timing.

## Implementation Summary
- Moved action panels into per-button slots inside the action sections.
- Added open-panel scrolling after layout settles.
- Added generic confirmation modal state for restart and delete actions.
- Normalized touched timing values to 200ms in the sidebar/theme surfaces.

## Verification
- `bun run build` passed.
- `bunx vitest run src/lib/shell/audience.test.ts` passed.
- Needs live human verification in the app.

