# Perimeter Field Plan Review

Date: 2026-04-15
Status: Review and improvement pass on the 2026-04-15 implementation plan
Scope: `perimeter_field` correction, with notes on `firecracker` and metaball follow-on

## Purpose

Critique the three 2026-04-15 documents (gap report, implementation plan, prompt-corpus analysis) against the actual code and the user's stated design. Name what is right, what is hand-waved, what is missing, and what should change before a single line of code is touched.

This is not a ratification. It is a second opinion with teeth.

## Bottom Line

The **diagnosis is correct** and the **priority order is right**. Code confirms every deviation named in the gap report — synthetic transition samples at [buildPerimeterFieldScene.ts:393–520](../../../../src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts), angle-about-star matching at :342–390, whole-source replacement at :420–452, synthetic region IDs at [buildFamilyGeometry.ts:94–158](../../../../src/lib/territory/families/buildFamilyGeometry.ts), polluted `starIds` at [powerVoronoiTerritoryGeometryGenerator.ts:637,670](../../../../src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts).

The **execution plan is too thin in four places** that will swallow weeks if entered cold:

1. "Changed-front extraction" is one sentence; it is actually the hardest problem in the project.
2. Motion path "crossing rejection" has no concrete collision model.
3. Topology changes (region merge/split, DX midpoint appearance/disappearance) are absent from the correspondence story.
4. The acceptance criteria are visual/subjective when they need to be programmatic invariants.

Without fixing those, the plan will produce another round of "seemed to work, then didn't." The rest of this doc is the fix.

## What The Plan Gets Right

Keep these — they are the reason this plan is better than the last three attempts:

- **The first-class `V` substrate** is the right abstraction. Naming it a shared boundary-control-point type (stable ID, owner, source span, arclength, tangent, weight) is the single most important design move in the plan. It gives the transition algorithm a clean input/output and lets `perimeter_field`, PV/PVV, and a future metaball-follow-on mode share machinery instead of each inventing its own.
- **Priority order**: truth → identity → substrate → changed-front → correspondence → motion → presentation. Any other order wastes work. The user arrived at this ordering through six weeks of pain; do not relitigate it.
- **Preserved-V + unmatched-span remesh** is a genuine algorithmic improvement over the current global angle match. Remeshing *locally* to equal count `K` dissolves the count-mismatch problem without a global nearest-neighbor bloodbath.
- **Deferring firecracker and metaball-follow-on** until the standard mode is correct is the right call. The prompt corpus (U005, U006) shows firecracker is an *activation-order* overlay; it cannot be correct if the underlying correspondence is wrong.
- **Splitting `render/` and `debug/` exports** directly addresses U048/U049 and the user's persistent diagnostic-truth requirement.
- **Docs-first architecture** (mode spec + compliance audit already on disk) gives future agents a hard wall against the drift pattern documented in the prompt corpus.

## What The Plan Gets Wrong Or Under-Specifies

### 1. Changed-front extraction is load-bearing and under-defined

The plan says (Phase 3, step 6): *"Use contested topology / active-front information to isolate changed frontier chains for the conquest."*

That is a wish, not an algorithm. The code shipping today has `FrontierTopology: 128 vertices, 222 sections, 21 loops` (visible in U020 logs). There is **no existing "changed front" primitive** in this codebase. You are going to build it.

This step needs a real spec. Minimum:

- **Input contract**: `(PREV FrontierTopology, NEXT FrontierTopology, ConquestEvent)` where the event names `(attackerStarId[], targetStarId, previousOwner, newOwner, tick)`.
- **Output contract**: ordered list of `ChangedSection` records, each identifying a contiguous arclength range on both `PREV` and `NEXT` where the owner-pair across the frontier changed. Plus a classification: `{added, removed, reassigned}` and the owner-pair transition `(ownerA_prev, ownerB_prev) → (ownerA_next, ownerB_next)`.
- **Section identity**: sections in PV-derived topology are already keyed by the owner pair that bounds them. A section is "changed" if its owner-pair changed between PREV and NEXT, **or** if it did not exist in the other frame.
- **Chain assembly**: changed sections adjacent at a vertex must be joined into a chain so remeshing and correspondence operate on contiguous spans.

Without this spec written down, different agents will invent different "active front" definitions and you get the exact drift pattern the prompt corpus condemns.

### 2. Motion-path "crossing rejection" has no collision model

Phase 5 (step 12): *"Default to straight-line motion only when it does not cross unrelated static frontiers."*

What is "unrelated"? Against what geometry is the test run? Three answers are possible and they are not equivalent:

- (a) Against the static-V set (point obstacles; cheap).
- (b) Against all non-changed source-geometry polylines (the frontier segments the changed span does *not* belong to; the correct answer).
- (c) Against the swept path of all *other* moving V's (to prevent mover–mover crossing; the expensive answer).

The plan should name (b) as primary and (c) as a monotonicity constraint within a single unmatched span. (a) is not sufficient — a straight path can pass between two static V's and still cut through a static frontier section.

Add to the plan: *"Crossing test is point-in/segment-intersect against the NEXT frontier polylines excluding the changed span(s) the mover belongs to. Within an unmatched span, pair paths must not cross each other (monotonicity preserves this by construction)."*

### 3. Topology changes are not addressed

Conquest can:

- **Merge** two formerly-disconnected same-owner components (DX midpoint disappears because the gap is gone).
- **Split** a region (an attacker drives through and separates a blob into two).
- **Eliminate** a region entirely (last-star capture).
- **Create** a new frontier pair that did not exist (first contact between two players whose territories just met).

Preserved-V + unmatched-span remesh assumes a span-to-span pairing. Merges and splits break that assumption. The plan needs an explicit rule set:

- **V appears in NEXT only**: no `PREV` partner. Fade in over the transition, anchored at NEXT position from frame 0. No motion.
- **V disappears (exists in PREV only)**: no `NEXT` partner. Fade out, stay at PREV position. No motion.
- **DX midpoint transitions**: treat the midpoint V as a first-class V with its own identity. If the disconnected-same-owner precondition stops holding in NEXT, the V fades out. Do not try to "move" it to somewhere it does not belong.
- **Region split**: the PREV span is cut by the attacker's path. Each resulting NEXT span remeshes independently against its portion of the PREV span (arclength slice by the cut point).

Write this into the correspondence phase. Otherwise the first real conquest that merges two components will produce "where did the DX vstar go" confusion and you will waste a day finding it.

### 4. Atomic PREV/NEXT capture needs a named hook, not a goal

Phase 1 says *"capture true gameplay `PREV` at the exact moment the transition begins."*

Name the hook. The engine has a tick cadence; conquest events arrive at tick boundaries. The contract should read:

- **At the engine tick `t_c` that emits `ConquestEvent`**, immediately snapshot `S_prev = {ownership, topology, V-set, source-geometry}` **before** applying the conquest mutation.
- Apply the mutation.
- Snapshot `S_next` on the same tick after mutation.
- Transition renders from `(S_prev, S_next)` over `[t_c, t_c + D]` with no further reads from live engine state.

This makes the transition a **pure function of `(S_prev, S_next, conquest-event, t_elapsed)`**. Pure = deterministically replayable from the bundle. The prompt corpus (U038, U044, U045) shows the user has been burned repeatedly by divergence between live render and diagnostic view. Purity kills that class of bug.

State this invariant in the mode spec. Enforce it with a test that re-derives transition frames from an exported bundle and byte-compares them against the live captures.

### 5. Identity refactor is bigger than a bullet

Phase 1 step 3 casually asks for:

- stable territory IDs replacing synthetic region IDs
- split of gameplay anchor stars from virtual contributing sites

This touches `powerVoronoiTerritoryGeometryGenerator`, `buildFamilyGeometry`, every consumer of `region.starIds`, and likely the compiler output type. Name the type explicitly so agents do not re-invent it:

```ts
interface RegionIdentity {
  regionId: StableRegionId;             // deterministic, derived from sorted anchor star IDs
  anchorStarIds: StarId[];              // real gameplay stars only
  contributingSiteIds: VirtualSiteId[]; // DX midpoints, CX lane ghosts, etc.
}
```

Callers currently reading `region.starIds` for gameplay purposes must switch to `anchorStarIds`. Callers needing geometric contribution membership use `contributingSiteIds`. No call site should use both through one field.

### 6. Acceptance criteria are not programmatic

"No ballooning at start/end" is not a CI test. Replace with invariants:

- **Frame-0 equality**: exported `render/prev.png` SHA matches the gameplay frame captured at `t_c`. No sub-pixel tolerance for the first pass; frame 0 must be byte-identical.
- **Preserved-V invariant**: for every pair `(pid in PREV, pid in NEXT)` where `|pos_prev − pos_next| < MOE`, the mover at `pid` has zero displacement across all transition frames.
- **Static-span invariant**: for every V on a span not classified as changed, displacement = 0 across all frames.
- **Bijection invariant**: within each unmatched-span remesh, `|PREV pair-IDs| == |NEXT pair-IDs|` and the mapping is one-to-one.
- **Crossing invariant**: for every mover path, the polyline does not intersect any non-changed NEXT frontier segment.
- **Replay purity**: re-deriving transition from exported `(S_prev, S_next, conquest-event)` produces frames byte-identical to live.

Put these as unit/property tests, not acceptance wishes. If the invariants are hard to name, the design is still not concrete enough.

### 7. No migration safety

Phase 2 removes the synthetic-sample path. During Phase 2–4, transitions will look worse than today before they look right. The prompt corpus shows the user hits "you broke transitions" (U035, U040, U042, U043, U045) repeatedly and loses confidence fast. Mitigate:

- Keep the current heuristic path behind a flag (`VS_TRANSITION_MODE=perimeter_field_legacy_angle`) during Phases 2–5.
- New path runs under `perimeter_field` proper once Phase 6 acceptance passes.
- Delete the legacy path only in Phase 8 or later.

This is not "backwards compatibility for users." This is a **development-time rollback so the user can A/B while you work**.

### 8. MOE tolerance of 3px needs a coordinate-frame note

Preserved-V matching compares positions within 3px. In **world coordinates**, or screen coordinates? Arclength along a source span is *not* a stable identity across transitions because the source polyline shape itself changes. The plan should make explicit:

- **V identity lives in world-space position at its frame**, not arclength.
- **Preserved-V match**: `|pos_prev - pos_next| < MOE_world` AND local tangent alignment within `θ_tol`.
- **Arclength is a placement parameter, not an identity**.

Without this, two agents will implement two different preserved-V tests and you will debug the wrong one.

### 9. Edge-case regions

*"Real star ownership influence is zeroed for display"* is a strong claim. What happens to:

- A region containing a single star with no contested frontier? It has no perimeter-V story — perimeter V's presuppose a frontier.
- A region whose perimeter is shorter than `2 × offset`? Inward offset collapses.
- Fresh neutral stars at game init (U008)?

Add a degenerate-case section to the spec:

- Regions below minimum perimeter length fall back to the source geometry directly (no V derivation).
- Isolated stars render as a filled disc at the star position using the source-geometry region polygon; no inward-offset sampling.
- Neutral ownership must have non-zero weight (per U008) so neutral regions still produce a V ring.

### 10. Metaball "follow-on" is a redesign, not a follow-on

Phase 9 step 19 proposes a geometry-following metaball mode sharing the V substrate. This is more work than the framing suggests:

- Metaball's aesthetic comes from star-anchored field summation. Replacing that with V-anchored field summation is not a tuning change — it removes the star-centered smoothness that gives metaball its look.
- If you want source-geometry fidelity *and* metaball aesthetics, the right path is probably: sample the source geometry's **signed distance field**, then render the metaball visual from that field, not from anchored V's.

Either (a) commit to SDF-following metaball as a distinct experimental mode, or (b) drop the "metaball follow-on" framing. Do not promise a mode without a design. The prompt corpus (U013) shows the user lost patience with metaball and moved to perimeter_field precisely because metaball tuning stopped paying off; do not reintroduce metaball work under perimeter_field's budget.

## Revised Priority Order

The plan's Implementation Order list is correct, but step 4 ("Changed-front selection") needs to become two steps because it has to build infrastructure that does not yet exist:

1. Atomic `PREV` / `NEXT` capture at tick boundary. **Name the hook. Prove purity with a replay test.**
2. Region identity refactor. **Name the `RegionIdentity` type. Migrate all `starIds` callers.**
3. `V` substrate. **Type, fields, construction contract.**
4. **Frontier-topology diff primitive** (new, was implicit). Produces `ChangedSection[]` from `(PREV topology, NEXT topology, ConquestEvent)`.
5. **Changed-span extraction** consuming step 4's output, producing `PREV` and `NEXT` affected spans.
6. Preserved-V detection with world-space MOE + tangent tolerance.
7. Unmatched-span local remesh to equal `K`.
8. Monotone correspondence within each unmatched span.
9. **Topology-change handling** (merge/split/appear/disappear rules). Probably fits between 7 and 8 conceptually but is its own code path.
10. Constrained motion routing with explicit crossing test against non-changed NEXT frontier polylines.
11. Standard perimeter_field mode wired end-to-end; legacy path still behind flag.
12. Diagnostics/export cleanup (render/debug split, pair-oriented labels, conquest-aware naming).
13. On-map overlay toggles for source tunables and transition state.
14. Delete legacy path after acceptance passes.
15. `firecracker` as a pair-delay overlay on correspondence.
16. Metaball follow-on — only if scoped as its own project.

## Open Questions The Docs Do Not Resolve

Answer these before coding Phase 3 or later:

1. Is the engine's conquest-event emission synchronous with the tick, or deferred? This controls where the atomic capture hook sits.
2. Does `FrontierTopology` already carry owner-pair keys on sections? If yes, the changed-section diff is a straightforward set-diff; if no, section identity must be added first.
3. How are simultaneous conquests with shared stars handled in a single tick? The plan touches multi-event bundle naming but not multi-event correspondence. Does each event get an independent `(S_prev, S_next)` or do they share?
4. What is the intended behavior when the source geometry itself is re-tuned mid-game (MSR slider moved during a live conquest)? Pause the transition? Recompute NEXT? Freeze tuning during transition?
5. Is the "inward offset" computed per-span by normal offset, or is it a Minkowski erosion of the whole region polygon? The former is cheap and local; the latter is topologically cleaner. Plan does not specify.

## What I Would Tell The User Directly

The prompt corpus is painful reading. The user's frustration is earned — the implementation repeatedly substituted heuristics for the stated design. **The 2026-04-15 plan correctly names that pattern as the root cause.** That is the most valuable thing in it.

But the plan also contains the seeds of the same failure mode. Phases 3 and 5 are one-sentence wishes for the hardest problems. An agent reading only the plan and not the code will reinvent "changed front" and "crossing detection" with the nearest plausible heuristic — which is exactly how we got here.

**Do not enter Phase 3 until the frontier-topology diff primitive is specified to type level.** That is the bar. Everything else in the plan is execution. This one step is the design decision that determines whether the rewrite works.

Two other concrete suggestions:

- **Build the programmatic invariants first** (frame-0 equality, preserved-V zero-displacement, static-span zero-displacement, crossing-free paths). Wire them as tests against the *current* code so they all fail red. Then fix until green. This is the only way to know you are converging rather than sliding sideways.
- **Keep the legacy heuristic path behind a flag during the rewrite.** You will want to A/B visually at every step, and the user will want to see it too.

## Summary Of Recommended Plan Edits

If I were editing the implementation plan directly, I would:

1. Add a new Phase 3a: "Frontier-Topology Diff Primitive" with input/output type contracts.
2. Rewrite Phase 3 step 6 to consume 3a's output instead of hand-waving "active-front information."
3. Add Phase 4 step 9b: "Topology-change handling" with appearance/disappearance/merge/split rules.
4. Rewrite Phase 5 step 12 to name the crossing test's obstacle set explicitly (non-changed NEXT frontier polylines).
5. Replace the Visual Acceptance section with programmatic invariants, each mapped to a test.
6. Add a "Migration Safety" section: legacy path behind flag through Phase 5; deleted after Phase 6 acceptance.
7. Add a "Degenerate Regions" section to the mode spec.
8. Demote the metaball follow-on to "deferred, scope TBD" or remove it.
9. Name the `RegionIdentity` type in the identity section.
10. State the purity invariant: transition is a pure function of `(S_prev, S_next, conquest-event, t_elapsed)`.

These edits do not change the plan's direction. They close the gaps that will otherwise let the next implementation pass drift in the same way the prior ones did.

---

*Review authored in worktree `goofy-raman`. Grounded against [PerimeterFieldFamily.ts](../../../../src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts), [buildPerimeterFieldScene.ts](../../../../src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts), [buildFamilyGeometry.ts](../../../../src/lib/territory/families/buildFamilyGeometry.ts), [powerVoronoiTerritoryGeometryGenerator.ts](../../../../src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts).*
