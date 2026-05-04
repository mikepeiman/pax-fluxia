# Unified AI Planner, Strategic Survey, and Difficulty/Mode Plan

## Purpose
Audit the project and produce a clean, actionable plan for improved AI player behavior and different AI modes, strategies, and difficulties, with MP/SP unification into `common` as the number-one priority.

## Summary
- Findings as-is: SP uses shared AI in `common`, but MP/server still uses a separate inline heuristic. This is the primary architectural defect and must be removed first.
- Findings as-is: the UI stores per-bot difficulty and strategy, but runtime still relies on one global AI difficulty and mostly ignores per-seat strategy selection.
- Findings as-is: the engine already supports reinforcement, retreat, multi-source combat, deferred orders, and star-type modifiers; current AI does not exploit those systems coherently.
- Findings as-is: there is no AI scenario suite or self-play harness, so behavioral tuning and regression control are weak.
- Adopt the userâ€™s proposed shape: one global `StrategicSurvey` is computed once per tick after battle/conquest resolution, then every AI persona reads that same survey to set orders for the next tick.
- First-wave scope is fixed: deliver the shared planner foundation plus R-1..R-7, R-83, R-84, and R-90. Defer R-91 until the unified AI stack is stable.
- External basis for the chosen approach: utility scoring plus shared strategic context / influence-style spatial analysis is the best fit here, based on [Game AI Pro 2, ch. 30](https://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter30_Modular_Tactical_Influence_Maps.pdf), [Game AI Pro 2, ch. 31](https://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter31_Spatial_Reasoning_for_Strategic_Decision_Making.pdf), [GDC Utility Theory](https://gdcvault.com/play/1012841/Improving-AI-Decision-Modeling-Through), [StarCraft RTS AI survey](https://www.cs.mun.ca/~dchurchill/publications/pdf/starcraft_survey.pdf), and [AIIDE choke-point analysis record](https://dblp.org/rec/conf/aiide/Perkins10).

## Artifact And Commit Protocol
- First mutating step, once execution begins, is to create `.agent/docs/plans/2026-04-19/` if it does not already exist.
- Save this plan as `.agent/docs/plans/2026-04-19/AI_PLANNER_UNIFICATION_AND_STRATEGIC_SURVEY_PLAN_2026-04-19.md`.
- Create or update `.agent/docs/plans/2026-04-19/FEATURE_AND_TASK_QUEUE_2026-04-19.md` and add this AI unification workstream as flat task bullets for the day.
- Make a docs-first checkpoint commit before implementation work with message: `docs(plan): add unified AI planner and strategic survey plan`.
- All later implementation commits for this feature line must keep the plan artifact and daily queue in-repo and committed alongside the work they describe.

## Implementation Changes
- Replace the server-only AI path with one shared `common` stack: `StrategicSurvey` for world analysis, `AIPlanner` for candidate generation and scoring, and `AIController` for applying chosen inputs through shared engine APIs.
- Reorder both SP and MP loops to `GameEngine.tick(...) -> StrategicSurvey.build(...) -> AIPlanner.planAll(...) -> apply AI inputs for next tick`. Orders are decided post-resolution and take effect on the following tick.
- Keep `GameEngine` mechanics pure. The survey/planner layer lives beside the engine in `common`, not inside combat resolution.
- Add shared AI wire types: `AIModeId = 'balanced' | 'frontline' | 'match_forces' | 'distributed' | 'backline_pounce' | 'surround' | 'star_aware' | 'pre_conquest_retreat'`, `AIDifficulty = 'easy' | 'normal' | 'hard' | 'expert'`, and `AIPlayerConfig = { slot: number; mode: AIModeId; difficulty: AIDifficulty }`.
- Add `aiPlayers: AIPlayerConfig[]` to shared game settings and MP room options. `slot` is pregame seat order, not runtime session id. Keep gameplay config and AI config separate; do not overload `EngineConfig`.
- Deprecate the single global `difficulty?: string` path after migration. SP and MP both instantiate AI from per-seat configs only.
- Preserve backward compatibility for saved menu values by aliasing current ids to canonical modes: `default -> balanced`, `mirror -> match_forces`, `spread -> distributed`, `ambush -> backline_pounce`, `staraware -> star_aware`, `retreat -> pre_conquest_retreat`.
- Build one `StrategicSurvey` per tick from current state plus `TickEvents`. It must expose frontier vs interior stars, threatened stars, local support, local enemy pressure, hot combat zones, travel-time pressure, neutral expansion value, star-type strategic value, counterattack risk, chokepoint score, retreat routes, and post-conquest chain opportunities.
- Compute chokepoints on the star-lane graph using articulation/bridge-style graph analysis plus ownership/frontier weighting, not a grid system.
- Compute support and threat from one-hop and two-hop reachable force adjusted by transfer rate, travel time, current orders, and pinning state.
- Weight star value by both intrinsic type and current context: green as attack staging, red and purple as defensive anchors, yellow as economic growth, blue as reinforcement mobility.
- Use a utility-based planner over bounded candidate plans. Modes change weighting and priorities; difficulty changes capability, foresight, commitment memory, and noise.
- Candidate actions in v1 are fixed: keep order, cancel bad order, reinforce friendly frontline, attack neutral, attack enemy, coordinated multi-source attack, pin to suppress repair or force response, set deferred post-conquest orders, and pre-conquest retreat to a friendly neighbor.
- Bound multi-source search by evaluating three bundles per target: strongest-only, minimal-winning subset, and full-focus subset. Score each bundle by gain, attrition, reserve left behind, travel time, counterattack exposure, and strategic value.
- Treat pinning and multi-source attacks as shared tactical capabilities used by multiple modes, not separate user-facing modes.
- Ship these modes in wave one: `balanced`, `frontline`, `match_forces`, `distributed`, `backline_pounce`, `surround`, `star_aware`, `pre_conquest_retreat`.
- Ship these fair-skill difficulties in wave one: `easy` with one-hop reasoning and no deferred or bundled attacks; `normal` with limited two-hop support and simple deferred orders; `hard` with full survey, reinforcement, pinning, multi-source, retreat, and star-aware scoring; `expert` with the same rules plus limited two-step operation planning such as capture-and-chain, fix-and-flank, and retreat-then-counter.
- Delivery order is fixed: 1. shared types and per-seat wiring, 2. replace SP and MP entrypoints with the common post-tick loop, 3. ship the survey and tactical capabilities, 4. layer in the eight modes and four difficulties, 5. add instrumentation and self-play for tuning.

## Test Plan
- Unit-test `StrategicSurvey` on fixture graphs for frontier classification, support/threat totals, chokepoint scoring, star-value weighting, retreat-route detection, and counterattack-risk estimation.
- Add planner scenario tests for each mode: frontline reinforcement, match-forces response, even distribution, backline pounce, surround/multi-source pressure, star-aware prioritization, and pre-conquest retreat.
- Add parity tests so the same state, seed, and AI profile produce the same decisions in SP and MP.
- Add wiring tests to confirm per-seat mode/difficulty from menu and lobby reaches runtime AI creation, and that legacy stored ids migrate correctly.
- Add a self-play harness with fixed seeds and representative maps to validate `easy < normal < hard < expert` win-rate ordering, distinct mode behavior, and absence of one universally dominant mode.

## Assumptions And Defaults
- Difficulty remains fair-skill only in this wave. There are no hidden production, combat, or economy cheats.
- The planner acts after each resolved tick, and its orders affect the next tick.
- The first wave uses existing engine mechanics for reinforcement, retreat, deferred orders, and combat resolution; it does not change core combat rules.
- `balanced` replaces `default` as the canonical default mode, while UI labels should retain the existing roadmap language where appropriate.
- R-91, the named personality editor/save-load system, is intentionally deferred until the shared planner, per-seat settings, and test harness are stable.

