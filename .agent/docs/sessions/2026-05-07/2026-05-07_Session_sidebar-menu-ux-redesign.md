# Session - 2026-05-07 - Sidebar Menu UX Redesign

## Goal
Correct the in-game right-sidebar menu so it behaves and reads like a player-facing product surface.

## Facts
- The user explicitly rejected the prior miniature card layout.
- The user explicitly called out the right-hand always-open in-game menu as the intended surface.
- The screenshot showed weak hierarchy, cramped actions, and an overbuilt theme block.

## Implementation Summary
- Replaced the three-card action layout with stacked action rows.
- Improved baseline menu row styling for clearer hover, focus, and selection hierarchy.
- Simplified the menu theme block into a standard selector-plus-actions structure.
- Removed developer-facing theme-routing jargon from the player-facing menu variant.

## Verification
- `bun run build` passed.
- Needs live human verification in the app.

