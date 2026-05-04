# AI Implementation Handoff - 2026-04-19

## Purpose
Single running handoff document for the unified AI planner, strategic survey, and per-seat difficulty/mode implementation. This file is the merge handoff artifact for the master agent.

## Scope
- Unify SP and MP AI execution into `common`.
- Replace server-local AI heuristics with the shared planner path.
- Add a once-per-tick strategic survey that runs after battle resolution.
- Wire per-seat AI mode and difficulty from menu/lobby into runtime.
- Add tests and verification coverage for the shared AI path.

## Repo Facts Confirmed
- SP currently uses `common/src/ai/AI.ts` through `pax-fluxia/src/lib/stores/gameStore.svelte.ts`.
- MP/server currently uses an inline heuristic in `pax-server/src/rooms/GameRoom.ts`.
- `MainMenu.svelte` persists per-player `difficulty` and `strategy`, but `applyConfig()` does not forward those per-seat values into runtime settings.
- `common/src/types.ts` still exposes one global `difficulty?: string` field in `GameSettings`.
- The engine already supports reinforcements, friendly retreat behavior, deferred orders, and multi-source combat resolution in shared code.

## Implementation Log
- 2026-04-19: Saved plan artifact at `.agent/docs/plans/2026-04-19/AI_PLANNER_UNIFICATION_AND_STRATEGIC_SURVEY_PLAN_2026-04-19.md`.
- 2026-04-19: Created dated queue entry at `.agent/docs/plans/2026-04-19/FEATURE_AND_TASK_QUEUE_2026-04-19.md`.
- 2026-04-19: Created this running handoff document for merge notes and implementation status.
- 2026-04-19: Added shared AI wire types in `common/src/types.ts`: `AIDifficulty`, `AIModeId`, `AIPlayerConfig`, and `GameSettings.aiPlayers`.
- 2026-04-19: Added `common/src/ai/types.ts` for canonical AI config, legacy alias normalization, per-seat config normalization, and decision shapes.
- 2026-04-19: Added `common/src/ai/StrategicSurvey.ts` with once-per-tick world analysis: frontier/interior classification, threat/support metrics, hotspot detection from `TickEvents`, articulation-point chokepoints, frontier distance, retreat routes, strategic value, and counterattack risk.
- 2026-04-19: Added `common/src/ai/AIPlanner.ts` with eight mode profiles and four fair-skill difficulty profiles. The planner now scores reinforcement, retreat, single-source attack, multi-source attack, pin-window pressure, and deferred follow-up orders from the shared survey.
- 2026-04-19: Added `common/src/ai/AIController.ts` and replaced the legacy `common/src/ai/AI.ts` implementation with a compatibility wrapper over the new controller/runtime. Shared helpers now exist to snapshot schema state, build one survey per tick, prune same-player reverse orders, and apply decisions through `GameEngine.processInput(...)`.
- 2026-04-19: Reworked SP in `pax-fluxia/src/lib/stores/gameStore.svelte.ts` to instantiate AI from per-seat profiles, run `GameEngine.tick(...)` first, then plan/apply AI orders for the next tick from the resolved post-tick state.
- 2026-04-19: Reworked MP in `pax-server/src/rooms/GameRoom.ts` to remove the inline `processAI()` heuristic, create AI controllers for room AI seats, and use the shared post-tick `runAIControllers(...)` path.
- 2026-04-19: Wired menu and lobby config flow end-to-end. `MainMenu.svelte` now builds `aiPlayers` and separate `aiConfig`; `menuDefs.ts` now exposes canonical mode ids and normalizes legacy saved values; `multiplayerStore.svelte.ts` forwards `aiPlayers` and `aiConfig` to room creation.
- 2026-04-19: Added focused tests in `pax-fluxia/src/lib/engine/AI.test.ts` for alias normalization, strategic survey classification/chokepoints, reinforcement via the shared controller path, and compatibility between survey-based planning and `evaluate()`.
- 2026-04-19: Fixed an integration bug discovered by tests: same-player reverse `ISSUE_ORDER` pairs are now pruned in `runAIControllers(...)` so a weaker retreat/reinforce reverse order cannot cancel a stronger shared-plan order via the engine's opposing-order safeguard.
- 2026-04-19: Added missing `pax-fluxia/src/lib/config/geometry0319Debug.ts` so `Geometry_0319.ts` can resolve its debug snapshot/formatter import during frontend builds.
- 2026-04-19: Rebalanced `common/src/ai/AIPlanner.ts` around aggressive expansion and must-attack behavior. Favorable attacks now outrank low-value reinforcements, neutral expansion gets explicit weighting, difficulty thresholds now make easy AI more conservative instead of accidentally making must-attacks easier, and safe same-owner shuttle loops are explicitly penalized/cancelled.
- 2026-04-19: Patched `common/src/conquest.ts` so a conquest cannot leave the newly conquered star with a reverse same-owner order that immediately forms an `A <-> B` shuttle loop with an existing inbound order.
- 2026-04-19: Patched `pax-fluxia/src/lib/lanes/applyLaneTravelPath.ts` so nearside lane headings are flipped forward if a cached/curved lane polyline begins with a backward tangent, fixing attack surge pulses that could animate away from the intended lane.
- 2026-04-19: Added regression coverage for must-expand behavior from a stale shuttle loop, post-conquest reverse-order cleanup, and backward lane-heading correction.

## Decisions Locked
- AI unification into `common` is first priority and must land before behavior tuning.
- The planner runs after `GameEngine.tick(...)`, not before it.
- Difficulty is fair-skill only in this wave; no hidden stat cheats.
- First-wave modes are `balanced`, `frontline`, `match_forces`, `distributed`, `backline_pounce`, `surround`, `star_aware`, and `pre_conquest_retreat`.
- Pinning and multi-source attacks are tactical capabilities, not separate user-facing modes.

## Completed Work
- Docs-first checkpoint commit completed before implementation.
- SP and MP now both use one shared AI stack in `common`.
- Server-local heuristic path removed.
- Per-seat AI difficulty/mode wiring landed for SP and MP room creation.
- Strategic survey, mode profiles, difficulty profiles, multi-source planning, retreat, reinforcement, deferred orders, and pin-window scoring are implemented.
- Focused regression tests added for the new shared AI path.
- Follow-up behavior pass completed for the user-reported problems: AI now prioritizes clear expansion attacks more aggressively, post-conquest reverse loops are sanitized, and attack surge headings are constrained to the lane-forward direction.

## Remaining Follow-Ups
- Full self-play batch tooling and data-driven win-rate tuning are still open follow-up work.
- The frontend project has a large unrelated `svelte-check` backlog; touched AI files were filtered and verified separately, but a full clean frontend type pass still requires addressing pre-existing diagnostics outside this workstream.

## Verification Log
- `bun install` at repo root: completed to hydrate the pinned workspace dependencies in this worktree.
- `bun x tsc -p common/tsconfig.json --noEmit`: passed.
- `bun run build` in `pax-server/`: passed after correcting the existing build target to `bun` and adding the missing direct `@colyseus/core` dependency.
- `bun x vitest run src/lib/engine/AI.test.ts` in `pax-fluxia/`: passed (4 tests).
- `bun run check` in `pax-fluxia/`: still fails on a large set of pre-existing frontend diagnostics, but a filtered run found no diagnostics in the AI files touched by this workstream.
- `bun run build` in `pax-fluxia/`: passed after restoring the missing `src/lib/config/geometry0319Debug.ts` module used by `Geometry_0319.ts`.
- `bun x vitest run src/lib/engine/AI.test.ts src/lib/lanes/applyLaneTravelPath.test.ts` in `pax-fluxia/`: passed (7 tests) after the aggressive-expansion, conquest-loop, and surge-heading fixes.
- `bun run build` in both `pax-fluxia/` and `pax-server/`: passed after the follow-up behavior patch; existing frontend warnings remain non-blocking and unrelated.

## Merge Notes
- The shared AI decision order is now: resolve tick with `GameEngine.tick(...)`, build one `StrategicSurvey` from the post-resolution state plus `TickEvents`, then plan/apply AI orders for the next tick.
- `GameSettings.difficulty` remains in shared types only as a deprecated fallback. Runtime AI creation now prefers `GameSettings.aiPlayers`.
- Canonical mode ids now shipped to runtime are: `balanced`, `frontline`, `match_forces`, `distributed`, `backline_pounce`, `surround`, `star_aware`, and `pre_conquest_retreat`.
- Legacy menu strategy ids are migrated through normalization aliases, so older local storage values continue to work.
- `pax-server/package.json` now builds with `--target bun`, which matches the actual server source imports.
- `pax-server/dist/index.js` was regenerated by the tracked server build and should merge with the source/package changes so the checked-in build output stays aligned with the implementation.
- The AI planner now treats `AI_MUST_ATTACK_RATIO` as a true difficulty-scaled threshold instead of biasing easy AI toward easier must-attacks. Easy is now more conservative, while hard/expert remain the most expansionist and decisive.
- Safe same-owner `A <-> B` shuttle patterns are now attacked from both sides: planner-side cancellation/penalty during evaluation, and conquest-side sanitation if ownership changes would otherwise preserve a reverse loop.
- `common/resources/settings-live/current-settings.json` changed locally during verification, but it is not part of this AI follow-up change set and should stay out of the merge unless someone explicitly intends to update the live settings snapshot.
- Files added:
  - `common/src/ai/AIController.ts`
  - `common/src/ai/AIPlanner.ts`
  - `common/src/ai/StrategicSurvey.ts`
  - `common/src/ai/types.ts`
  - `pax-fluxia/src/lib/engine/AI.test.ts`
- Files materially updated:
  - `common/src/ai/AI.ts`
  - `common/src/ai/index.ts`
  - `common/src/types.ts`
  - `pax-fluxia/src/lib/components/ui/MainMenu.svelte`
  - `pax-fluxia/src/lib/components/ui/menuDefs.ts`
  - `pax-fluxia/src/lib/components/ui/main-menu/PlayersPanel.svelte`
  - `pax-fluxia/src/lib/engine/AI.ts`
  - `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
  - `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts`
  - `pax-fluxia/src/lib/types/game.types.ts`
  - `pax-server/src/rooms/GameRoom.ts`
  - `pax-server/package.json`

