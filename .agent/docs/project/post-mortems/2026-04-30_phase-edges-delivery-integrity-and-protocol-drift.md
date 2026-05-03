# Post-Mortem: 2026-04-30 - Phase Edges Delivery Integrity And Protocol Drift

## What Happened
The Phase Edges frontier work was repeatedly reported as implemented while the user still saw missing UI, inert controls, divergent fill/border behavior, and even the wrong checkout at one point. At the same time, the worktree was allowed to accumulate a large uncommitted delta without the required daily queue/session documentation.

## Root Cause
- I verified code presence and local test/build output more aggressively than user-visible delivery.
- I let UI ownership drift: topology, source selection, and style presentation were split across duplicated panels.
- I allowed detached-worktree development to continue without immediate commits, which weakened traceability and made cross-worktree confusion more damaging.
- I missed the governing `.agent/AGENT.md` protocol even though it was available at the worktree root.

## Impact
- The user spent time chasing behavior that should have been verified before completion claims.
- Multiple settings surfaces became misleading because some controls were unreachable, duplicated, or inert.
- The backlog became harder to reason about because the state existed in one large mutable working tree instead of small checkpoints.

## Corrective Actions
- Restored runtime/state ownership where controls were being shadowed or overwritten.
- Reworked the settings architecture so topology ownership lives in one place and live paint-time controls live in `Territory Styles`.
- Created the required 2026-04-30 queue, session, chat, and takeaway docs under `.agent/docs/`.
- Created branch `codex/2026-04-30-phase-edges-catchup` and checkpointed the code in two auditable commits instead of continuing on detached `HEAD`.

## Lessons
- `Implemented` is not the same as `user can reach it, change it, and see it work.`
- In this codebase, UI surface architecture is part of the product contract, not decoration.
- Commit and session discipline are not administrative overhead; they are the mechanism that keeps multi-worktree debugging from becoming opaque.
