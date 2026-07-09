# Transition rebuild proposal — pre-split border semantics on the post-split backend

**Date:** 2026-07-09 · **Status:** PROPOSED, awaiting user approval · **Author:** opus-territory session

## User ruling (the ground truth this responds to)

- `2eecc5564` (pre-split-arch) and `a2ff7ed5e` (immediately post-split-arch) are BOTH visually
  superior to current HEAD and every intermediate commit.
- Wanted: the **relationship of borders and cells to the transition sweep** from the pre-split
  version, on the **backend architecture** of the post-split version, keeping the few recent
  improvements. Subsequent work is not declared wasted — it feeds the rebuild.

## What each reference actually is (verified by reading both commits)

**`2eecc5564` — pre-split.** The conquest split happened in the GEOMETRY domain: each frame's
cells arrived already split (the captured cell = an old-owner piece + a new-owner piece), and
`buildSurfaceFromCells` graphed + smoothed those split cells. Consequence — the property the user
wants back: **fills and borders are both projections of ONE smoothed surface, and the moving front
is a first-class inter-owner frontier in that surface.** The front got the same chain-aware
smoothing, the same junction pinning, the same 50/50 color blend as every other border. The old
attacker↔defender border stayed drawn automatically (the ahead piece still carried the old owner,
so that edge was still a real frontier). Nothing was clipped, suppressed, matched, or re-stroked.
The family's morph render was ~20 lines: `buildSurfaceFromCells(cells)` → draw `cellFills` +
`frontiers` + `worldBorders`. Its one defect: the split entering/leaving the graph changed chain
topology → the START/COMPLETION SNAP (proven 33.75px single-frame jump) — the reason
split-after-smoothing was built.

**`a2ff7ed5e` — the split-after-smoothing commit.** Cells stay UNSPLIT through graph + smoothing
(settled chain topology all morph → completion changes nothing → no snap). The split moves to
presentation: the captured cell's SMOOTHED fill is cut by the front into old/new pieces; the
old-owner (ahead) piece gets its whole outline stroked. Borders drawn = the settled POST frontier
set + that outline. Its defects (user-reported at the time): the settled POST border pops in at
conquest start (duplicated border), seam blemishes where the outline meets borders.

**The 8 commits after it** (`c033e8c23` … `d5048b6c7`) each fixed a named defect by adding a
presentation-layer CORRECTION on top of the settled border set: clip the rim border 'behind' the
front, stroke only the front, exact anchors, dissolving old border matched by rim proximity and
gated to radial mode, plus the PRE→POST smoothing-continuity blend. Each fix was locally justified;
the ENSEMBLE reads worse than both references. Root cause of the degradation: the drawn borders
come from the SETTLED (POST) classification and are then patched toward what the frame should
show. Pre-split never patched anything — its classification was already per-frame.

## The design error, named

Split-after-smoothing correctly moved the split's GEOMETRY out of the graph. It also — incorrectly
— left border CLASSIFICATION on settled ownership, then re-simulated live classification with
overlays (suppress + stroke + dissolve + proximity-match). The changing domain during a conquest is
the OWNERSHIP LABELING of the captured cell, so the labeling is what must be evaluated per frame.
Geometry: settled (post-split backend). Labels: live (pre-split semantics).

## Proposal

### Keep (unchanged)

1. **Post-split backend** (`a2ff7ed5e` core, still current): unsplit one-diagram kinetic frames,
   `fronts` as data, settled chains through smoothing, early completion (`MORPH_COMPLETE_AT`),
   multi-morph one-diagram, cheap endpoint commit + deferred snapshot rebuild, retry-jitter,
   stitch fallback.
2. **Exact front math** in `conquestFrontField.ts` — `splitCellByFrontDetailed` (exact crossing
   endpoints + `frontChains`), exact disk∩polygon walk, area-conservation guard,
   `frontFieldForRing` / `clipPolylineByFront`. This kernel is what the rebuild classifies with.
3. **Acceptance-gate suite** (`smoothMorphFrame.proof.test.ts`) — extended, see below.
4. **Today's four non-transition commits** (restart reset `5c17e8210`, surge tick-binding
   `2a389a7e1`, HUD tick slider + section memory `8f343c5de`, docs) — orthogonal, keep.
5. `TERRITORY_SURFACE_BORDER_BLEND: true` (user-confirmed; present in both references).

### Discard (delete, not disable)

All post-`a2ff7ed5e` presentation border machinery in `PowerVectorFamily` +
`buildSurfaceFromCells`:

1. `c033e8c23` — settled-rim clipped 'behind' the front (suppression).
2. `91ed27f69`/`62cb2d495`/`de8933c8b` — the front-only overlay STROKE pass (the exact-anchor
   MATH survives inside the kernel; the special-cased rendering goes).
3. `d5048b6c7`/`27dfa4842` — `dissolvingFrontiers`, rim-proximity matching, the radial-mode gate.
   The behavior they bought (old border persists ahead of the front) falls out of classification
   for free.
4. **Held in reserve, initially OFF:** `bb2ad073c` smoothing-continuity blend. It fixed a real
   reported defect (cells re-rounding at conquest start) but is inside the degraded span, so it
   does not get grandfathered in. Recommendation: rebuild without it, user checks; re-enable only
   if the start-reshape defect reappears.

### Rebuild: live-label border classification (one stage, after smoothing)

A single new stage in `buildSurfaceFromCells`, running only for cells with an active front
(~1–3 cells/frame — cost trivial next to the diagram + smoothing):

1. Split the captured cell's smoothed rim at the exact front crossings (existing kernel math) into
   a BEHIND part (labeled new owner this frame) and an AHEAD part (labeled old owner this frame).
2. Re-classify every border edge touching the captured cell from these LIVE labels:
   - edge vs neighbor on the AHEAD part → pair (neighbor, OLD owner) → frontier iff owners differ.
     This IS the old attacker↔defender border persisting until the front passes — automatic.
   - edge vs neighbor on the BEHIND part → pair (neighbor, NEW owner) → frontier iff owners differ.
     The attacker's own edge stops being a border exactly as the front passes — no duplicated POST
     border, no suppression.
   - an edge straddling a crossing is split there (exact field crossing — fills and borders share
     anchors by construction).
   - world edges stay world borders on both parts.
3. Emit the front arc itself as a first-class frontier with pair (old, new) — same stroke, width,
   alpha, and 50/50 blend rule as every other frontier. Full-length from frame 1 (it is the
   boundary of the ahead region, not a growing stroke).
4. Fill pieces come from the same split (ahead = old color, behind = new color) — unchanged from
   the current pipeline.

The family's morph render then RETURNS TO THE PRE-SPLIT SHAPE: draw `surface.cellFills` +
`surface.frontiers` + `surface.worldBorders`. All conquest special-casing leaves the family.

**Boundary behavior (the correctness argument):**
- first frame of the conquest (q=0): ahead part = whole cell → classification = exactly the PRE
  border set. No pop-in possible.
- completion (q=1, at 92% of the window): ahead part = empty → classification = exactly the POST
  border set = what the settled state draws. No snap possible.
- multi-conquest, same owner pair: classification is per captured cell with its own front — the
  cross-front matching problem (rim proximity) ceases to exist.
- two ADJACENT in-flight captured cells sharing an edge: classify that edge against both fronts
  (split at both crossings). Rare; bounded; covered by a fixture.

### New acceptance gates (formalizing the user's ruling)

- **PRE gate:** border set at q=0 == the PRE settled frontier set (within stroke epsilon).
- **POST gate:** border set at q≥`MORPH_COMPLETE_AT` == the POST settled frontier set, byte-stable.
- Existing gates retained: crossing-jump < 2px both ends, front endpoints == rim crossings exact,
  per-cell tiling.
- Fixtures: `kinetic_independent_conquests`, a same-pair double conquest, an adjacent-double
  conquest, both front modes (linear AND radial — lesson: gate in the mode the feature serves).

### Execution order (one change at a time, user sign-off is the only gate)

1. Classification stage + gates, family simplification — single commit, tests green.
2. User visual check vs both reference commits (same casebook: conquest start, mid, completion,
   third-party borders, island capture, multi-conquest tick).
3. Continuity-blend decision (only if start-reshape reappears).
4. Only after sign-off: delete the dead overlay code paths + retired helpers.

## Risks / honesty

- The pre-split front was Chaikin-smoothed by the graph; the rebuilt front arc is the raw field
  curve (radial arc is inherently smooth; linear front is straight). If the user perceives a
  difference at the front line itself, a one-pass smooth of the front chain (pinned at the exact
  crossings) is a contained follow-up.
- The start-reshape defect (`bb2ad073c`'s reason to exist) may reappear with the blend off — that
  is a deliberate A/B, not an oversight.
- Both references also predate `d5048b6c7`'s radial-mode default experience; the user runs
  radial. Classification is mode-agnostic by construction, but the casebook must be run in radial.
