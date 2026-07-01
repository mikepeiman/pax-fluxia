# Territory Review Phase 0 Update 16

Timestamp: 2026-06-29T17:39:52-04:00

Scope: review correction. No product-code fix was committed.

## Correction

Update 15's strong `KEEP` verdict for the `CellGridFamily.ts` fill/border split is downgraded to `INCONCLUSIVE` for Phase Edges and Ember Lattice.

Why: I verified that the user-facing Phase Edges and Ember Lattice modes are registered through `CellGridPhaseEdgesFamily.ts`, not the plain `CellGridFamily.ts` implementation that I rolled back in that experiment.

Evidence in source:

- `GameCanvas.svelte` imports `createCellGridPhaseEdgesFamily` and `createCellGridEmberLatticeFamily` from `CellGridPhaseEdgesFamily.ts`.
- The render paths for the user-facing labels `phase_edges` and `ember_lattice` instantiate `CellGridPhaseEdgesFamily`.

That means the Update 15 renderer-file rollback was not a clean causal boundary for these modes.

## Instrument Check

I reran the same split-kept disposable state after restoring `CellGridFamily.ts`.

Artifacts:

- First split-kept run: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-19-06-056Z.json`
- Renderer-file rollback run: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-28-43-093Z.json`
- Split-kept rerun: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-37-00-606Z.json`

| Row | First split-kept p95/p99/worst | Renderer rollback p95/p99/worst | Split-kept rerun p95/p99/worst |
| --- | ---: | ---: | ---: |
| Ember Lattice gameplay | 41.7 / 50.1 / 133.3ms | 58.3 / 91.4 / 175.0ms | 59.5 / 74.9 / 142.0ms |
| Ember Lattice transition | 50.0 / 91.7 / 183.4ms | 59.1 / 133.5 / 175.5ms | 58.8 / 133.3 / 183.8ms |
| Phase Edges gameplay | 33.4 / 50.0 / 133.2ms | 49.2 / 66.7 / 208.1ms | 49.9 / 50.2 / 209.0ms |
| Phase Edges transition | 33.3 / 83.4 / 108.4ms | 58.8 / 141.9 / 191.7ms | 58.1 / 141.3 / 216.4ms |

Observation: the split-kept rerun moved toward the slower profile even though `CellGridFamily.ts` was restored. Therefore the earlier Update 15 result is not reliable attribution.

## Corrected Verdict

- `ae471a6c2` renderer-file split remains `KEEP-WITH-FOLLOWUP` for the plain Cell Grid row from Review Loop 9.
- For Phase Edges and Ember Lattice, Update 15's renderer-file verdict is now `INCONCLUSIVE / INVALIDATED`.
- The next valid target for Phase Edges and Ember Lattice is `CellGridPhaseEdgesFamily.ts`, not `CellGridFamily.ts`.

## Useful Finding

The immediate-display heavy cost is still real, but the likely owner is now clearer:

- `CellGridPhaseEdgesFamily.ts` builds transition plans and previous/next geometry for Phase Edges and Ember Lattice.
- Perf timers show one-time transition setup work around captures, including `territory.phaseEdges.buildPlanForCapturedSession` and `territory.geometry0319.compute`, often in the 20-50ms range.
- Pixi stage rendering can also be a visible part of the frame cost.

## Next Review Target

Inspect and isolate `CellGridPhaseEdgesFamily.ts` transition-plan behavior. The core question is whether it is rebuilding or blocking on transition setup at the wrong time, and whether that setup can be moved off the visible frame without letting the displayed territory go stale.
