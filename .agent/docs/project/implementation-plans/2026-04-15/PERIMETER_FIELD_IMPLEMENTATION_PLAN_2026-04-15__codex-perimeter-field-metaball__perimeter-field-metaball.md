# Perimeter Field Implementation Plan

Date: 2026-04-15  
Status: Active implementation plan  
Scope: `perimeter_field` only  
Priority: Correct the core mode first, then add minor transition variants such as `firecracker`

## Purpose

This document is the execution plan for bringing `perimeter_field` up to the intended design.

It is not a brainstorming note. It is a decision-complete implementation plan and operating contract for any engineer or agent working on this mode.

If current code or future proposals contradict this document, this document wins unless the user explicitly changes the design.

---

## Intent

`perimeter_field` is an experimental render family that uses:

1. actual ownership to generate tuned source geometry
2. inward-offset perimeter control points sampled from that geometry
3. a derived display field reconstructed from those perimeter control points
4. conquest transitions expressed as correspondence and motion between real `PREV` and real `NEXT` perimeter-control-point states

The mode exists to achieve two things at once:

- static territory that remains faithful to tuned source geometry
- conquest transitions that are local, smooth, legible, and topologically correct

This mode is not a star-centered transition mode. It is not a temporary-overlay mode. It is not a â€œfake the motion and hope the boundary looks goodâ€ mode.

---

## Definitions And Terms

### Source Geometry
- The territory geometry generated from actual ownership before family-specific display derivation.
- Valid sources include tuned geometry pipelines such as `power_voronoi_0319`.

### Perimeter Control Point
- The generalized transition primitive for this architecture.
- Denoted as `V`.
- Depending on family:
  - `perimeter_field`: `V = perimeter vstar`
  - PV/PVV-family: `V = boundary vertex`
  - Metaball geometry-following mode: `V = derived boundary control point`

### Perimeter Vstar
- In `perimeter_field`, the inward-offset ownership/render control point sampled from source geometry.
- This is not a temporary conquest-only construct.
- It is part of the real display ownership substrate for the mode.

### PREV State
- The exact live gameplay perimeter-control-point state immediately before conquest transition begins.
- Scrub frame `0` must equal this state exactly.

### NEXT State
- The exact live gameplay perimeter-control-point state immediately after conquest settles.

### Changed Front / Active Front
- The affected contested frontier section(s) between owners involved in a conquest.
- These determine which control points are allowed to move.

### Preserved V
- A `PREV`/`NEXT` control point pair that already matches within tolerance and should keep identity rather than become a mover.

### Unmatched Span
- A boundary span inside the changed area where `PREV` and `NEXT` do not already match and which therefore requires remeshing and pairing.

### Transition Pair
- A deterministic pair of corresponding unmatched `PREV` and `NEXT` control points, identified by a stable pair ID such as `P07`.

### MOE Tolerance
- Margin-of-error tolerance used when deciding whether a `PREV` control point and a `NEXT` control point should be treated as the same preserved control point.
- Default planning value: `3px`, tunable for diagnostics and development.

### Motion Path
- The path a transition pair follows from `PREV` to `NEXT`.
- May be straight, curved, or multi-segment if needed to avoid crossing unrelated frontiers.

### Firecracker Mode
- A minor transition mode layered on top of the corrected perimeter-field correspondence system.
- It changes temporal activation order, not the underlying state model or correspondence system.

### Clean Render
- Gameplay truth only. No geometry-debug overlays baked in.

### Debug Render
- Gameplay truth plus diagnostic overlays such as control points, pair labels, paths, and changed-front highlights.

---

## Hard Requirements And Invariants

### Geometry
- Source geometry must come from actual ownership.
- Geometry source must remain selectable.
- Source geometry tuning must remain live and meaningful for:
  - MSR
  - CX
  - lane-pairs
  - DX

### Ownership / Display Model
- In `perimeter_field`, displayed ownership comes from perimeter vstars after source geometry derivation.
- Real star ownership influence is zeroed for display in this mode after geometry derivation.
- Perimeter vstars are offset inward from the source boundary by a tunable amount.

### DX
- DX intent is **preserve gap**.
- DX midpoint logic must act as a gap-preservation operator between disconnected same-owner stars.
- DX must remain inspectable on-map in diagnostics.

### Transition
- Transition must operate between real `PREV` and real `NEXT` perimeter-control-point states.
- Temporary conquest-only transition samples are not an acceptable substitute.
- Changed active fronts determine which control points move.
- Unchanged fronts must remain static.
- Correspondence must not be based on star-center angle heuristics.

### Diagnostics
- `PREV`, `NEXT`, and scrub frames must be exact live gameplay truth.
- Scrub frame `0` must equal true gameplay `PREV`.
- Diagnostics must be read-only.
- Preview/replay must be explicitly gated and must never silently alter gameplay behavior.
- Export must separate clean render and debug render.

### Process
- Do not reinterpret user-design constraints as optional.
- Do not describe binary failures as partial success.
- Do not invent substitute primitives for convenience.
- Do not broaden scope beyond `perimeter_field` unless explicitly instructed.

---

## Agent Operating Instructions

Any agent implementing or modifying this mode must follow these rules:

1. Always separate `intended design` from `current implementation` in notes and reasoning.
2. Never treat temporary transition-only samples as compliant with the mode design.
3. Never use star-center angular heuristics as the main correspondence mechanism.
4. Never capture diagnostics from a synthetic reconstruction path if live family-path capture is possible.
5. Never ship a diagnostic/export feature that mutates or replaces gameplay behavior implicitly.
6. Never work on aesthetic tuning before truth capture, identity, changed-front selection, and correspondence are correct.
7. For any proposed change, identify whether it changes:
   - state truth
   - change-area selection
   - correspondence
   - motion pathing
   - diagnostics/export
   - presentation tuning
8. If a change touches one category while depending on another broken category, fix the dependency first.

---

## Current Gaps To Close

These are the current known architectural gaps:

1. `PREV`/`NEXT` capture truth is not yet guaranteed atomically.
2. Geometry identity is still degraded by synthetic IDs and polluted `starIds`.
3. Transition currently uses synthetic mover samples instead of first-class `PREV`/`NEXT` states.
4. Change selection still operates too broadly.
5. Correspondence is still heuristic and not stable.
6. Motion pathing does not yet avoid crossing unrelated fronts.
7. Diagnostics/export are improved but not fully compliant.
8. Metaball is still too star-centered for source geometry to have decisive effect.

---

## Implementation Plan

### Phase 1. Truth Capture And Identity

#### 1. Transition-start `PREV` capture
- Add explicit atomic capture of true gameplay `PREV` at transition start.
- Do not derive `PREV` from rolling stable-frame fallback.
- Capture:
  - clean render frame
  - debug frame
  - source geometry snapshot
  - perimeter-control-point state
  - changed-front metadata

#### 2. Transition-end `NEXT` capture
- Add explicit atomic capture of true gameplay `NEXT` at settle.
- Capture the same payload categories as `PREV`.

#### 3. Preserve stable geometry identity
- Replace synthetic region IDs in adapted source geometry with stable territory IDs.
- Split geometry identity into:
  - gameplay anchor star IDs
  - contributing virtual-site IDs
- Preserve upstream deterministic star-to-region membership.
- Do not overload `starIds` with virtual contributors when gameplay anchor identity is required.

### Phase 2. Shared Boundary-Control-Point Substrate

#### 4. Formalize the `V` substrate
- Define a shared boundary-control-point representation for transition work.
- For `perimeter_field`, this representation is the perimeter-vstar set sampled from source geometry.
- Include per-`V` fields for:
  - stable ID
  - owner
  - source region/shell/span identity
  - arclength position within span
  - tangent / normal
  - current position
  - strength / weight

#### 5. Preserve existing static perimeter-field display model
- Keep inward-offset perimeter-vstar sampling.
- Keep source geometry tuning surfaces.
- Keep DX midpoint behavior conceptually, but recast DX explicitly as gap-preservation logic.

### Phase 3. Changed-Front Selection

#### 6. Build changed-front extraction for `perimeter_field`
- Use contested topology / active-front information to isolate changed frontier chains for the conquest.
- Do not replace whole regions or whole loops.
- Derive affected local boundary spans from those changed chains only.

#### 7. Build affected-span boundary sampling
- From the changed-front result, extract local `PREV` and `NEXT` boundary spans.
- Sample `V`s at the inward offset along those spans.
- Everything outside affected spans remains static and identity-stable.

### Phase 4. Correspondence And Count Handling

#### 8. Preserve already-matching `V`s
- Walk `PREV` and `NEXT` affected spans in arclength order.
- If a `PREV V` and `NEXT V` match within MOE tolerance and local tangent/order compatibility, preserve the ID.
- These preserved `V`s do not become movers.

#### 9. Partition unmatched spans
- Remaining non-matching spans become unmatched transition spans.
- Do not run global nearest-neighbor across the whole region.

#### 10. Remesh unmatched spans locally
- For each unmatched `PREV` span and unmatched `NEXT` span:
  - compute span length
  - choose a target spacing
  - resample both spans to equal local count `K`
  - assign deterministic pair IDs `P00..PK`
- This solves count mismatch locally instead of globally.

#### 11. Pair monotonically by arclength
- Use order-preserving, monotone span-local correspondence.
- Do not use star-center angle matching.
- Do not use global greedy nearest-neighbor as the primary method.
- Greedy nearest-neighbor is allowed only as a local fallback inside a single already-isolated unmatched span, with crossing rejection and monotonicity constraints.

### Phase 5. Motion Path Planning

#### 12. Add constrained motion planning
- Default to straight-line motion only when it does not cross unrelated static frontiers.
- If a straight path crosses unrelated fronts, choose a curved or multi-segment route.
- Route selection order:
  1. straight
  2. shallow lane-biased arc
  3. stronger bow-away arc
  4. polyline arc / multi-segment fallback

#### 13. Add lane-aware shaping
- Use the victor-vanquished lane tangent to shape paths, not to determine correspondence.
- Expose tuneables for:
  - curvature amount
  - lane-bias strength
  - variance amplitude
  - variance scale by displacement
  - side bias

### Phase 6. Perimeter-Field Standard Transition Mode

#### 14. Implement the corrected default mode first
- This is the major mode implementation.
- It must use:
  - real `PREV`
  - real `NEXT`
  - changed-front selection
  - local unmatched-span remeshing
  - monotone pairing
  - constrained path routing

Acceptance condition:
- no ballooning at start/end
- frame `0` equals true `PREV`
- final pre-settle frame is visually near `NEXT`
- unchanged fronts stay static

### Phase 7. Firecracker Minor Transition Mode

#### 15. Add `firecracker` after the standard mode is correct
- `firecracker` is a minor variation on top of the corrected perimeter-field transition system.
- It does not change `PREV`/`NEXT`, changed-front selection, or correspondence.
- It changes temporal activation order only.

Definition:
- Find the active-front center or seed pair.
- Activate the center pair first.
- Then propagate outward left/right along ordered arclength.
- Ownership assertion / visual takeover ripples outward from the center.

Tuneables:
- propagation speed
- overlap amount
- left/right alternation bias
- local delay jitter
- random variance amplitude

### Phase 8. On-Map Diagnostics And Controls

#### 16. Add substrate-specific map diagnostics
- Add explicit toggles for:
  - Show MSR footprints
  - Show CX distributed samples
  - Show CX lane-pairs
  - Show DX midpoint gap-preservers
  - Show changed fronts
  - Show preserved `V` IDs
  - Show transition pair IDs
  - Show motion paths
  - Show rejected crossings

#### 17. Clarify source-tunable visibility
- Keep existing source controls.
- Make source tunables more directly inspectable with overlays so their effect is observable.

### Phase 9. Metaball Follow-On Work

#### 18. Do not try to â€œtune Metaball harderâ€ first
- Current Metaball is still too star-centered for source MSR/CX/DX to have decisive effect.
- Source MSR is not currently a strong first-order driver of Metaball geometry.

#### 19. Build geometry-following Metaball as a follow-on
- If Metaball is to achieve the same transition quality and source-geometry fidelity, add a derived boundary-control-point mode to Metaball.
- That mode should consume the same changed-front-driven transition substrate rather than invent its own star-centered transition heuristics.

This is later than the perimeter-field correction work.

### Phase 10. Recorder / Export Completion

#### 20. Finalize read-only capture/export
- Export two frame sets:
  - `render/` = clean gameplay truth
  - `debug/` = gameplay truth plus overlays
- Keep geometry in compact readable data, not baked into clean render frames.
- Name artifacts with:
  - datetime
  - attackerâ†’target identity
  - simultaneous conquest support

#### 21. Improve deterministic labeling
- Stable pair IDs for mover pairs
- explicit preserved/static IDs
- start/current/end coordinates in metadata
- loser/victor distinction derived from pair state, not color alone

---

## Public Interfaces / Types To Add Or Change

The implementation will need these explicit interface changes:

- geometry snapshot types must distinguish gameplay anchor identity from virtual-site contributor identity
- perimeter-control-point state type must become first-class
- transition capture payload must store true `PREV` / `NEXT` perimeter-control-point states
- changed-front selection output must identify affected spans
- transition pair metadata must be explicit and exportable

No implementation pass should leave these implicit.

---

## Testing And Acceptance Criteria

### Truth Tests
- Frame `0` scrub equals exact gameplay `PREV`
- `NEXT` capture equals exact settled gameplay state
- no synthetic export-only reconstruction path

### Identity Tests
- stable region identity survives source geometry adaptation
- gameplay anchor star identity is not polluted by virtual sites

### Transition Tests
- unchanged fronts do not move
- changed fronts move only inside affected spans
- preserved `V`s keep IDs
- unmatched spans remesh to equal local counts
- no star-center angle heuristic remains in the main correspondence path

### Motion Tests
- crossing detection blocks invalid straight paths
- arc/polyline fallback engages when required
- no unrelated frontier crossing in approved paths

### Visual Acceptance
- no start/end ballooning
- no snap at frame `0`
- no disjoint settle at the end
- firecracker mode reads as a propagation variant, not a different state model

### Diagnostic Acceptance
- clean render export has no baked debug geometry
- debug export contains readable pair labels and path overlays
- on-map overlays clearly show CX lane-pairs, DX midpoint behavior, and changed fronts

---

## Defaults And Chosen Assumptions

- Preferred source geometry: `power_voronoi_0319`
- DX intent: **preserve gap**
- Default MOE tolerance for preserved `V`s: `3px`
- Standard corrected perimeter-field mode comes before `firecracker`
- `firecracker` is a temporal activation mode layered on top of the corrected correspondence model
- Global nearest-neighbor pairing is not the main method
- Metaball geometry-following work is deferred until the corrected perimeter-field transition substrate exists

---

## Implementation Order

The required order is:

1. Atomic `PREV` / `NEXT` capture
2. Geometry identity cleanup
3. Shared boundary-control-point substrate
4. Changed-front selection
5. Preserved-`V` matching and unmatched-span remeshing
6. Monotone correspondence
7. Constrained motion routing
8. Corrected standard perimeter-field transition mode
9. On-map diagnostics for source tunables and transition state
10. Export cleanup
11. `firecracker` mode
12. Geometry-following Metaball follow-on

No step should be skipped or reordered unless the user explicitly changes priorities.

