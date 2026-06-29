# Territory Review Phase 0 Update 17

Timestamp: 2026-06-29T17:45:06-04:00

Scope: review only. No product-code fix was committed.

## Question

Is Phase Edges / Ember Lattice immediate-display cost caused by newly passing rich transition-session data into the renderer?

Plain-English meaning: the branch now gives these renderers more explicit transition information. That can improve correctness, but it may also make the renderer do more work during a visible frame.

## Source Finding

`CellGridPhaseEdgesFamily.ts` is the actual renderer class for the user-facing `Phase Edges` and `Ember Lattice` labels.

Direct diff check:

- `CellGridPhaseEdgesFamily.ts` has no diff from the original baseline to the review branch.
- `GameCanvas.svelte` does have large changes and now passes `transitionSessions` and localized previous geometry into Phase Edges and Ember Lattice render-family input.

Observation: the heavy transition-plan work is not from new edits inside `CellGridPhaseEdgesFamily.ts`. It is either preexisting renderer cost, a changed input path from `GameCanvas.svelte`, or interaction between the two.

## Timing Finding

In the immediate-display scheduler-isolation state, perf timers repeatedly show one-time transition setup work around captures:

- `territory.phaseEdges.buildPlanForCapturedSession`
- `territory.geometry0319.compute`
- `game.pixi.render.stage`
- `game.renderFrame.territory.present.phase_edges`
- `game.renderFrame.territory.present.ember_lattice`

Representative timer ranges from the focused runs are often in the 20-50ms range for transition setup, plus visible Pixi rendering cost.

## Isolation Experiment

Disposable patch: in `GameCanvas.svelte`, set `transitionSessions: null` only for Phase Edges and Ember Lattice. This tests whether the richer transition-session input is the main cost source.

Artifacts:

- Sessions enabled reference: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-37-00-606Z.json`
- Sessions disabled experiment: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-42-09-584Z.json`

Release build, `/play?bench=1`, map `First Symmetry-6_April 17b`, 5 runs per row, 3000ms measured window, 500ms warmup.

| Row | Sessions enabled p95/p99/worst | Sessions disabled p95/p99/worst | Result |
| --- | ---: | ---: | --- |
| Ember Lattice gameplay | 59.5 / 74.9 / 142.0ms | 58.7 / 66.7 / 159.3ms | mixed |
| Ember Lattice transition | 58.8 / 133.3 / 183.8ms | 58.4 / 108.1 / 216.7ms | mixed |
| Phase Edges gameplay | 49.9 / 50.2 / 209.0ms | 50.1 / 58.5 / 216.8ms | worse |
| Phase Edges transition | 58.1 / 141.3 / 216.4ms | 50.3 / 133.2 / 208.3ms | better p95/p99, still heavy |

Pending wait stayed zero in both variants.

## Observation

Disabling transition sessions is not a sufficient fix. It helps some numbers and hurts others. It does not remove the heavy-frame pattern.

## Corrected Understanding

The branch's clearest proven regression remains late visible territory display, not a proven new Phase Edges renderer cost.

After removing the late-display rules, Phase Edges and Ember Lattice still have real immediate-frame cost, but the cost appears to be a preexisting or input-path-exposed renderer bottleneck, not a simple bad edit inside `CellGridPhaseEdgesFamily.ts`.

## Next Product-Phase Direction

Do not solve this by letting territory go stale. A viable product fix should:

1. Show conquest ownership promptly.
2. Keep or improve correct transition identity.
3. Move expensive transition setup out of the visible frame where possible.
4. Bound any waiting with a strict small budget.
5. Optimize Pixi stage cost separately, because transition setup is not the only visible cost.
