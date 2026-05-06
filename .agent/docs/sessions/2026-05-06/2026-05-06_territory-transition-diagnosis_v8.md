# Territory Transition Diagnosis v8
Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Purpose

Fix the new island-collapse defect on the active PVV4 path:

- genuine single-star islands were no longer causing false whole-region disappearance
- but they were now snapping instead of collapsing
- the goal of this checkpoint is to restore true island collapse without reintroducing unrelated region side effects

## Root Cause

The collapse planner was still deriving loop membership from both:

- `primaryStarId`
- `secondaryStarId`

on every boundary section of the disappearing loop.

That is too broad for collapse.

For a true single-star island, same-owner mainland can legitimately appear as secondary influence on the island boundary. When that happened, the island loop was misclassified as a multi-star loop:

- `collapseStarIds = [islandStarId, mainlandStarId]`

That broke two separate checks:

1. collapse eligibility:
   - the planner requires every collapse star for the loop to be conquered on that tick
   - the mainland star was not conquered
   - so the island loop failed collapse eligibility

2. collapse center:
   - single-star collapse centers come from the captured star position
   - once the island loop was mislabeled as multi-star, the loop no longer qualified as a clean single-star collapse

The result was the exact user-visible behavior:

- real island conquest
- no false unrelated disappearance
- but the island no longer collapsed cleanly, so the transition snapped

## What Changed

Files:

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`

### Planner rule change

Loop collapse now derives its star membership from the loop's dominant ownership influence:

- prefer same-owner `primaryStarId`
- only fall back to `secondaryStarId` if no primary IDs exist at all

This change is local to collapse planning. It does **not** broaden transition motion or bring back the old whole-region disappearance behavior.

### Test coverage

Added a regression that simulates:

- a true single-star island
- same-owner mainland present only as `secondaryStarId` on the island boundary

Expected result:

- the island still collapses
- collapse center is the island star center
- mainland does not block collapse eligibility

## Exact Behavior Now

For island collapse on PVV4:

- collapse membership is based on dominant loop stars, not incidental same-owner secondary influence
- a true single-star island remains eligible for collapse when its star is conquered
- collapse center still resolves to the captured island star position
- same-owner mainland no longer suppresses island collapse just because it appears as secondary boundary influence

## Validation

Passed:

- `bun vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`
