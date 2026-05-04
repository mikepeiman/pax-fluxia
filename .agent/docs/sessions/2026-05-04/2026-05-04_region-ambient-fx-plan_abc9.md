# Regional Ambient Signature FX Plan - 2026-05-04

## Purpose

"developing next-level SFX/VFX for my game backgrounds"

## Insights

- The right direction is owned-region ambience, not bigger conquest fireworks.
- Frontier identity is the highest-value layer because the frontier is already visually meaningful.
- The effects must stay presentation-only and consume existing territory truth.
- The current repo already has usable FX seams; the missing piece is a continuous region ambient system plus a data-driven cosmetic profile model.

## Current tasks

- Save a durable VFX vision/spec in `.agent/docs/game/vfx/REGIONAL_AMBIENT_SIGNATURE_FX.md`.
- Record today's queue, chat, session note, takeaways, and merge handoff for this detached worktree.
- Lock the initial implementation order so later coding work does not start from a blank slate.

## Assumptions

- "game backgrounds" here means in-game owned-region ambience, not main-menu background art.
- The first implementation should bias toward subtle interior/frontier effects before any premium particle density.
- Phase 1 should avoid bespoke support for every legacy territory renderer.

## Memory gaps

- Which current runtime shape exposes the cleanest reusable owned-region mask with the least duplication.
- Whether direct legacy renderers need any phase-1 support beyond frontier-only overlays.
- Where player-facing cosmetic selection will ultimately live in the UI without creating premature settings churn.

## Plan

1. Lock the design language and technical rules in a durable game-VFX spec.
2. Treat region ambience as a presentation/VFX consumer of existing territory truth.
3. Build the system in layers:
   - interior shader
   - sparse particles
   - frontier treatment
   - accent events
4. Implement in waves:
   - scaffold and neutral baseline
   - interior shader wave
   - frontier wave
   - sparse particles
   - accent events
5. Keep merge risk down by isolating new logic in territory VFX/presentation modules and keeping `GameCanvas.svelte` and `territory.config.ts` edits narrow.
