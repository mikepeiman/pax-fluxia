# Territory Transition Diagnosis v20

- Date: `2026-05-07`
- Branch: `codex/render-infra/pvv4-transition-bets`

## Snap Package: `14-14-52---673_cq_S16-to-S28_S40+1-to-S26_snap_tdp`

### Direct finding

The exported `front_reference` render confirms that the intended transition algorithm is still not the one running.

### Exact evidence

From `05_active_front_plan.json`:

- Planned front 1:
  - `anchorStartId = 1058.15,611.11`
  - `anchorEndId = 1129.03,513`
  - `prevPathPointCounts = [11]`
  - `nextPathPointCounts = [20]`
  - `changeSpan.base = next`
  - `changeSpan.startIndex = 0`
  - `changeSpan.endIndex = 19`
- Meaning:
  - the planner is still selecting a whole sampled `POST` chain and moving it by index window
  - it is not first constructing equal-number monotonic change vertices on `PRE` and `POST`

- Planned front 2:
  - `anchorStartId = 856.93,288.97`
  - `anchorEndId = 856.93,288.97`
  - the planner produced a closed loop around one repeated anchor
- Meaning:
  - this is not a valid active front
  - it is a degenerate loop being treated as a front candidate

- Additional defects:
  - `defect_topology_gap` entries exist around the same upper conquest area
  - this package therefore contains both:
    - one whole-chain motion decision
    - one degenerate self-anchored loop

### Conclusion

The current planner/sampler is still operating on:
- sampled chain selection
- first/last divergence indices
- `lerpArcAligned(prevChain, nextChain, t)`

It is not yet operating on:
- actual `PRE` active front
- actual `POST` active front
- equal-number monotonic corresponding change vertices
- direct `PRE -> POST` vertex lerp

That is why the `front_reference` render can look coherent as a debug artifact while still proving the wrong algorithm is running.

## Capture ID improvement

Implemented a deterministic short capture hash for every conquest capture.

- It now participates in:
  - bundle ID
  - export/package prefix
  - package zip name
  - package root folder
  - internal render filenames
  - internal debug filenames

Purpose:
- stop confusion when reviewing multiple snap packages side by side
- make every exported artifact traceable back to exactly one conquest capture
