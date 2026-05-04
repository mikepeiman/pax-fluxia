# Perimeter Field Gap Report

Date: 2026-04-15  
Scope: `perimeter_field` only  
Status: Current-state gap-to-spec report

## Source Documents

This report is derived from:

- [PERIMETER_FIELD_MODE_SPEC.md](C:/Users/mikep/.codex/worktrees/4adc/pax-fluxia/.agent/docs/game/territory/PERIMETER_FIELD_MODE_SPEC.md)
- [PERIMETER_FIELD_SPEC_COMPLIANCE_AUDIT_2026-04-14.md](C:/Users/mikep/.codex/worktrees/4adc/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-14/PERIMETER_FIELD_SPEC_COMPLIANCE_AUDIT_2026-04-14.md)
- [USER_PROMPT_CORPUS_AND_INTENT_ANALYSIS_2026-04-15.md](C:/Users/mikep/.codex/worktrees/4adc/pax-fluxia/.agent/docs/project/implementation-plans/2026-04-15/USER_PROMPT_CORPUS_AND_INTENT_ANALYSIS_2026-04-15.md)

This document answers four questions:

1. What parts of the current implementation are noncompliant?
2. What requirements/specifications still need implementation?
3. What existing behavior is erroneous or incomplete?
4. What tasks are required to bring the mode up to spec?

---

## In-Spec Today

These parts are currently aligned enough with the mode spec and should be preserved:

- Base geometry can come from a selectable tuned source.
- `power_voronoi_0319` is available and is the preferred practical source today.
- Source tuning is exposed for MSR, CX, lane-pairs, and DX.
- Display territory in `perimeter_field` is perimeter-sample-driven, not star-centered by default.
- Perimeter vstars are offset inward from the boundary by a tunable amount.
- DX midpoint behavior exists and should remain.

These are not the current blockers.

---

## Noncompliant Implementation Parts

### 1. Transition uses the wrong primitive

Current implementation still models conquest transition as temporary synthetic transition samples layered over static perimeter samples.

Why this is noncompliant:
- The mode spec requires transition to be correspondence and motion between real `PREV` and real `NEXT` perimeter-vstar states.
- Temporary conquest-only samples are explicitly a violation of the mode design.

Effect:
- Transition behavior drifts away from the real ownership/render state of the mode.
- Tuning is applied to an invented mechanism instead of the intended ownership primitive.

### 2. Change selection is wrong

Current implementation selects one old source and one new source around the conquered star and effectively replaces whole local sources.

Why this is noncompliant:
- The mode spec requires changed active fronts / contested topology to determine which vstars move.
- Whole-source replacement is broader than the intended change area.

Effect:
- Ballooning at transition start/end
- unrelated frontier movement
- disjoint snaps around conquest

### 3. Correspondence is wrong

Current implementation matches perimeter samples by angle around the conquered star.

Why this is noncompliant:
- The spec requires topological/euclidean correspondence of real `PREV` and `NEXT` perimeter-vstar states.
- Star-centered angle matching was never part of the requested design.

Effect:
- non-bijective pairing
- crossing motion paths
- loser/victor confusion
- movement originating from obviously wrong locations

### 4. Geometry identity is degraded

Current implementation still weakens deterministic identity through:
- synthetic region IDs in the family geometry adapter
- polluted `starIds` that include virtual sites rather than only gameplay anchors

Why this is noncompliant:
- The mode spec depends on deterministic ownership/topological identity.
- Upstream identity exists and must not be dropped or muddied.

Effect:
- unstable region correspondence
- weaker basis for selecting the correct changed fronts
- fallback logic becomes tempting where it should be unnecessary

### 5. PREV/NEXT truth is still not guaranteed

Current implementation improved capture, but the documented risk remains: `PREV` can still be seeded from rolling stable-frame state rather than atomically captured true transition-start state.

Why this is noncompliant:
- The spec requires scrub frame `0` to be exact gameplay `PREV`.
- `PREV`, `NEXT`, and all scrub frames must be exact live gameplay truth.

Effect:
- false `PREV`
- deranged exported bundles
- misleading diagnostics and wrong debugging conclusions

### 6. Diagnostics still do not satisfy the full truth contract

Current implementation has improved, but the remaining issues are:
- preview still affects main presentation rather than being fully isolated
- exported bundles still need cleaner separation of render/debug artifacts
- labels and pair identities are not yet fully sufficient for deterministic motion inspection

Why this is noncompliant:
- Diagnostics must be read-only and must not alter gameplay rendering.
- Exports must be minimal, readable, and sufficient for deterministic diagnosis.

Effect:
- debugging ambiguity
- user-visible diagnostic clutter
- risk of reintroducing gameplay/diagnostic divergence

---

## Specifications And Requirements Still Needing Implementation

These requirements exist in the spec but are not yet fully implemented.

### A. Real PREV/NEXT perimeter-vstar state model

Still needed:
- explicit first-class `PREV` perimeter-vstar state
- explicit first-class `NEXT` perimeter-vstar state
- transition defined as mapping between those two states

Not acceptable:
- temporary conquest-only substitutes

### B. Changed-front-driven selection

Still needed:
- determine moving vstars from changed active fronts between contested stars
- limit movement to actual changed frontier sections
- keep all unchanged frontiers static

### C. Stable correspondence

Still needed:
- unique identification of corresponding `PREV`/`NEXT` perimeter vstars
- stable pair mapping tied to changed front sections
- no star-center angle heuristic

### D. Arc-aware or constrained motion

Still needed:
- pathing that avoids crossing unrelated frontiers
- straight motion only where safe
- arc/non-linear routing where required by topology

### E. Identity preservation

Still needed:
- stable territory IDs through geometry generation and adaptation
- explicit separation of gameplay star identity from contributing virtual-site identity
- no dropping of upstream deterministic membership data

### F. Exact live capture contract

Still needed:
- guaranteed atomic capture of true `PREV` at transition start
- guaranteed atomic capture of true `NEXT` at settle
- scrub frames sourced from actual live gameplay frames only

### G. Fully compliant diagnostics/export

Still needed:
- clean gameplay frames separate from debug frames
- better pair-oriented labels for loser/victor movement
- compact readable geometry/debug metadata
- conquest-aware bundle/file naming
- fully isolated preview surface semantics

---

## Existing Behavior That Is Erroneous Or Incomplete

### Erroneous

- Transition-local synthetic vstars exist as a core mechanism.
- Whole local source replacement is used where changed-front-only movement is required.
- Angle-about-star matching remains the main correspondence method.
- Geometry identity remains partially synthetic/polluted.
- `PREV` truth is not yet guaranteed by design.

### Incomplete

- Pairwise motion identity is not yet strong enough for deterministic inspection.
- Diagnostic export separation is incomplete.
- Replay/preview isolation is improved but still not fully ideal by spec.
- Arc-aware routing for moving samples does not exist.
- Changed-front selection is not implemented as the transition driver.

---

## Task List To Bring The Mode Up To Spec

This is the required implementation sequence.

### Phase 1. Lock down state truth and identity

1. Make transition-start capture explicit and atomic.
   - Capture true gameplay `PREV` at the exact moment the transition begins.
   - Stop relying on a rolling stable-frame fallback for `PREV`.

2. Make settle capture explicit and atomic.
   - Capture true gameplay `NEXT` at the exact moment the transition settles.

3. Preserve deterministic geometry identity end to end.
   - replace synthetic region IDs with stable territory IDs
   - separate gameplay anchor stars from virtual contributing sites
   - preserve upstream star-to-region membership without degradation

### Phase 2. Replace the transition model

4. Remove transition-local synthetic samples as the core transition primitive.
   - Transition must operate on real `PREV` and `NEXT` perimeter-vstar states.

5. Implement changed-front / contested-topology selection.
   - Determine which perimeter samples are allowed to move from changed active fronts.
   - Keep all unchanged frontiers static.

6. Implement stable correspondence.
   - Pair `PREV` and `NEXT` perimeter samples by section-local/topological identity.
   - Do not use angle-about-star matching.

### Phase 3. Fix motion quality

7. Add constrained motion planning.
   - Default to straight motion only if it does not cross unrelated frontiers.
   - Add arc/non-linear routing where required.

8. Validate start/end shape continuity.
   - Frame `0` must equal true `PREV`.
   - Last transition frame must be visually near true `NEXT`.
   - No ballooning at start/end.

### Phase 4. Finish diagnostics/export

9. Make diagnostics fully read-only in presentation terms.
   - Preview should not silently replace gameplay semantics.
   - Diagnostic inspection must remain explicitly gated.

10. Split export artifacts cleanly.
   - `render/` = gameplay truth only
   - `debug/` = gameplay plus labels/paths/vstars
   - geometry stays as readable compact data, not baked into clean render PNGs

11. Improve deterministic labeling.
   - Stable pair labels for corresponding mover samples
   - clear loser/victor labeling
   - frame-by-frame current position + start/end lookup in metadata

12. Fix conquest-aware export naming.
   - include datetime
   - include attacker->target pair identity
   - support simultaneous conquest naming without collisions

---

## Practical Priority Order

If work resumes immediately, this should be the order:

1. Atomic `PREV` / `NEXT` capture
2. Geometry identity cleanup
3. Changed-front selection
4. Stable correspondence
5. Constrained motion / arcs
6. Diagnostic/export cleanup

This order matters. Doing diagnostics or motion tuning before fixing truth capture and correspondence will continue to waste time.

---

## Bottom Line

The current mode is not failing because of missing slider tuning. It is failing because the transition architecture is still off-spec.

The core gaps are:
- wrong transition primitive
- wrong change-area selector
- wrong correspondence method
- degraded identity
- incomplete truth capture

Bringing `perimeter_field` up to spec requires replacing those architectural deviations, not iterating further on the current heuristic transition model.

