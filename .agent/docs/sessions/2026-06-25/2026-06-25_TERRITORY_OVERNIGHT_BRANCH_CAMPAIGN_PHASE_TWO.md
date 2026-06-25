# Territory Overnight Branch Campaign - Phase Two Operating Spec

Date: 2026-06-25  
Status: execution-ready planning doc  
Scope: geometry authority, deterministic constraints, transition orchestration, Grid Gradient provenance/performance, validation, branch protocol

## 0. Intent

This is not a conservative patch list. It is a branch/worktree campaign for making territory rendering substantially more consistent, deterministic, transition-correct, and performant while preserving reversible git history.

Proceed boldly inside isolated branches. The safety model is:

- each major change is committed in a clear branch history;
- default promotion requires hard gates;
- failed promotion is reverted with an additive commit, not history rewrite;
- shared/choke-point files may be edited when the architecture requires it, but those edits get narrow commits and explicit notes.

The coordination board at `.agent/intra-agent-coordination.md` is guidance for situational awareness, not a hard ownership lock.

## 1. Branch And Worktree Campaign

Use `origin/master` as the base reference. Work in pushed branches, not as loose edits in the main root.

Recommended branches:

- `codex/territory-overnight-integration`
- `codex/territory-geometry-authority`
- `codex/territory-transition-v2`
- `codex/grid-gradient-provenance-perf`
- `codex/territory-validation`

Git protocol:

- No force-push, destructive reset, branch deletion, or rebasing already-shared work.
- Commit small coherent tranches.
- Stage new files explicitly.
- Prefer `git commit -- <exact paths>` for implementation commits.
- Push every useful branch commit.
- Merge lane branches into the integration branch with normal merge commits.
- If a merge or promotion fails, revert the merge/promotion commit or fix forward with a new commit.
- Do not clean, delete, or move files outside the project root unless that filesystem action is explicitly part of worktree setup and the path is printed first.

Commit shape:

1. Tests or instrumentation before behavior change where practical.
2. Core implementation.
3. Integration/default promotion.
4. Validation report or artifact references.

## 2. Core Technical Thesis

Current contracts describe a rich authoritative geometry model, but operational paths still downgrade the truth:

- `ResolvedGeometrySnapshot` and `FrontierTopology` already express single-source frontier identity.
- The live assembler still has order-sensitive junction behavior.
- `powerCore` proves shared-edge/DCEL loop construction in tests but is not live authority.
- Transition planners still begin with coordinate-stable anchors and first sorted branches.
- Grid Gradient worker transport strips topology and fabricates empty reliable topology.
- Some render modes are presentation-distinct but do not yet consume shared provenance consistently.

The campaign order is:

1. Make static geometry truthful and deterministic.
2. Make transitions consume topology/identity instead of rediscovering shape from coordinates.
3. Make Grid Gradient and cell-grid presentations preserve provenance while staying fast.
4. Promote defaults only after tests, screenshots, and benchmark gates pass.

## 3. Lane A - Geometry Authority

Goal: make static geometry closed, deterministic, shared, and inspectable.

Primary work:

- Replace first-unused continuation in `executeChainWalk` with angular planar traversal.
- Add deterministic tie-breakers for equal-angle outgoing arcs.
- Add a geometry invariant oracle:
  - all emitted loops close;
  - no self-intersecting region loops;
  - no missing owner region for owned stars;
  - no duplicate or reversed duplicate physical frontier section;
  - shared border sections exist once and are referenced by both adjacent owners;
  - `sharedFrontierMap` remains a multimap;
  - region IDs and loop IDs are deterministic under input reorder;
  - reliability flags are false when invariant checks fail.
- Wire `powerCore` as a candidate authority:
  - convert current power cells to `PowerCell[]`;
  - build shared-edge graph;
  - walk region loops from the graph;
  - adapt to `ResolvedGeometrySnapshot`;
  - keep current default until promotion gates pass.
- Add constraint artifact discipline:
  - stable artifact IDs;
  - fixed stage order;
  - fingerprint participation;
  - diagnostics for constraints that risk topology identity or closure.

Promotion gate:

- Current failing clockwise-junction fixture passes.
- 2-owner seam, 3-way junction, 4-way junction, disconnected owner, world-boundary, and min-star-margin fixtures pass.
- Reversed input order produces identical IDs.
- Current render-family geometry can generate without missing regions.
- No topology is marked reliable unless the invariant oracle agrees.

## 4. Lane B - Transition V2

Goal: make transitions topology-first and multi-mode, not coordinate-first and fragile.

Primary work:

- Add topology-first correspondence:
  - region correspondence by owner plus real star membership;
  - topology vertex correspondence by incident region/owner sets and world side;
  - coordinates used only after identity exists, to classify moved versus unmoved;
  - changed frontier seeds from conquest events and same-owner topology changes;
  - branch-exhaustive outward search from changed seeds to real change anchors;
  - active-front components owned by region responsibility;
  - section matching for `1:1`, `1:M`, `M:1`, and named-defect `M:N`;
  - shared moving 3V constraints so adjacent fronts sample the same coordinate.
- Fold V2 planning into `pvFrontline` first.
- Keep `crossfade`, `off`, and static fallback modes.
- Use `unified_topology` for exact sampler proof once frame reconstruction is reliable.
- Replace silent skips with named diagnostics and deterministic fallback.

Promotion gate:

- `t=0` equals PRE geometry.
- `t=1` equals POST geometry.
- Midpoint frame rebuilds closed fills from interpolated sections.
- Unsupported topology changes produce named fallback, not broken morphs.
- Existing transition modes still work.

## 5. Lane C - Grid Gradient Provenance And Performance

Goal: preserve topology/provenance through Grid Gradient and keep cold/load/transition performance high.

Primary work:

- Replace minimal Grid Gradient worker geometry transport with compact serializable topology:
  - section IDs;
  - owner pair IDs;
  - section points;
  - reliability flags;
  - optional section influence/provenance when available.
- Stop fabricating empty topology with `topologyReliable: true`.
- Add frontier-section seeded wave planning:
  - changed cells tagged by owner pair;
  - flip time seeded from relevant frontier section;
  - A/B against current `pre_to_post_frontier`.
- Generalize successful provenance seeding to cell-grid Phase Edges and Phase Field.
- Keep performance trace-led:
  - confirm cold Grid Gradient shader-link behavior;
  - use transferables only where measured;
  - preserve no-blank fallback;
  - cache role scans, distance buffers, packed textures, and topology seed tables by plan key.

Promotion gate:

- No blank Grid Gradient frame on cold load.
- No more than 5 percent regression in matched benchmark average, p95, or max frame timing.
- Topology-seeded wave is visually at least as good as current wave.
- Worker path and synchronous fallback produce equivalent plans.

## 6. Lane D - Validation And Integration

Goal: prove the campaign before default promotion.

Validation commands:

```powershell
cd pax-fluxia
bun x vitest run src/lib/territory
bun run check
bun run build
```

After source edits under graph scope:

```powershell
bun run agentic:graphify:build
```

Benchmark matrix:

- default territory scenarios;
- explicit Grid Gradient cold load and gameplay;
- conquest diagnostic and conquest animation;
- transition-heavy scenarios for `pv_frontline`, `crossfade`, `off`, and `unified_topology` when enabled.

Required visual artifacts:

- steady state;
- conquest start;
- transition midpoint;
- final frame;
- Grid Gradient cold switch;
- any fallback/defect state.

Acceptance:

- no new unowned failures;
- pre-existing failures documented with baseline evidence;
- no visual blanking;
- transition endpoints exact;
- topology diagnostics honest;
- every default promotion is a reversible commit.

## 7. Bounded Failure Loops

The project has deep history and multiple prior attempts. Agents should use loops, but loops must be bounded. Every loop iteration records:

- hypothesis;
- evidence gathered;
- files/docs/commits consulted;
- change made or explicitly not made;
- validation command;
- result;
- next decision.

### 7.1 Geometry Failure Loop

Trigger:

- invariant oracle fails;
- a region disappears;
- loop closure fails;
- shared edge appears twice;
- geometry differs under input reorder;
- a constraint edit breaks topology.

Iteration body:

1. Reproduce with the smallest fixture or saved snapshot.
2. Query graphify for the involved symbols.
3. Search current source with `rg`.
4. Search session docs for matching failure terms.
5. Inspect git history for the touched symbol or fixture.
6. Implement the smallest fix or add a narrower diagnostic.
7. Run the focused test and invariant oracle.

Limits:

- maximum 3 implementation iterations per distinct geometry failure;
- after 2 failed iterations, invoke adversarial geometry review;
- after 3 failed iterations, stop default promotion for that path and commit the diagnostic fixture/report.

Exit:

- pass focused test and invariant oracle; or
- preserve old default, keep candidate behind source flag, and document blocker.

### 7.2 Transition Orchestration Loop

Trigger:

- `t=0` or `t=1` mismatch;
- midpoint fill is open or self-intersecting;
- branch choice is ambiguous;
- split/merge classification unsupported;
- fallback rate is unexpectedly high;
- adjacent fronts disagree on a moving 3V.

Iteration body:

1. Reduce to one PRE/POST topology pair.
2. Dump region diff, topology correspondence, changed seeds, branch traces, section matches, and sampled frame.
3. Compare current planner against May transition docs.
4. Inspect prior `pvFrontline`, `ActiveFrontTransition`, and `TopologyFrameSampler` commits.
5. Fix planner classification or add a named defect.
6. Run endpoint, midpoint, and fallback tests.

Limits:

- maximum 4 implementation iterations per transition case;
- after 2 failed iterations, use a transition council review;
- after 4 failed iterations, require deterministic fallback for that case and do not promote the planner as default.

Exit:

- exact endpoint and closed midpoint frame; or
- named fallback with artifact and fixture committed.

### 7.3 Grid Gradient And Performance Loop

Trigger:

- blank frame;
- cold-load stall;
- benchmark regression greater than 5 percent;
- worker/sync plan mismatch;
- topology-seeded wave looks worse than current wave.

Iteration body:

1. Capture baseline metric and artifact.
2. Identify stage owner: geometry, classification, wave plan, worker clone/transfer, texture pack/upload, shader link, render update.
3. Change only the measured stage.
4. Re-run the same benchmark and screenshot.
5. Keep the change only if metric or correctness improves without visual regression.

Limits:

- maximum 3 implementation iterations per performance symptom;
- after 2 failed iterations, invoke perf adversary review;
- after 3 failed iterations, revert the perf attempt and keep only instrumentation.

Exit:

- benchmark within acceptance and no blanking; or
- instrumentation committed, optimization deferred.

### 7.4 Documentation And Research Loop

Trigger:

- two local code/doc passes fail to explain a behavior;
- algorithm choice is unclear;
- prior docs conflict;
- an implementation requires computational geometry, transition planning, or browser performance knowledge not already validated in repo docs.

Source order:

1. Current source and graphify.
2. Session docs from 2026-06-16 through 2026-06-23.
3. Older transition docs from 2026-04-24 through 2026-05-16.
4. Git log, git blame, and branch/worktree history.
5. Archived bundles or prior worktrees.
6. Web research from primary sources only for general algorithms, WebGL/browser performance, or library behavior.

Limits:

- maximum 90 minutes per research block;
- maximum 2 research blocks per lane before converting findings into code/tests or a blocker report;
- web research must cite source URLs in the lane report when used.

Exit:

- decision recorded with evidence; or
- unresolved ambiguity becomes an explicit risk and default promotion is blocked.

## 8. Adversarial Review And Expert Council

Use adversarial review before default promotion and whenever a bounded loop reaches its escalation threshold. If multi-agent tools are available, assign separate agents. If not, one agent must run the roles sequentially and write the result.

Roles:

- Geometry Invariant Auditor: tries to prove fills, borders, IDs, and topology can diverge.
- Transition Skeptic: tries to find a PRE/POST pair that breaks endpoint exactness or branch classification.
- Performance Profiler: rejects unmeasured optimizations and checks cold/load/transition metrics.
- Integration Maintainer: checks commit boundaries, reversible history, graphify rebuild, and mode compatibility.
- Render Observer: reviews screenshots for visual regression, blank frames, misalignment, and confusing fallback visuals.

Council protocol:

1. Each role lists blocking findings, non-blocking risks, and missing evidence.
2. Implementation owner fixes blockers or explicitly demotes the feature from default promotion.
3. Run at most 2 council rounds per promotion.
4. If blockers remain after 2 rounds, commit the work behind a flag/candidate path and document why it is not default.

## 9. Research-Driven Search Recipes

Use these when loops trigger.

Graphify:

```powershell
graphify query "executeChainWalk FrontierTopology transition planner Grid Gradient provenance"
graphify explain "TransitionLayerCoordinator"
graphify explain "executeChainWalk"
graphify path "buildFamilyGeometry" "TransitionLayerCoordinator"
```

Docs:

```powershell
rg -n "junction|chain walk|topology|FrontierSection|transition|Grid Gradient|provenance|determin|constraint|performance" .agent/docs
```

Git:

```powershell
git log --oneline -- pax-fluxia/src/lib/territory
git log -S "executeChainWalk" -- pax-fluxia/src/lib/territory
git log -S "frontierTopology" -- pax-fluxia/src/lib/territory
git blame -- pax-fluxia/src/lib/territory/compiler/chainWalkCore.ts
```

Benchmarks:

```powershell
cd pax-fluxia
bun run debug:browser-gameplay-perf
$env:PAX_BENCH_TERRITORY_MODE='grid_gradient'; bun run debug:browser-gameplay-perf
bun run debug:browser-gameplay-summary
```

## 10. Default Promotion Rules

Default promotion is allowed. It is the point of the campaign. It is also gated.

Promote a new path to default only when:

- focused tests pass;
- full territory tests pass or failures are documented as pre-existing;
- build/check pass;
- benchmark matrix passes;
- screenshots/artifacts pass render review;
- adversarial council has no blocking findings;
- fallback behavior is deterministic and named;
- the promotion itself is one narrow revertable commit.

Do not promote by mixing engine work, UI settings, and fallback changes in one commit.

## 11. Adaptive Multi-Sprint Control

The campaign should run as a sequence of bounded sprints, not as one long uninterrupted implementation. End-goal primacy beats checklist completion.

Primary end goal:

> Make territory geometry and transitions consistently correct, deterministic, performant, and default-safe, with every ambitious change preserved in clear reversible branch history.

Priority order when tradeoffs collide:

1. No broken default path.
2. Deterministic geometry truth and honest reliability flags.
3. Exact transition endpoints and closed sampled frames.
4. Provenance preserved across render families.
5. Measured performance improvements with no blanking.
6. Broader mode exposure and UI polish.

Sprint cadence:

- Each sprint is 60-120 minutes or one coherent commit, whichever comes first.
- A lane may run at most 3 consecutive implementation sprints without an integration realignment check.
- Every sprint must end with one of: pushed commit, reverted local attempt, or blocker report.
- Do not keep half-proven behavior sitting unstaged or unreported across sprint boundaries.

Sprint opening checklist:

- Restate the end goal in one sentence.
- State the current lane objective.
- Name the validation gate this sprint is trying to unlock.
- Name the most likely way the sprint could damage correctness, determinism, performance, or branch clarity.
- Confirm whether the work is default-path, candidate-path, diagnostic-only, or research-only.

Sprint closing checklist:

- Did this move the end goal, or only complete a local task?
- Did evidence disprove any assumption from the prior sprint?
- Should the feature remain candidate-only, become default-eligible, or be demoted?
- Is the next step still the highest-leverage step?
- Is branch history clean enough to cherry-pick or revert?
- Are there new docs, fixtures, screenshots, or benchmark artifacts that must be committed?

Realignment triggers:

- geometry reliability remains false after a geometry sprint;
- transition endpoint exactness fails after a transition sprint;
- Grid Gradient or cell-grid performance regresses after an optimization sprint;
- a lane starts editing broad shared surfaces without a narrow commit boundary;
- a council role finds a blocker;
- a sprint completes work that does not improve the primary end goal;
- a new failure suggests the current lane is building on untrusted geometry or topology.

Realignment actions:

- If geometry is not trustworthy, pause transition promotion and invest in oracle/candidate geometry first.
- If transition V2 cannot prove exact endpoints, keep it candidate-only and improve deterministic fallback.
- If performance cannot be measured, add instrumentation before optimizing.
- If provenance transport destabilizes worker behavior, keep topology-seeded wave as A/B and preserve the old path.
- If default promotion becomes risky, split promotion into its own commit or defer it.
- If two lanes conflict, merge neither blindly; create an integration commit that states the chosen behavior.

Integration owner cadence:

- Every 2-3 hours, inspect pushed lane branches, validation status, and blocker reports.
- Merge only branches that have a coherent sprint-close state.
- Prefer preserving useful candidate work over forcing it into default behavior.
- Keep an integration note listing: defaulted, candidate, blocked, reverted, next best action.

## 12. Friction Budget

The plan should create useful pressure, not ceremony. Treat the following as hard constraints:

- reversible git history;
- no destructive local filesystem actions outside the intended worktree;
- deterministic geometry and transition gates before default promotion;
- evidence for correctness and performance claims;
- named fallback instead of silent failure;
- explicit report when a lane is blocked or demoted.

Treat the following as soft guidance, not mandatory process:

- exact branch names;
- exact sprint duration;
- number of active lanes;
- adversarial council for non-default candidate work;
- full benchmark matrix after every small commit;
- web research before local docs, source, and git history are exhausted;
- long written reports when a commit message plus validation output already captures the sprint result.

Tier validation to reduce drag:

- Micro-check: focused unit test or fixture for the code just changed.
- Lane-check: relevant territory/render-family tests plus `bun run check` when types/contracts changed.
- Promotion-check: full territory tests, build, graphify rebuild when needed, screenshots, and benchmark matrix.

Remove or defer work that becomes friction:

- Do not build UI exposure before the engine path is trustworthy.
- Do not require perfect transition coverage before landing diagnostic/fallback infrastructure.
- Do not optimize unmeasured performance paths.
- Do not keep polishing candidate APIs if invariant tests still fail.
- Do not block useful candidate commits because default promotion is not yet safe.

## 13. Stop Conditions

Stop coding and write a report when any of these happen:

- a lane exceeds its bounded loop limits;
- validation cannot run because of environment failure after two setup attempts;
- a change requires deleting or overwriting unrelated local work;
- external state or credentials block required validation;
- default promotion would require unresolved branch conflicts across active work.

The report must include:

- branch name;
- last commit;
- commands run;
- artifacts;
- blockers;
- exact next action.

## 14. Overnight Success Definition

A successful overnight run does not need every ambitious feature fully defaulted. It must leave the repo better in durable, selectable, validated pieces:

- live geometry assembler defect fixed;
- invariant oracle and fixtures landed;
- `powerCore` candidate authority wired far enough to compare against current geometry;
- transition V2 foundations producing exact endpoints or named fallback;
- Grid Gradient provenance no longer stripped silently;
- measured performance remains stable or improves;
- every branch pushed with clear commits;
- integration report explains what is default, what is candidate, and what is blocked.
