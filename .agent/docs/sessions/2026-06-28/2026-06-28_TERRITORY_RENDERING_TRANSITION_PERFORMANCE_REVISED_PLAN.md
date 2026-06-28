# Territory Rendering, Transition, And Performance Revised Plan

**Created:** 2026-06-28 15:08:18 -04:00
**Status:** Draft plan, not action mode
**Scope:** Geometry consistency, deterministic constraints, conquest transitions, multiple transition modes, and high-performance rendering across game states.

## 1. Corrected Ground Truth

The loaded board is immutable during current gameplay.

Board layout means:

- star count;
- star positions;
- lane count;
- lane connections;
- lane shape;
- lane distance.

Those values are setup/load facts. They can change during map generation, map
load, map editing, restart, or new-map creation. They do not change during a
loaded game.

Gameplay changes ownership, ships, orders, combat state, conquest events,
transition progress, and visual effects. Territory geometry changes because it
is derived from ownership/settings over the fixed board.

If live gameplay appears to change board layout, the correct response is to
suspect the diagnostic first, then treat a confirmed mutation as a bug. Do not
design normal renderer behavior around impossible board-layout changes.

## 2. This Plan Is Not Just A Correction

Correcting the board-layout mistake is necessary, but it is not enough.

The actual target remains broader:

1. consistent territory geometry;
2. deterministic constraints;
3. correct conquest transitions;
4. multiple transition modes that share the same truth;
5. high frame performance during idle, conquest, repeated conquest, pause/resume, high speed, and settings changes;
6. real browser validation, not only tests.

## 3. Canonical Docs Updated

This plan is now aligned with these docs:

- `.agent/rules/invariant-phase-change-protocol.md`
- `AGENTS.md`
- `.agent/AGENT.md`
- `.agent/docs/game/design/GAME_SPECIFICATION.md`
- `.agent/docs/game/design/MECHANICS.md`
- `.agent/docs/game/design/TERMINOLOGY.md`
- `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
- `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`

## 4. Thinking Rule Added

Before adding detection, cache invalidation, fallback logic, tests, diagnostics,
or recovery paths around a changing value, agents must ask:

1. Did the value actually change in the runtime phase being studied?
2. If it stayed the same repeatedly, is that sameness evidence of an invariant?
3. Which product spec says the value is allowed to change?
4. Which code path is the source of truth for changing it?
5. If it changes anyway, is that a supported feature or a bug?

This rule exists because repeated identical board-layout values were ignored,
then an impossible change was treated as a normal runtime concern.

## 5. Architecture Target

The runtime should be understood as:

```text
fixed board layout + mutable ownership/settings
    -> territory geometry
    -> transition frame
    -> presentation
```

The renderer must not own truth. It draws the latest valid frame.

Geometry owns:

- region loops;
- frontier lines;
- deterministic lane constraints;
- ownership-derived topology;
- exact point arrays consumed by transition and presentation.

Transition owns:

- previous geometry;
- next geometry;
- conquest identity;
- progress over time;
- frame-by-frame interpolation or snap behavior.

Presentation owns:

- draw calls;
- colors;
- alpha;
- line width;
- effects;
- Pixi object reuse.

## 6. Workstreams

### 6.1 Geometry Consistency

Goal: all territory modes that claim to represent the same territory truth should
agree on ownership boundaries and lane constraints.

Tasks:

1. Identify the current canonical vector geometry path for PVV4/vector mode and
   its relationship to the 0319 generator.
2. Verify fill and border use the same source points wherever a mode claims
   vector consistency.
3. Define exact invariants for lane ownership:
   - same-owner lane stays inside that owner's holding;
   - contested lane has exactly two owners meeting along the lane;
   - no third owner touches or crosses the lane corridor.
4. Build visual fixtures for common cases:
   - two-player straight contested lane;
   - three-player near-lane interference;
   - same-owner disconnected components;
   - enclosed pocket/hole;
   - repeated conquest on the same star.
5. Compare screenshots and geometry artifacts, not just unit test return values.

Exit gate:

- every fixture has a stored expected visual or artifact;
- failures are plain English: which lane/star/owner is wrong and what the player sees.

### 6.2 Deterministic Constraints

Goal: repeated runs with the same board, owners, and settings produce identical
geometry.

Tasks:

1. Separate immutable board identity from mutable ownership identity.
2. Make all geometry-affecting settings explicit in version strings or artifacts.
3. Remove hidden renderer-side geometry changes: smoothing, resampling, ad hoc
   curve fitting, or owner guessing in presentation code.
4. Use invariant checks for impossible states rather than recovery logic that
   silently accepts them.

Exit gate:

- same input produces same geometry artifact;
- ownership-only change changes only ownership-derived geometry;
- style-only change does not rebuild geometry.

### 6.3 Transition Correctness

Goal: conquest transitions are reliable, correct, and do not corrupt newer
events.

Tasks:

1. Key active conquest transitions by exact conquest identity:
   - tick;
   - conquered star;
   - previous owner;
   - new owner.
2. Prevent old transitions from retiring newer recaptures of the same star.
3. Ensure transition modes consume the same previous and next geometry truth.
4. Verify pause/resume, high speed, repeated conquest, and queued conquest events.
5. Record visual transition snapshots for before, mid, after, and terminal frame.

Exit gate:

- recapture of the same star works without stale transition overwrite;
- terminal frame exactly matches the settled geometry;
- transition cancellation/restart rules are explicit and visible in diagnostics.

### 6.4 Multiple Transition Modes

Goal: modes differ in animation style, not in game truth.

Required mode model:

```text
same fixed board
same previous ownership
same next ownership
same conquest event
same previous geometry
same next geometry
different transition sampler
```

Candidate modes:

- Snap: no interpolation.
- Crossfade: visual fade between old and new frames.
- Active frontier: animate only the changed local front when valid.
- Whole-region morph: broader transition, useful fallback.
- Field/raster-assisted transition: experimental detector or visual layer, not a replacement for game truth.

Exit gate:

- each mode declares whether it is production, fallback, or experimental;
- each mode has the same conquest identity handling;
- each mode has at least one visual fixture.

### 6.5 Performance

Goal: smooth gameplay and smooth transitions in the real app.

The performance target is not merely "remove fixed-board scans." That is one
correction. The broader target is reducing real frame cost while preserving
visual correctness.

Targets:

- no per-frame recomputation of fixed board layout;
- no geometry rebuild on pure style changes;
- no static geometry redraw when only alpha/progress changes;
- no unnecessary Pixi `Graphics` mutation during steady frames;
- no avoidable main-thread long frames during conquest;
- no hidden visual cadence skipping as the default smoothness strategy.

Measurement:

- use foreground browser runs;
- keep GPU enabled unless a test explicitly says otherwise;
- record `requestAnimationFrame` cadence;
- record Long Animation Frames when available;
- record Pixi object counts and redraw counts;
- record geometry rebuild count, transition start/end, and cache hit/miss in plain terms.

Exit gate:

- idle, conquest, repeated conquest, pause/resume, high speed, and settings-menu
  interaction each have before/after numbers;
- performance claims cite the app mode, map, browser, hardware context, and test duration.

## 7. External Research Plan

Local code inspection is audit, not research. Research means outside sources or
independent expert input.

Initial research anchors identified:

1. Browser animation measurement:
   - MDN `requestAnimationFrame`: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
   - Chrome DevTools Performance panel: https://developer.chrome.com/docs/devtools/performance/reference
   - Chrome runtime performance analysis: https://developer.chrome.com/docs/devtools/performance
   - Long Animation Frames API: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing
   - Chrome Long Animation Frames guide: https://developer.chrome.com/docs/web-platform/long-animation-frames
2. PixiJS rendering cost:
   - PixiJS performance tips: https://pixijs.com/8.x/guides/concepts/performance-tips
   - PixiJS v8 Graphics docs: https://pixijs.com/8.x/guides/components/scene-objects/graphics
   - PixiJS v8 GraphicsContext announcement: https://pixijs.com/blog/pixi-v8-launches
3. Robust geometry:
   - Shewchuk robust predicates: https://www.cs.cmu.edu/~quake/robust.html
   - Robust predicates paper: https://people.eecs.berkeley.edu/~jrs/papers/robust-predicates.pdf
   - CGAL exact predicates kernel docs: https://doc.cgal.org/latest/Kernel_23/index.html
   - Delaunator: https://github.com/mapbox/delaunator
   - d3-delaunay / Voronoi: https://d3js.org/d3-delaunay
4. Off-main-thread work:
   - MDN Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
   - MDN transferable objects: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
   - MDN OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
5. Invariants and model-based validation:
   - Eiffel Design by Contract: https://www.eiffel.com/values/design-by-contract/
   - Microsoft Code Contracts overview: https://learn.microsoft.com/en-us/dotnet/framework/debug-trace-profile/code-contracts
   - fast-check property-based testing: https://fast-check.dev/docs/introduction/what-is-property-based-testing/
   - fast-check model-based testing: https://fast-check.dev/docs/advanced/model-based-testing/

Research questions to answer before or during action mode:

1. What browser instrumentation best identifies the true source of conquest-frame
   stutter: JS, style/layout/paint, GPU upload, or Pixi object mutation?
2. In PixiJS 8, when should territory shapes be `Graphics`, shared
   `GraphicsContext`, cached textures, meshes, or sprites?
3. Which robust geometric predicates are worth using in TypeScript for boundary
   classification, and where would they actually reduce visible errors?
4. Which parts of geometry planning belong in a worker, and what data transfer
   format avoids spending the saved time on copies?
5. Which transition families from computational geometry, contour morphing, or
   image/raster interpolation are viable for local frontier edits?
6. What invariant/property/model-based tests are useful proxies, and which would
   be misleading black boxes?

Required research artifact:

- a short markdown note per research loop;
- source links;
- direct relevance to one current Pax Fluxia problem;
- a decision: adopt, reject, or experiment.

## 8. Adaptive Loops And Limits

Each loop must compress learning into action. No busywork.

### Geometry Failure Loop

Trigger: fixture shows wrong territory ownership, gap, overlap, third-party lane
intrusion, or unstable frontier.

Loop limit: 3 implementation attempts before escalation.

Steps:

1. capture artifact and screenshot;
2. identify exact owner/lane/star failure;
3. inspect canonical geometry source;
4. attempt smallest fix;
5. rerun fixture;
6. if still failing after 2 attempts, search old project docs/git history and web;
7. if still failing after 3 attempts, run adversarial review before more code.

### Transition Failure Loop

Trigger: snap, stale previous frame, wrong recapture, terminal mismatch, fill/border divergence, or pause/resume error.

Loop limit: 3 attempts before redesign checkpoint.

Steps:

1. record conquest identity;
2. record previous and next ownership;
3. record previous and next geometry version;
4. inspect active transition lifecycle;
5. fix identity/orchestration first, sampler second;
6. validate with repeated conquest and high-speed cases;
7. escalate to expert/research review if still failing.

### Performance Failure Loop

Trigger: visible stutter, frame spacing over target, Long Animation Frame, or
unexplained conquest delay.

Loop limit: 4 measurement/fix cycles per mode before regrouping.

Steps:

1. run real browser benchmark;
2. capture DevTools/trace or in-app timing artifact;
3. identify the biggest frame cost in plain English;
4. make one change aimed at that cost;
5. rerun the same scenario;
6. keep only changes that improve the target without visual regression.

## 9. Adversarial Roles For Action Mode

Use separate roles when the implementation becomes broad:

1. Spec Guardian: checks current work against game specs and invariants.
2. Geometry Engineer: owns canonical geometry correctness.
3. Transition Engineer: owns conquest identity, previous/next frames, and samplers.
4. Performance Engineer: owns traces, frame timing, and Pixi/browser costs.
5. Red Team: tries to disprove claims and find misleading tests.
6. Integration Lead: stages, reviews, commits, and prevents unrelated churn.

The Red Team should explicitly ask:

- What are we assuming changed?
- Did it actually change?
- Is it allowed to change?
- Is this test proving the app behavior or only proving our helper code?
- Does the user-visible app show the claimed improvement?

## 10. Execution Phases

### Phase A - Reset And Guardrails

1. Revert or deliberately review any uncommitted code from the prior mistaken pass.
2. Confirm branch and worktree.
3. Confirm active docs and specs.
4. Add invariant probes only where they report impossible state, not as normal cache logic.

### Phase B - Geometry Truth

1. Establish the current canonical vector target.
2. Build fixture artifacts.
3. Prove fill/border same-point behavior.
4. Prove lane constraints.
5. Remove or quarantine paths that invent geometry in presentation.

### Phase C - Transition Orchestration

1. Normalize transition identity.
2. Stabilize previous/next geometry capture.
3. Validate repeated conquest and terminal frame.
4. Add multiple transition modes behind the same truth contract.

### Phase D - Performance

1. Build real browser trace scenarios.
2. Remove per-frame work that should be setup/load work.
3. Reduce Pixi mutation and redraw cost.
4. Move expensive planning off-main-thread only when transfer cost is proven lower.
5. Validate visual smoothness and numbers together.

### Phase E - Integration

1. Run focused tests.
2. Run browser visual checks.
3. Compare before/after artifacts.
4. Commit in small, named commits.
5. Push branch.
6. Write a plain-English progress report with failures included.

## 11. Questions For User Before Action Mode

1. Which modes are must-fix first: PVV4/vector, Grid Gradient, Phase Edges, Ember, Perimeter Field, or another set?
2. Which map size/player count should be the standard benchmark scenario?
3. Should the first action-mode pass revert the current uncommitted code edits from the mistaken board-layout work before starting clean?
4. Are experimental transition modes allowed in a separate branch path, or should action mode focus only on production-safe modes?
