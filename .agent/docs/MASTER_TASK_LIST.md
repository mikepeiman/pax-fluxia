---
date created: 2026-07-01
last updated: 2026-07-01
last updated by: AI
relevant prior docs:
  - .agent/AGENT.md (RULE 0.5 governs this file)
superseding docs:
---

# ⭐ MASTER TASK LIST

> **This is the ONE master task list for the project (AGENT.md RULE 0.5).**
> **Purpose: prevent forgetting and loss of tasks.** Log every task, fix, idea, and instruction here
> **the moment it becomes known — BEFORE it is implemented.** Capture first; implement later. A task
> you might not touch for weeks still gets logged the instant it surfaces (even mid-other-work). This
> is a forward-looking backlog, NOT a retrospective changelog. Don't scatter task lists across ad-hoc
> docs; daily session queues (`.agent/docs/sessions/YYYY-MM-DD/`) may hold same-day detail, but the
> durable cross-day task-of-record lives here.

**Workflow**
1. **Capture immediately.** When a task/fix/idea/instruction appears — a user request, a bug you
   notice, a follow-up you realize, a "we should later…" — add it FIRST, before starting work, under
   today's `## YYYY-MM-DD` → `### Open` as `- [ ]` with a one-line title, an area tag `[area]`, and
   any link. Do this even in the middle of another task; capturing beats remembering.
2. **Then** work it. On completion, flip to `- [x]` and add the commit hash — secondary bookkeeping;
   never delete history. The capture is the point, not the checkmark.
3. Newest date on top. Missing today's heading? Create it.

---

## 2026-07-10

### Open
- [ ] **End-of-transition BORDER SNAP — RETRACTION + real diagnosis (2026-07-10, fix designed, not built)**
  `[territory][transitions]` — RETRACTION: the earlier "fill draw-method / alpha seams, borders 0.00px"
  entry was a MISDIAGNOSIS (it measured only frames AFTER the snap — settled vs settled). REPRODUCED on
  the user's exact case (arena-further, star-13/ai-5 captures star-7/human): border deviation from the
  post-rollover settled map goes 4.9px (t=700) → 7.2 → 8.1 → 8.9 → 9.3px (t=825), then 0.00px at t=828
  — a 9.3px SINGLE-FRAME SNAP. Timing is mathematically exact: rampProgress = smoothstep(p)/0.92 hits
  q=1 at smoothstep(p)=0.92 ⇒ p≈0.828 — the split's last frame. CAUSE: near completion the shrinking
  old-owner remnant's same-owner edges DROP from the border graph and the front's crossings pin the
  neighbouring chain fragments → those fragments smooth ≈ raw (short, pinned) while the settled map
  smooths the SAME edges as one long chain that ROUNDS the corner — the gap equals the corner-rounding
  depth (9.3px here; sharp corner ⇒ angular "point", shallow ⇒ round bulge — matches both user-observed
  variants). Same mechanism at conquest START (entry chain fragmented at q≈0) and for the user's
  THIRD-PARTY variant (pair flip old→new breaks a continuing chain at a vertex). FIX (designed, one-graph
  safe): TOPOLOGY-STABLE SMOOTHING — chain coalescing treats a split cell's parts as ONE cell (bridge the
  dropped same-owner seam pieces as smoothing-only geometry; crossings become interior chain points, not
  pins); real owner pairs still decide existence/colour/stroke grouping. Curves then equal settled
  smoothing asymptotically ⇒ q=1 removal is a no-op ⇒ no snap at either endpoint, third-party flips
  covered by the same rule. Locus: smoothSharedEdges chain-grouping input (+ index phantom curves for
  fill rings); trigger = existing duplicate-siteId split detection. Side-effect analysis: idle builds
  have no split cells ⇒ byte-identical (no settled regression); mid-sweep borders near crossings get
  slightly rounder (likely improvement, needs eyes); front-line tips may sit ≤ rounding-depth off the
  rounded border near corners at extreme q (contained follow-up: project tips onto the smoothed curve);
  Chaikin vertex-insertion residual sub-pixel (gate: rebuild the arena harness, assert max frame jump
  <1.5px and monotone convergence). Perf negligible. REJECTED alternative: temporal blend toward S0/S1
  smoothed references (needs geometric correspondence + affected-chain selection — the case-enumeration
  family that failed). AWAITING user go.
- [ ] **Islands must COLLAPSE to the star centre (not radial)** `[territory][transitions]` — when a
  captured cell is an island (fully enclosed, no shared border with the attacker/defender frontier to
  push), the radial/linear front is wrong; the region should shrink to its star centre as it's taken.
  In-geometry: a new splitCellByFront 'collapse' mode (scale the cell ring toward the site by 1−q) OR
  a fill-only shrink. Detect island = captured cell has no inter-owner shared edge with a non-new
  owner in S0. Fits the one-graph pipeline (still emits cells).
- [ ] **Multi-attacker → multi-vector sweep (feasibility: YES, in-geometry)** `[territory][transitions]`
  — event.attackerStarIds already carries ALL attackers. Feasible as a field-front variant: the split
  threshold field T(x) = MIN over attackers of per-attacker arrival time (radial from each attacker
  origin) — the captured region falls to whichever attacker's wave reaches each point first, giving a
  multi-lobe front from one split. Flows through the existing splitCellByFront/one-graph path (just a
  new field evaluator; the disk∩polygon walk generalizes to a union-of-disks boundary). NOT a
  presentation overlay. Design + prototype needed.
- [ ] **Sweep option: WAVE front + UI tuning (vertices, stagger distance, stagger timing, stagger
  coherence)** `[territory][transitions][ui]` — new Front Shape option 'wave': the front line gains N
  vertices each given a staggered local progress so the border ripples across (water feel). Controls:
  vertex count, stagger distance (amplitude), stagger timing (phase spread), stagger coherence (how
  correlated adjacent vertices' offsets are). Build as a splitCellByFront field variant in the
  geometry (per-vertex phase-offset arrival field), add the Front Shape chip + 4 sliders to the
  Territory settings (TERRITORY_CONQUEST_FRONT_MODE already the mode key). One-graph safe.
- [ ] **GG (Grid Gradient) + Phase Edges: apply the PowerCore geometry + one-graph transition engine**
  `[territory][render][perf]` — investigate whether GG and Phase Edges can consume the same PowerCore
  cells + kinetic frames for correctness (GG has glitches) and performance. Determine feasibility
  first (their current geometry sources + transition paths), then plan. Do NOT port blindly.

- [ ] **User visual verification: restored one-graph conquest transitions** `[territory][transitions]`
  — after eb5d28e53 the transition mechanism is EXACTLY 2eecc5564 (the state the user ranked best).
  Expected look: coherent map every frame, radial front from the attack-lane origin (origin fix
  kept), borders/fills one source. KNOWN accepted blemish returning: the localized border reshape
  at conquest start/completion (the "snap" that motivated the failed pivot). If it still offends
  after living with it, fix it INSIDE the one-graph architecture (temporal smoothing-output easing
  near q=0/1 — post-processing of smoothed geometry, never a presentation reconstruction).
- [ ] **"Push the border like a wave" ideal — future, in-geometry only** `[territory][transitions]`
  — the user's wave ideal stands, but any implementation must be a SPLIT SHAPE in the geometry
  domain (a new splitCellByFront mode whose cut line morphs entry→exit), flowing through the one
  graph like linear/radial. NEVER as presentation classification/overlays (that family is proven
  structurally unable to guarantee border coherence — see Done entry below).

### Done
- [x] **Standings HUD: active player highlight + enemy-star secondary highlight (user)** `[ui][hud]` —
  active/local player row already had the primary --local warm highlight; added a SECONDARY highlight
  (.pf-standings__row--selected, glows in the clicked player's own colour) driven by
  selectedEnemyStandingId in GameContainer (the owner of a clicked enemy star; null for empty
  space / neutral / own star, so it clears exactly as specified). PlayerStandingsPanel gained a
  highlightedPlayerId prop. Typecheck clean.
- [x] **EMERGENCY: push front shattered live-map borders → architecture verdict + full revert to
  one-graph (user directive)** `[territory][transitions]` — eb5d28e53. Verdict: split-after-smoothing
  (a2ff7ed5e and all six repair commits on it, incl. live-label classification, one-domain
  substitution, and the push front) is REMOVED. Reasoning: pre-split derives the border network by
  one graph walk over actual cell adjacency — fragmentation impossible by construction; post-split
  re-derives it by hand-enumerated classification — coherence limited by anticipated cases. Proof:
  final diagnostic showed push fully coherent on the fixture (0 dangling border tips, exact PRE
  match) while shattering on the live map. Restored VERBATIM from 2eecc5564: sampleKineticFrame
  (split cells in geometry), buildSurfaceFromCells (plain), PowerVectorFamily (plain),
  kineticTypes, conquestFrontField (linear/radial), proof suite. Deleted pushedBorderFront.ts.
  Front mode back to 'linear'|'radial', default radial; panel migration v2 maps force-written
  'push'→'radial'. KEPT (orthogonal): attack-lane origins, restart reset, perf commit path,
  multi-morph+early-completion (predate 2eecc5564), surge/tick/settings. TERMINOLOGY RULING (user):
  "rim" is BANISHED — naming the cell outline as an object licensed computing one border as
  independent pieces, which is the root disease. 431/431, typecheck clean.

## 2026-07-09

### Open
- [ ] **User visual verification of the live-label classification rebuild + front-chord/attack-vector fixes**
  `[territory][transitions]` — casebook vs 2eecc5564/a2ff7ed5e memory: conquest start (border occupies
  the whole front immediately, no point-growth), completion (no snap/pop), third-party borders, island
  capture, multi-conquest tick, RADIAL mode. NEW to verify: (a) the stroked front border now traces the
  fill colour boundary exactly (front-chord no longer chained); (b) the sweep now originates from the
  actual attack lane (attacker star), so it visibly enters along the connection it was launched from.
  If the "cells reshape at conquest start" defect (the reason bb2ad073c's smoothing-continuity blend
  existed) reappears, re-enable that blend (kept in reserve, `buildSurfaceFromCells`'s 3rd `blend`
  param — currently unpassed by PowerVectorFamily).
- [ ] **Adjacent-double-conquest rim edge (known limitation)** `[territory][transitions]` — two captured
  cells sharing a rim edge: first front processed claims the shared edge, second skips it
  (`classifyActiveFronts`, first-processed-wins). Rare; a joint two-field split of the shared edge is
  the proper fix if it ever shows visually.
- [ ] **Verify restart-reset fix in-game (user visual check)** `[territory][lifecycle]` — after
  5c17e8210: restart mid-game → map must redraw immediately (no old conquest shapes lingering),
  and re-executing a conquest from the previous match must animate normally. If any symptom
  remains, the next suspects are the presentation-signature dedup while paused and the family
  idle-cache keying (both traced, neither proven guilty).
- [ ] **Territory transition + animation tick-bindings still panel-side** `[settings][arch]` —
  TERRITORY_TRANSITION_MS and ANIMATION_SPEED_MS bindings still work by the settings panel
  overwriting the config value (same clobber family the surge fix removed in 2a389a7e1).
  TERRITORY_TRANSITION even has BOTH implementations (panel write + live
  resolveTerritoryTransitionDurationMs cap). Consolidate on consumer-side resolution.

### Done
- [x] **Restart does not fully reset map / re-executed conquests snap (user)** `[territory][lifecycle]`
  — 5c17e8210: session-change block now resets the kinetic runtime bridge, territoryTransitions
  (old-clock zombie entries could never expire after the FX-clock reset and poisoned the
  active-transition pick), the resolved-geometry cache, and the render families.
- [x] **Attack surge bound to tick duration by default (user)** `[fx][settings]` — 2a389a7e1:
  binding resolved live in ShipRenderer (resolveSurgePulseDurationMs) from the effective tick;
  all three panel-side SURGE_PULSE_DURATION_MS clobbers removed (settings-are-data).
- [x] **Tick Duration slider in the Game Speed HUD widget (user)** `[hud][settings]` — 8f343c5de:
  slider in GameSpeedPanel via panelSync.applyTickIntervalChange (one data-layer tick-change
  entry point); surfaces sync via TICK_INTERVAL_CHANGED_EVENT.
- [x] **Settings panel forgets the open section between panel changes (user)** `[ui][settings]` —
  8f343c5de: per-category last-selected-section memory in localStorage; selectCategory restores
  it instead of snapping to the first chip.
- [x] **Transition rebuild: pre-split border semantics on the post-split backend** `[territory][transitions]`
  — user-approved proposal implemented. `buildSurfaceFromCells` gained live-label border
  CLASSIFICATION: for each in-flight conquest, the captured cell's rim is reclassified from THIS
  FRAME's true ownership (not the settled/POST owner the cells carry) before frontiers/fills are
  assembled — a PRE-graph (captured cell temporarily reverted to its old owner) recovers the
  attacker-adjacent edge that's same-owner-internal in the POST graph, so the old attacker↔defender
  border falls out automatically instead of via a separate "dissolving" concept. The interior front
  chord is a first-class frontier entry (pair old↔new), so the same border-blend rule applies to it
  as every other border. `PowerVectorFamily` returned to the pre-split shape: draw
  `surface.cellFills` + `surface.frontiers` + `surface.worldBorders`, zero conquest-specific
  presentation logic. Discarded: rim-suppression clip, front-only stroke pass,
  `dissolvingFrontiers`/`cutPolylinesNearRings`/rim-proximity matching. Smoothing-continuity blend
  kept in reserve (param still exists, unused by default). New acceptance gates: PRE (border at
  q≈0 matches the pre-conquest surface at the captured rim) and POST (classified frontier converges
  on the settled surface as q→1) — smoothMorphFrame.proof.test.ts, 23/23 green; full territory+fx
  suite 423/423 green. Awaiting user visual sign-off (see Open entry above).
- [x] **PUSH front: the border ITSELF travels (user design ruling — the real model)** `[territory][transitions]`
  — user after c9f26574c: "You still failed… It MUST be a design issue… you MUST be applying the
  wrong mental model." Semantics fixed by user: (1) front = the part of the boundary that MOVES,
  period; (2) endpoints slide along bounding borders as moving junctions, colour blend travels with
  the line; (3) boundary = the LINE wherever two owners touch, whatever compound shape. The protected
  old concept (admitted): the field/iso-contour model — captured area GROWS from the attack point
  while the old border sits still and gets eaten. The push model replaces it as DEFAULT: new
  pushedBorderFront.ts builds the front as the ENTRY border (pre-conquest attacker↔defender chain)
  morphing into the EXIT border (post-conquest far chain), endpoints A/B sliding along the side rim
  by q; behind piece = new owner, ahead = old; F(0)==entry exactly, F(1)==exit exactly (no start/end
  discontinuity by construction); no exit → wave collapses to the far pole and vanishes into the
  bounding borders. Entry edges stroke NOTHING once the wave moves off them (the border has MOVED,
  not been eaten). classifyActiveFronts dispatches push (default) vs field (linear/radial variants +
  fallback when the attacker isn't rim-adjacent, e.g. corridor captures). Config:
  TERRITORY_CONQUEST_FRONT_MODE now 'push'|'linear'|'radial', default 'push' (territory.config),
  one-time panel migration flips saved linear/radial → push (conquestFrontPolicyVersion=1);
  Front Shape selectors gained Push. Vertex-correspondence lerp is SAFE here (single convex cell,
  endpoints pinned to rim) — the historical "never reliable" lesson was about whole-map morphs.
  441/441 (incl. new push gates: q≈0 front==entry border, q≈0.98 front lands on exit border,
  mid-sweep fill==border <1e-6, pieces tile cell), typecheck clean. Fixed latent settingsDefs
  gate miss: TERRITORY_CONQUEST_FRONT_MODE was optional-only (`?:` dodged the declared-keys regex,
  no default entry) — now required + defaulted. Awaiting user visual sign-off.
- [x] **Conquest is a MAP STATE, not an overlay — one geometry domain for the captured cell (user)**
  `[territory][transitions]` — user re-report after 1d29f7a3b: border-fronts still not matching
  fill-fronts; ruling: "a conquest is not a thing, it is an event… it should push the border along
  like a wave and smear it into the bounding borders." REAL root cause (proven by falsification):
  the captured cell's pieces were drawn from MIXED geometry domains — the entry border
  (attacker↔captured, absent from the POST graph as same-owner-internal) was STROKED from the
  PRE-graph SMOOTHED chain while the FILL ring fell back to the RAW polygon edge there → colour
  seam and border diverge by px wherever the entry border is a multi-edge chain with a real corner
  (chain-aware Chaikin rounds it; single-edge/collinear chains smooth to themselves, which is why
  runtime fixtures never caught it). Fix: PRE graph hoisted into buildSurfaceFromCells; its
  PRE-ONLY edges' smoothedPts folded into the SAME ring lookup the cell fills use → fill seam, rim
  border, front field, and front chord all read ONE smoothed curve; an intermediate frame is one
  coherent map whose old border is pushed across the cell as a single wave. Gates: (a) every colour
  seam touching a captured piece is stroked verbatim (subsequence match); (b) GLOBAL COINCIDENCE —
  every frontier point lies on a fill boundary (<1e-6); (c) hand-built multi-edge-corner fixture
  where the fix-disabled code measurably FAILS at 1.23px (falsification verified both ways).
  25/25 proof suite, 425/425 territory+fx, typecheck clean. LESSON (also admitted to user): the
  same thinking error corrupted both the renderer (conquest as overlay object) and my screenshot
  reading (looking for a special "conquest artifact" in stills — a correct mid-conquest frame is
  indistinguishable from a settled map).
- [x] **Front border didn't match fill front + originate the sweep from the attack lane (user)**
  `[territory][transitions]` — user report: fill front correct, stroked BORDER front a different shape
  and not covering the full front. Rigorous cause (border and fill of the captured cell come from ONE
  splitCellByFrontDetailed; the ONLY thing that reshapes the border but not the fill was routing the
  front chord through chainEdgesIntoPolylines, which can merge/reorder it against a same-owner-pair rim
  border when their crossing endpoints coincide). Fix: `classifyActiveFronts` now returns the front
  chords PRE-FORMED and `buildSurfaceFromCells` appends them to `frontiers` AFTER chaining — so the
  stroked front is byte-identical to the fill split arc. New regression gate: BORDER==FILL (every
  frontChain appears verbatim in surface.frontiers). Also: `buildConquestOrigins` now uses the ACTUAL
  attacker star (`event.attackerStarIds[0]`, the lane source) as the front origin instead of the
  nearest-same-new-owner-star proxy — the sweep radiates from the real attack vector (linear direction
  = true lane direction), better feel + debug/tuning. 424/424 green, typecheck clean. Awaiting user
  visual sign-off.

## 2026-07-08

### Open
- [ ] **Territory architecture cleanup + refactor (user-directed, "soon")** `[territory][arch]` —
  execute on the 2026-07-08 audit findings: consolidate the 6 Chaikin + 6 shoelace + assorted geo
  duplicates into one geometry kernel; fix upward imports (geometry→families
  buildPowerVoronoiFrontierTopology, geometry→renderers DISCONNECT_OWNER_ID); quarantine/retire
  legacy-mode-only renderers + adapters + abandoned experiments (orchestrator DY4OT, layers/);
  thin GameCanvas's family-lifecycle orchestration into a coordinator. Verify audit claims
  before acting (audit ran on an unverified model).
- [ ] **Settings Search: click-through STILL broken + highlight NEVER seen (user, 3rd report)**
  `[ui][settings]` — clicking a result does not reliably reveal it; panels open with a sub-panel
  selected when they should not; the result highlight/flash was specified and DECLARED DELIVERED
  repeatedly but the user has NEVER seen it once. Treat as un-delivered: trace the real mount/reveal
  path end-to-end (no-UI-hallucination rule), fix subsection selection, and prove the highlight
  fires with a test + exact repro steps for the user.
- [x] **Conquest border vanishing at start (user defect, CLOSED d5048b6c7)** `[territory][transitions]`
  — user ruling: the ripple-from-a-point capture is FINE; the defect was the existing attacker↔
  defender border VANISHING at conquest start and being redrawn outward from the ripple point.
  Fixed: dissolvingFrontiers (PRE-graph-only rim borders) drawn clipped AHEAD of the front, matched
  by rim proximity — one complete conquest border every frame. Gated in RADIAL mode (the earlier
  "falsification" of this approach ran in linear mode — invalid; LESSON: gate in the mode the
  feature serves). SHELVED: the "capsule field" front-shape idea (whole shared border advancing as
  one wave — a possible future front-shape VARIANT, not a fix; user confirmed unneeded).
- [x] **split-after-smoothing (the snap fix)** `[territory][transitions]` — DONE (see below) — the conquest
  split is the ONE element spliced into and removed from the PRE|POST interpolation (proven:
  33.75px single-frame chain reorganization at front completion, 0.00px after). Move the split out
  of the geometry/graph domain: graph+smoothing run on UNSPLIT cells (settled chain topology all
  morph long); the front becomes a presentation overlay clipping the captured cell's SMOOTHED fill;
  ahead piece = old colour + outline stroke; acceptance gate = frontier jump across the completion
  crossing ≈ 0px.
- [x] **Default to power_core geometry; retire the 0319 SELECTION (user directive)** `[territory][geometry]`
  — DONE b9f2f7d8c: normalize→power_core always (auto-migrates persisted configs), defaults flipped,
  phase_edges 0319 pin removed, Geometry Source selector removed from UI, parity suite repurposed to
  the ground-truth oracle. 0319 Stage-0 retained (shared inside PowerCore) + compile-error fallback.
- [ ] **Stress-test low-tier hardware + perf config flags** `[territory][perf]` — default-mode perf
  reads flawless on the RTX 4080 box; verify on weak GPUs/laptops and add flags (e.g., arc density,
  smoothing passes at morph time, pool limits, transition duration) so low-end users can trade
  fidelity for smoothness.
- [x] **End-snap: remaining occasional pop — discriminated with data, TWO culprits fixed**
  `[territory][transitions]` — DONE feac1633d: per-cell divergence analysis named (a) the old-owner
  residual strip lingering under smoothstep deceleration (717px² at p≈0.97) → conquest front now
  completes at 92% of the timeline (strip animates to nothing; tail = settled shape, byte-identical);
  (c) multi-conquest ticks falling back to the STITCH → sampleFullDiagramMulti renders any number of
  disjoint morphs in ONE diagram (identity-keyed frozen intersection). Candidates (b) vanish-ramp
  residue and (d) AA hairlines showed no divergence in data — watch for them if a pop remains.
- [ ] **⭐ PRIORITY (user directive 2026-07-07): DEFAULT-MODE perfection first** `[territory][transitions]`
  — perfection + reliability + performance of the DEFAULT path (power_vector + linear front) before ANY
  new modifications/features. Radial polish, field-front modes 3+, multi-morph one-diagram, and all
  non-default work QUEUE behind this. User observation: lag is not random — it correlates with CONQUEST
  EVENTS (the commit-frame spike: geometry rebuild + bubble diff + first-morph-frame full tessellation
  all land on one frame).
- [ ] **Conquest-event frame spike** `[territory][transitions][perf]` — profile+shave the commit frame:
  (a) commit re-sample runs a FULL diagram (sampleFull) when the cheap p=0 stitch is exact and free;
  (b) first morph frame tessellates ALL fills (no prev hashes), second frame re-tessellates the static
  layer — two heavy frames at conquest start; (c) buildPowerCoreAuthoritySnapshot assembly runs at
  commit though its output is only drawn at settle. Measure each headlessly, fix in cost order.
- [ ] **Incremental morph BORDERS** `[territory][transitions][perf]` — borders still full-redraw every
  morph frame (~40 chained polylines stroked); hash polylines static/dynamic like the fills (415c15dfb).
- [ ] **End-settle PRE|POST sync (default/linear)** `[territory][transitions]` — user reports a
  disjoint/snap from the last morph frame to the settled tick ("umbilical" pull on islands; likely
  largely the radial lens garbage fixed in 949996b3d, but VERIFY in default linear mode): add a
  convergence test (final morph frame vs settled snapshot, per-owner) + fix any real deviation.
- [ ] **QUEUED behind default-mode perfection** `[territory][transitions]` — radial arc-density tunable
  (front.subdiv now unused), multi-morph one-diagram path (concurrent disjoint conquests still use the
  frozen/bubble stitch), settle-pop seam (morph per-cell-smoothed fill vs idle merged-region fill),
  static-surface cache if re-profile still shows JS cost.

### Done
- [x] **Exact disk∩polygon radial split (world-edge lens glitch)** `[territory][transitions]` —
  949996b3d; lens coverage error 88.6%→0.00%, exact endpoints, orientation-determined arcs.
- [x] **Radial arc blotch + end jank (giant-arc direction flip)** — 611cdb82e (superseded by 949996b3d).
- [x] **Incremental morph fills (O(swept) tessellation)** — 415c15dfb; ~4 of ~200 fills/frame.
- [x] **Radial starburst + earcut O(n²) blowup** — 30e60af6d (clean 2-polygon split; unbatched fills).
- [x] **Erase obsolete starMargin test expectation** — b13960b02; territory suite fully green.

## 2026-07-04

### Open
- [ ] **Field-front modes 3+ (multi-attacker, variable-speed, rounding)** `[territory][transitions]` —
  The arrival-time-field engine (conquestFrontField, ca8636aac) ships mode 1 (linear, default) + radial.
  Next field evaluators, each a small addition with NO caller change: min-over-attackers (multi-vector
  merge), scaled T (variable-speed fronts), smoothed T / smoothed iso-contour (the rounded "beach wave").
  Radial currently emits marched triangles — if perf/visual needs it, merge to 2 clean parts. Needs the
  user's visual sign-off per mode (set Conquest Front = Radial in the Conquest Transition panel to see it).
- [ ] **Grid Gradient transition retrigger (per-conquest clock)** `[territory][transitions][gridGradient]`
  — same cross-mode root as PowerCore (below) but via Grid Gradient's ONE global progress scalar +
  `beginVisualTransition` clock reset on plan re-key + binary `prevGeometry` freeze. NEEDS VISUAL
  VERIFICATION (GPU shader / worker plan) — NOT shipped. Full mechanism + ranked fix options (incl.
  exact file:line) in `.agent/docs/sessions/2026-07-04/2026-07-04_GRID_GRADIENT_RETRIGGER_FIX_PLAN.md`.
  Recommended: option 2 (per-event startedAtMs in the plan, per-cell clock in CPU+GLSL envelope) in a
  supervised pass with a screenshot diff across overlapping conquests.
- [ ] **Settings Search: promote live filter dim → hide (optional)** `[ui][settings]` — v1 DIMS
  non-matching controls (a19e2671e, layout-safe). User asked for VS-Code-style filtering; a full
  hide needs empty-group/empty-section handling + forcing the All view when the match is elsewhere +
  responsive checks — do it once the dim version is visually confirmed as the right direction.
- [ ] **Conquest transition is NOT the spec** `[territory][transitions]` — the clip-sweep is a
  straight-line "windshield-wiper" SHAPE overlay, kept as a DEV ALTERNATIVE / coverage-completion
  baseline per user (2026-07-04), explicitly NOT the water/ripple/rope vector-morph target
  (see memory transition-design-history). It also VIOLATES the PowerCore "transition = diagram
  INPUTS, never output shapes" invariant (kineticTypes header) — which is exactly why it breaks
  the retarget/materialize path. Next: (a) fix remaining edge cases below; (b) explore variance
  (multiple attack vectors — currently one straight slide only); (c) the real vector-morph spec.
- [ ] **Half-cell gap during sweep** `[territory][transitions]` — user saw a transition leave a
  half-cell gap (rare). Likely the same retarget dual-site corruption (now fixed `e20ad2d04`) OR a
  forward-sweep mismatch between the interpolated-weight cell and its FROZEN neighbor (frozen cells
  sit at S1 while the morphing cell uses interpolated weight). Watch for recurrence after the fix.
- [ ] **Over-frequent retarget — perf tail** `[territory][perf]` — RESTART fixed by per-conquest
  independent morphs (a297366c6): disjoint conquests no longer restart each other. Remaining: the
  commit still fires on ANY owned-star change (global fingerprint) and OVERLAPPING conquests still do
  a full materialize+rebuild (rare). Perf-only now; revisit if jank persists (needs profiling).
- [ ] **Map name in Multiplayer** `[ui]` — `activeMapName` is single-player only (gameStore init);
  null in MP so the HUD label hides. Wire a MP map name if MP games should show it (c0559b5b3).
- [ ] **Kinetic transition perf jank** `[territory][perf]` — user reports mostly-smooth with
  lag spikes on the complex map. Static/dynamic Graphics split landed (`bd0458eaf`); if spikes
  remain, next suspects: first-morph bubble build on the render frame (move to commit time),
  per-frame presentation-run overhead under the kinetic nonce, snapshot rebuild on capture.
- [ ] **Morph start/end smoothing seam** `[territory][render]` — Power Vector idle fills = smoothed
  regions; morph fills = raw cells. With VORONOI_BORDER_SMOOTH > 0 there is a small shape seam at
  morph start/end. Options: smooth kinetic cell polygons per frame (cost), or fade the seam.
- [ ] **Fill-shape rounding during morph** `[territory][render]` — rounding currently applies to
  idle fills + borders (snapshot); morphing bubble cells are raw polygons.

### Done (2026-07-04)
- [x] **#5 Arrival-time-field conquest engine** `[territory][transitions][ARCH]` — the conquest front is
  now a scalar field's iso-contour (conquestFrontField.splitCellByFront): 'linear' = exact mode-1 sweep
  (default, byte-for-byte), 'radial' = curved marched front from the attacker. Threaded end-to-end +
  Linear/Radial selector (TERRITORY_CONQUEST_FRONT_MODE) + tests. Foundation for the water-wave modes.
  `ca8636aac`.
- [x] **#1 GLOBAL settings search** `[ui][settings]` — a query now switches the whole panel to a flat
  cross-category/cross-tier results view (matches from any category surface in place, non-matches +
  empty groups hidden, no navigation, works with no category open). Removed the navigate-away dropdown.
  Fulfils the "fullest not easiest" rule. `67c70daef`.
- [x] **#3 Opponent-blended borders** `[territory][render][settings]` — TERRITORY_SURFACE_BORDER_BLEND
  toggle; inter-owner frontier stroked in the 50/50 blend of both owners' colors (blendColors); world
  edges keep single color. Full plumbing + search. `735ec7216`.
- [x] **#4 Chaikin/smoothing search-reveal** `[ui][settings]` — `power_vector` was in NO surface-card
  predicate, so Power Vector rendered no style card and the smoothing control was never mounted.
  Added power_vector to supportsSharedSurfaceStyleCard() (renders TerritorySurfaceStyleTuning; cell-grid
  controls stay gated) + a Geometry Smooth Passes (VORONOI_BORDER_SMOOTH) row. `c1c3de844`.
- [x] **#2 Enclosed enemy fill layering** `[territory][render]` — territoryRegions are flat outer-ring
  polygons (no holes), so a surrounding owner's fill painted over an enclosed enemy island (muddy alpha
  blend). Power Vector idle fill now graphics.cut()s any different-owner region fully enclosed within
  another → pure colors. `c799fa8cc`. (Morph path draws tiling cells; no overlap there.)
- [x] **Map name in the HUD** `[ui]` — reactive `gameStore.activeMapName` (set on map load) →
  activeGameStore facade → HudTopbar renders it as a muted label after the "Pax Fluxia" title with a
  divider (ellipsis + hover for long names). `c0559b5b3`.
- [x] **Settings Search live filter (dim v1)** `[ui][settings]` — non-matching keyed controls dim as
  you type so matches stand out; layout-safe (opacity, no display:none / view change). `a19e2671e`.
- [x] **SHARED transition retrigger — per-conquest independent clocks (PowerCore)** `[territory][transitions]`
  — the cross-mode root: conquests animated on ONE global clock that restarted on every ownership
  commit ("retriggered by the next tick's conquest"). `KineticTransitionRuntime` now holds MULTIPLE
  concurrent morphs, each on its own clock; disjoint conquests are independent (no restart), overlapping
  ones merge continuously. New test (kinetic_independent_conquests.json wide chain): first conquest
  settles on its ORIGINAL clock, not delayed by a later independent capture. `a297366c6`. Grid Gradient
  analog scoped separately (Open, needs visual verification).
- [x] **Settings Search select lands on the exact control (top + 1.5s highlight)** `[ui][settings]` —
  selection used fuzzy DOM text matching → mis-hit/missed rows → scrolled whole section to center,
  glow on wrong element. Fixed: exact `data-setting-config-key === result.configKey` first (fuzzy
  fallback); row-level `closest([data-setting-config-key], …)`; scrollIntoView `center`→`start`.
  Reliable for every Pax*Row-based control incl. TERRITORY_SURFACE_* SLA. `290155f91`.
- [x] **Retarget corruption: unrelated capture resurrected an already-conquered cell's old owner**
  `[territory][transitions]` — user: "completed correct, then NEXT tick half snapped back to old
  owner, 2-3 ticks LATER it disappeared; only fill, no borders." Root cause: the sweep splits one
  cell into two owner-parts (a render overlay); on retarget (any map ownership change while a sweep
  is live), materializeMidState emitted BOTH parts as two coincident different-owner sites → re-diff
  spurious old→new flip (435→115479px², a 265× resurrection); full-tick duration + clock restart →
  the 2-3-tick persistence; fill-only because borders draw from the settled snapshot. FIX: collapse
  split-conquest groups to the dominant-owner part in materializeMidState. Reproducing test added.
  `e20ad2d04`.
- [x] **Conquest sweep FULL-cell coverage (the "pops 1-2 ticks late" defect)** `[territory][transitions]`
  — root cause: equal-weight ghost-pair boundary = pair midpoint → swept only HALF the cell; far
  strip popped at settle. Fixed with a geometric clip-sweep (one diagram site + polygon split by a
  travelling line; exact 0→1 coverage, any cell size incl. world-bound). Locked by test. `bd0458eaf`.
  NOTE the diagnosis-failure on record: the previous attempt INVENTED a tick value (claimed ~600ms;
  the tick is 1450ms) to force a wrong duration theory — distorting the user's report. Never again:
  restate the user's numbers verbatim before diagnosing.
- [x] **Power Vector live surface controls** `[settings]` — Show fill/border, saturation/lightness/
  alpha, border width now WORK (were entirely dead); borders from smoothed snapshot polylines →
  VORONOI_BORDER_SMOOTH rounding is live; idle fills = merged smoothed regions. `bd0458eaf`.

## 2026-07-02

### Open
- [ ] **⭐ TRANSITIONS — kinetic bubble morph (P3, USER-DIRECTED FOCUS)** `[territory][transitions]` —
  governing spec: [TRANSITION_CORRECTNESS_SPEC_AND_KINETIC_PLAN](sessions/2026-07-02/2026-07-02_TRANSITION_CORRECTNESS_SPEC_AND_KINETIC_PLAN.md).
  Acceptance T1–T7 (endpoint exactness, frame validity, frozen-outside, identity+recapture
  retarget, tick-bound, determinism, ≤2ms/frame). Mechanism: diff S0/S1 by identity → freeze
  outside → kinetic mini-diagram of bubble sites with union weight ramps (ghost pair for the
  captured star; ε-ramps for appearing/vanishing virtuals) → presentation just draws geometry.
  Measured: full snapshot 41ms / diagram 17.6ms @1,929 sites → full-recompute per frame ruled out.
  - [x] K1 DONE 2026-07-02 (`5e95f63a6`): buildTransitionBubble + sampleKineticFrame, 15-test
    T-criteria suite green (93/93 powerCore total). Hard-won design facts baked into code comments:
    co-located ghost pairs are a binary switch (ownership flip = presentation WIPE, not geometry);
    weight alone can't model absence in open space; a site may lie OUTSIDE its own weighted cell
    (containment mapping invalid → cells carry sourceSiteIndex); mid-morph space contested between
    two ramping sites needs an inner FLEX ring layer rendered live (static substitution → holes);
    library degeneracies escape via deterministic sub-quantum jitter on ramped sites only.
    CAVEATS → K2: per-frame 2.6ms vs 2ms target (ring is 193 of 297 mini sites — adaptive depth is
    the lever); T4 recapture retarget is engine-level, lands in K2.
  - [x] K2a+K2b DONE 2026-07-02 (`254e38421`, `53f29625e`): endpoint extraction + KineticTransitionRuntime
    (T4 retarget continuous <5%, T5 tick-bound; 5 tests). Virtuals-off default (`0700e81d7`) collapsed
    capture cost to 7 ramps / 0.30ms per frame (budget RESOLVED, was 2.6ms).
  - [x] K2c DONE 2026-07-02 (`160461d9d` plumbing + `748f12d82` drive): logger `transition` category;
    optional RenderFamilyInput.kineticFrame + endpoint collector (no re-compute); kineticRuntimeBridge
    singleton driven from GameCanvas (commit on ownership-fp change via collector — dodges the
    render-family-live trap; per-frame sample; bench counters; reset on destroy). Gates: check 0 err;
    territory 393/394 (pre-existing only) + 5 bridge tests; replay hash unchanged; bench CONFIRMED
    (cell_grid.transition p50 8.4 / p95 25.1 / p99 41.6 / pending 0 — within noise of the 2026-07-01
    baseline). DEVIATION: kineticFrame sampled + exposed but NOT threaded into the 7 family inputs
    (no consumer in K2c; K3a wires the Vector skin).
  - [x] K3a + FIX DONE 2026-07-03 (`8e2fa80de` mode + `12acd6264` fixes): 'power_vector' render mode.
    Checkpoint-1 v1 findings all addressed: (1) real conquest SWEEP — captured cell's incoming owner
    grows as SHAPE change, no colour blend (equal-weight moving-site pair, attack dir = new owner's
    nearest star; conquestSweep.test.ts); (2) merged fills (fill-only); (3) per-frame repaint
    (kinetic presentation nonce — fixed the "snap"); (4) 'transition' logging category in the panel.
    Fast-capture fixture `common/resources/saved-maps/kinetic_capture_test.json`. Gates: check 0 err;
    territory 396/397 + 3 sweep tests; powerCore 104/104; hash unchanged. **AWAITING USER CHECKPOINT 1.**
    KNOWN v1 tuning risks (need user eyes, no preview possible): sweep sharpness/feel, slight
    combined-region bulge from equal-weight pair, corner behaviour.
  - [ ] K3b: feel tunables → USER CHECKPOINT 2 = vector-transition sign-off.
  - [ ] K4: lattice modes consume kinetic geometry → USER CHECKPOINT 3; then museum-branch retirement.

### Done (2026-07-02)
- [x] **Settings panel crash (blocked P1c sign-off)** `[settings][bug]` — `sec.id` null deref in the
  sectionContent snippet (Svelte 5 teardown race: snippet deriveds re-evaluate before the
  activePanel guard unmounts). All sec derefs in the panel now null-tolerant. `599362560`.

## 2026-07-01

### Open
- [ ] **⭐ POWERCORE UNIFICATION (governing plan — USER-APPROVED 2026-07-01)** `[territory][direction]` —
  perfect a single PV core (PowerCore); grid-lattice looks (Edges/Ember/Phase) re-based as skins on
  it, NOT abandoned. Plan: [POWERCORE_UNIFICATION_PLAN](sessions/2026-07-01/2026-07-01_POWERCORE_UNIFICATION_PLAN.md).
  Supersedes recovery L3–L6. Absorbs tasks #4/#8/#10/#11 + settings remainder of #9.
  - [x] P0 DONE 2026-07-01 (`08b475e87` on `claude/territory-recovery`): −519/+27 in GameCanvas;
    flag + 4 dead scheduling paths + yield/cadence cluster + 17 orphan consts deleted; instrument
    kept. Gate green: check 0 errors; tests match master; hash unchanged; spot bench == baseline;
    pending 0.
  - [ ] P1: PowerCore correctness + adapter to ResolvedGeometrySnapshot; gate: invariant tests + USER visual sign-off.
    - [x] P1a DONE 2026-07-01 (`b8e4dab87..a48181a76`, verified independently: 33/33 tests, check 0
      errors, scope respected): adapter buildPowerCellsFromSites; owner-from-half-edge left-cell tags
      (O(N²) walk deleted; pinned vs old answer); smoothSharedEdges Chaikin w/ pinned junctions;
      2-fixture invariant suite (closure, no self-intersect, edge-use parity, shuffle determinism).
      KNOWN LIMIT: negative-area hole cycles skipped → enclave maps would break the edge-use
      invariant (Phase-1 limitation, carried to P1b).
    - [x] P1b DONE 2026-07-02 (`39c42c322..b52fe8a0f`, done inline after the delegated agent stalled
      with zero commits): Stage-0 extracted + shared byte-identically; buildPowerCoreAuthoritySnapshot
      (regions with identity from the walk, deterministic junction-terminated frontier chaining,
      topology, shells); 'power_core' registered on the existing PERIMETER_FIELD_GEOMETRY_SOURCE key
      (default UNCHANGED = 0319); 5-fixture A/B parity suite. powerCore 76/76; check 0 errors.
    - [ ] **FINDING (REFINED 2026-07-02 after user challenge — original framing overstated):**
      `[territory][geometry][bug]` — 0319 drops the **contested-lane midpoint frontier**: corridor
      CONTEST virtuals share one siteId (`corridor_A_B`), and `extractSharedEdges` (generator :591)
      dedups edge sides BY siteId → the second owner's side never records → frontier dropped at the
      extraction stage. Cell-level diff proved both pipelines see IDENTICAL cells; loss is purely
      0319 extraction. Visual severity: a thin lane-corridor seam without a border — largely
      invisible in lattice modes (user correctly saw no gross violations); the px figures were
      sliver-perimeter totals, not hole sizes. Still a real defect: it is exactly the frontier the
      CX-contest feature exists to draw. PowerCore == oracle on all 5 fixtures. Pinned in
      powerCoreParity.test.ts.
    - [ ] **FIELD-mode rounding option** `[territory][render]` — user: 0319's rounding (from its
      post-hoc constraint-resolution smoothing) shows in FIELD and is preferable as an option.
      PowerCore has junction-pinned Chaikin (smoothSharedEdges) — expose/raise passes so PowerCore
      matches or exceeds 0319's rounding as a tunable.
    - [ ] **Constraints — SHELVED by user 2026-07-02 "until further notice."** `[territory][geometry]`
      Do not work constraints (MSR/CX/DX tuning, invariant specs) until the user re-opens them.
      WHEN UNSHELVED, start from the user-supplied technical guide
      (game/territory/2026-07-02_POWER_VORONOI_TECHNICAL_GUIDE.md §C): SB/MSR has a CLOSED FORM —
      inscribed radius r_i = min_j (d_ij² + w_i − w_j)/(2d_ij); guarantee via weight floor
      w_i − w_j ≥ 2ρ·d_ij − d_ij²; hidden-site guard w_j − w_i ≤ d_ij². No iteration, no post-hoc
      repair. Also there: CX capsule-union tradeoffs, CL Delaunay-adjacency, DX union-find,
      area-targeted weights (Aurenhammer–Hoffmann–Aronov), and a contested-band "who is winning"
      readout (band width ∝ |d₁ − d/2|) worth stealing for gameplay legibility.
      CORRECTION on record: constraints tuning was NEVER the source of fill/border divergence
      (documented cause: greedy junction walk + per-polygon vertex edits). Focus order set by user:
      (1) absolute geometry correctness (PV/PowerCore — largely done), (2) **absolute correctness
      of TRANSITIONS — the real hard problem** (= P3, now elevated).
    - [ ] P1c: A/B on acceptance map `First Symmetry-6_April 17b` + USER visual sign-off (the gate).
      To view PowerCore live: settings key `PERIMETER_FIELD_GEOMETRY_SOURCE` = `power_core`
      (0319 remains default until sign-off).
      REFINED 2026-07-02 (user caught it): the toggle reaches ONLY the render-family seam —
      live in Ember/Edges/Phase Field/Grid Gradient/Cell Grid (RenderFamilyInput.geometry).
      **PVV4-runtime is a THIRD separate assembler** (TerritoryEngineController→TerritoryCompiler
      metric/frontier/region stages — does NOT consume the shared power diagram at all), so PVV4
      showed no change. PV-look A/B therefore = build the **Vector skin** (render PowerCore's
      snapshot directly: crisp fills+borders, selectable mode) rather than wiring the toggle into
      the legacy PVV4 engine. This starts P4's Vector skin early; PVV4 retires against it later.
    - [ ] Vector skin (PowerCore-native PV look) `[territory][render]` — minimal presentation of
      ResolvedGeometrySnapshot (region fills + frontier/world borders, HSLA + width tunables),
      registered as a selectable mode for A/B vs PVV4. IN PROGRESS 2026-07-02.
  - [ ] P2: local/incremental capture updates; gate: per-capture geometry p95 ≤ 2ms.
  - [ ] P3: one transition system (exact identity; two-stage; never stale); gate: pending 0, capture-tick p95 ≤ 16.7ms.
  - [ ] P4: skins (Vector + Lattice via region-mask/SDF shader); per-skin USER sign-off; legacy → museum branch.
  - [ ] P5: hero-skin acceptance matrix + Frontier FX/smooth-fill inside Lattice skin.
- [ ] **Territory overnight-integration RECOVERY / merge-in** `[territory][perf]` — start from
  latest master; two-stage presentation (immediate correct ownership; deadline-bounded fancy
  transition; skip if late). Plan + full evidence:
  [recovery plan](sessions/2026-07-01/2026-07-01_TERRITORY_OVERNIGHT_INTEGRATION_REVIEW_SYNTHESIS_AND_RECOVERY_PLAN.md).
  IN PROGRESS (started 2026-07-01). NOTE: do NOT merge `codex/territory-overnight-integration` wholesale.
  Working branch: `claude/territory-recovery` (worktree `.claude/worktrees/territory-recovery`).
  - [x] L1 DONE 2026-07-01: branch `claude/territory-recovery`; harness ported (`0d019ca0a`);
    replay hash == review reference `9f6dae73…9741910` (rules intact); review-worktree aggregates
    preserved (`d3349cbb5`); full 32-row baseline captured + distilled (`f2fdf1c72`).
    Baseline verdict: pending-display 0 everywhere; PV/perimeter/metaball/phase_field at refresh;
    cell_grid transition p95 25ms; phase_edges p50 25ms + ember p50 33ms in ALL scenarios
    (structural); grid_gradient p50 ~100ms (unusable).
  - [ ] L2: remove delayed/stale display. REFINED 2026-07-01: `d2ac9d771a`/`4c847ca20` are NOT on
    master — but master carries the OLDER flag-gated machinery they extended
    (`PRESENTATION_SMOOTHNESS_FIRST = true` hardcoded at GameCanvas.svelte:314 since `d4b57a7ca`
    2026-04-28; 8 gate sites; dead `false` branches = scheduler-background / message-channel /
    timeout / delay-timeout paths). L2 = delete the dead delayed-display branches + the flag
    (bias-to-less-code; the overnight effort proved the hazard by re-enabling them), KEEP the
    pending-age/commit-lag/scheduleMode instrument. Gate unchanged: pending 0/budget, hash
    unchanged, non-blank screenshots.
  - [ ] L3: split Phase Edges / Ember / Phase Field transition setup off the visible path.
  - [ ] L4: mode-switch acceptance (pending-display 0/budget all modes).
  - [ ] L5: Power Voronoi runtime mode-switch p95 open check (unproven; may be noise).
  - [ ] L6: keep-set cherry-pick (exact transition identity; plain Cell-Grid fill/border split; geometry tests).
- [ ] **Frontier FX — smooth-fill integration** `[territory][render]` (task #11) — FX is a per-cell
  field baked into jagged quad fills (`fx.ts` + `CellGridFamily.ts:2839` / `CellGridPhaseEdgesFamily.ts:4294`);
  it must follow the LINEAR phase-sampled smooth frontier so glow blends with border/fill. Deep
  render-integration; **gated on live visual verification** (user runs dev server). Deferred by user
  on 2026-07-01 in favor of the tranche processing.
- [ ] **Gameplay buttery-smooth: 60fps floor / 144 ideal** `[perf]` (task #8) — now informed by the
  recovery plan (stale-display removal + Phase/Ember transition-cost split are prerequisites).
- [ ] **Geometry correctness — new engine from first principles** `[territory][geometry]` (task #4, in progress) — PowerCore engine; see memory `powercore-geometry-engine`.
- [ ] **Smooth cell-fill edges to match borders (EDGES/EMBER/FIELD)** `[territory][render]` (task #10) — FIELD raster family still not smooth per memory `smooth-fill-needs-linear-phase-sampling`.

### Done (2026-07-01)
- [x] **Colyseus matchmaking 404** `[net]` — `/matchmake/joinOrCreate/lobby` hit the SvelteKit
  origin `[::1]:1420`; broadened loopback detection (localhost/127.0.0.1/::1/[::1]) so `SERVER_URL`
  uses the `:2567` dev server. Commit `b45da330c`. (Needs page reload; Colyseus must run on :2567.)
- [x] **Preserve territory overnight-integration review tranche** `[docs]` — 28 review docs copied
  verbatim into `.agent/docs/sessions/2026-06-29/`; synthesized into the recovery plan above.
- [x] **Establish MASTER_TASK_LIST + AGENT.md RULE 0.5** `[process]`.
- [x] **README full rewrite** `[docs]` — grounded in real mechanics; removed the "V4 Symmetric
  Damage Model" cruft, stale `.atlas/`/`server/` paths, and wrong clone URL (`pax-galaxia-redux`
  → `pax-fluxia`). Foregrounds the living-frontier territory rendering (render families +
  4-layer pipeline), the tuning/theme surface, star types + portal stars, the shared deterministic
  engine, and a real roadmap. Combat correctly described as remote symmetric attrition (ships hold;
  only reinforcements move) — the exact point the old README got backwards.

### Done (settings overhaul — 2026-06-30 → 2026-07-01)
- [x] Settings surface audit doc `[settings]` — `.agent/docs/game/design/2026-06-29_SETTINGS_SURFACE_AUDIT.md`.
- [x] TIER-A cleanup: Preset Rows killed, dead `{#if false}`, dead gates, ghost key `c5b94d637`.
- [x] Render-mode unification: one **Render** section with per-mode subsection chips + live-mode
  default/highlight; phase_field double-source killed; metaball folded in `1f0f6dfa4` `d14f58925` `1b9b4c456`.
- [x] Render Mode selector → topbar `d940b3359`; search 1.5s glow + coverage `3a5f03b6d`.
- [x] Ships (12 chips) + Audio (3 chips) subsection division `7f0e8339a` `40fd17652`.
- [x] `ORBIT_DENSITY` de-inverted → "Ship Spacing" `e8a42c6d7`; `ARROW_LENGTH_FRACTION`→`ARROW_LENGTH`
  moved to Visuals (+79 theme presets) `7574f7827`; `AGGRESSOR_ADVANTAGE` kept in Battle; End Settle
  wired; inert "Cell Grid Enabled" removed `ad139f5e7`.
- [x] Cross-category sweep (dead components, single-item chips, CategoryThemeBar) `22a3b7687` `28661c120`.
- [x] Dirty-tree resolved + `.claude/worktrees` gitignored `881179e03`.

### Deferred / needs user decision (from settings audit)
- [ ] Same-key conflict resolutions were applied; larger over-long splits beyond Ships/Audio (e.g.
  Diagnostics mode-diagnostics ~330 read-only lines) — assess if further division wanted `[settings]`.
