# 2026-05-07 Sidebar Panel Full-Width Alignment

## Purpose
Correct the in-game right-sidebar action disclosures so they open as full-width section content rather than as indented right-column content.

## Facts
- The user explicitly reported that the left alignment was still hugely offset.
- The previous code kept the opened panel inside `menu-action-body`, which preserved a large left indent even after the viewport-overflow correction.
- The problem was still in `pax-fluxia/src/lib/components/game/GameContainer.svelte`.

## Implemented
- Opened action panels and feedback were moved to be direct children of each action section.
- Section disclosures now span the full section width with `grid-column: 1 / -1`.
- The save row layout was tightened so the input can actually shrink inside the sidebar.

## Verification
- `bun run build`
- Human in-app verification still required
