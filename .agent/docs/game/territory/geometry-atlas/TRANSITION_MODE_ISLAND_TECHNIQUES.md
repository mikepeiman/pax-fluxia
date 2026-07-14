# Transition-MODE Island — Technique Capture (IP absorption before deletion)

> **Island deleted 2026-07-14.** Sole root: the unwired `TransitionLayerCoordinator`
> (the transition-mode registry / plan / sample machinery was never wired into the
> shipped render path — the live conquest transition runs through
> `ActiveFrontTransition.ts` under fill mode `pv_frontline`; see
> `PVFRONTLINE_TRANSITION_TECHNIQUE.md`).
>
> **Archive = git history.** Nothing is preserved on disk after the delete.
> **Recovery:** `git checkout <pre-deletion-commit> -- <path>`, where the last commit
> that still contained the island is **`8eb0adc24`** (HEAD at capture time, 2026-07-14).
> Example: `git checkout 8eb0adc24 -- pax-fluxia/src/lib/territory/layers/transition/modes/ActiveFrontFillMode.ts`
>
> This document is an IP-absorption pass under ruling Q29: capture WHAT each dead
> technique tried and WHY it earned the user-authored verdict — *"vertex-correspondence
> lerp was NEVER reliable"* — so the code can be deleted without losing the lessons.
> All files are read-only; nothing here was edited.

## Scope

These are the historical attempts at conquest fill/border morphing that predate the
shipped PowerCore kinetic sweep. Files captured (all under
`pax-fluxia/src/lib/territory/layers/transition/`):

| File | Lines | Role |
|---|---|---|
| `modes/ActiveFrontFillMode.ts` | 773 | Frontier-graph "active front" fill morph (the big one) |
| `interpolatePolylines.ts` | 306 | CDF / optimal-transport resampling + lerp utilities |
| `modes/OptimalTransportBorderMode.ts` | 125 | Border morph via `interpolatePolylines` |
| `modes/RopeMorphBorderMode.ts` | 39 | Border "morph" that is actually a snap-to-target |
| `modes/CrossfadeFillMode.ts` | 39 | Fill "morph" that is actually a snap-to-target |
| `planners/TerritoryTransitionPlanner.ts` | 24 | Two thin `mode.plan()` pass-through wrappers |
| `registry.ts` | 22 | Mode arrays + id→mode maps |
| `FillTransitionMode.ts` / `BorderTransitionMode.ts` | 7 each | Type re-exports from `contracts/TransitionContracts.ts` |
| `modes/AlphaCrossfadeFillMode.ts` | 1 | alias re-export |
| `modes/OptimalTransportCorrespondenceBorderMode.ts` | 1 | alias re-export |
| `modes/RopeInterpolatedBorderMode.ts` | 1 | alias re-export |

**Not part of the island (LIVE, staying):** `ActiveFrontTransition.ts` and its
`lerpArcAligned` engine — documented separately in `PVFRONTLINE_TRANSITION_TECHNIQUE.md`.

---

## 1. `ActiveFrontFillMode` — Active Front Interpolation (fill)

**Mode id `active_front`.** Object literal implementing `FillTransitionMode`
(`ActiveFrontFillMode.ts:383`). The file header (`:1-53`) states its purpose:
*"Gap-free territory transitions by interpolating only the changed frontiers … then
rebuilding region polygons from the next FrontierTopology on every frame."* Its own
comment (`:7`) says it **replaces the broken OT polygon morph `FrontierMorphFillMode`**
(that predecessor is `frontier_morph`, tagged *"legacy OT — broken"* in
`TerritoryModeSelection.ts:8`; the file itself is already gone).

### 1. What the player would have seen
During a conquest, only the **boundary that actually moves** (the front between the two
owners whose border shifted) animates; every other border stays put. Because both owners
share the *same* animated curve, the map remains a gap-free planar partition at every
frame — no slivers or overlaps opening between neighbours. New territory that had no prior
frontier (`matchedPrevChain === null`) appears to **grow outward from its centroid** rather
than pop in (`:517-529`). Nearly-static fronts are frozen (`:557`).

### 2. Algorithm precise enough to rebuild

**PLAN (once per transition, `:387-600`):**
- Gather every `ownerPairKey` (e.g. `"ai-2|ai-3"`) present in the previous OR next
  `FrontierTopology` (`:404-413`).
- For each pair, build ordered **front chains** in both topologies
  (`buildFrontChainsForPair`, `:245-351`): a greedy walk over that pair's
  `FrontierSection`s, seeded from an arbitrary unused section and grown at both head and
  tail by matching `startVertexId`/`endVertexId`, flipping a section's orientation
  (`reversed`) when its endpoints face the wrong way (`:294-336`).
- Match each NEXT chain to its nearest PREV chain by **centroid distance** (mean of all
  vertices), greedily, each prev used at most once (`:433-470`). This is deliberately
  robust to section-id reshuffles (`:430`).
- Concatenate the NEXT chain's oriented section point arrays into one polyline
  `nextPoints`, recording the `[startIndex, endIndex]` span each section occupies
  (`appendPolyline`, `:161-184`; span capture `:488-496`).
- Build the PREV counterpart polyline; if none matched, fill it with N copies of the NEXT
  centroid so the front "expands from a point" (`:517-529`).
- **Correspondence sampling:** build cumulative arc-length tables for both
  (`buildArcLengthTable`, `:93-105`), then for each NEXT vertex `i` compute its normalized
  arc-fraction `u = nextTable.cumulative[i] / nextTable.total` and sample the PREV polyline
  at that same `u` (`samplePolylineAtParam`, `:110-147`). Result: `prevAtNextParam[i]`, the
  start position paired to `nextPoints[i]`.
- **Static skip:** mean per-vertex displacement `meanDisp = Σ dist(prevAtNextParam[i],
  nextPoints[i]) / n`; if `meanDisp < MIN_MEAN_FRONT_DISPLACEMENT` (`0.25` world px,
  `:381`) the front is treated as static and not recorded as active (`:551-565`).

**SAMPLE (every frame, `:606-730`):**
- `t = clamp(ctx.progress, 0, 1)`. Fallbacks: `t>=1` or no prev topology → rebuild from
  NEXT topology; `t<=0` → rebuild from PREV topology (`buildFrameFromTopology`, `:741-773`).
- Per active front, per vertex: `pts[i] = lerpPoint(prevAtNextParam[i], nextPoints[i], t)`
  (`:626-632`) — a straight linear interpolation of the paired points.
- Slice each section's piece back out of its front using the recorded span
  (`frontPoints.slice(startIndex, endIndex+1)`, `:638-642`).
- Rebuild every `RegionLoop` from the NEXT topology by stitching section polylines in loop
  order, honouring each `SectionRef.direction` (`forward` vs reversed, `:667-670`), using
  interpolated geometry for active-front sections and NEXT geometry for static ones
  (`:661-663`).
- Drop degenerate loops (`< 3` points) and micro-regions (`|signedArea| < MIN_REGION_AREA
  = 10 px²`, `:688-692`).

### 3. Correspondence strategy & failure mode
**Arc-length resample correspondence** (not vertex pairing, not transport matching): PREV
is resampled at NEXT's normalized arc-length parameters, so both owners share one animated
curve. This is the *same* family the live engine's `lerpArcAligned` uses
(`ActiveFrontTransition.ts:546-566`) — see §"Relation to the live engine". The correspondence
is only as good as (a) the centroid chain-match and (b) the assumption that arc-fraction `u`
on PREV maps to the right place on NEXT. When a front **splits or merges** (one chain
becomes two, or two collapse to one), centroid matching pairs the wrong chains and the
uniform-`u` sampling smears points along the wrong path — the exact "vertex-correspondence
lerp was NEVER reliable" failure. The code carries live-debugging scars of this:
`[ActiveFront:MATCH]` / `[ActiveFront:PLAN]` / `[ActiveFront:FRAME]` `console.log`s and a
per-frame **winding-flip** diagnostic that warns when a rebuilt loop's `signedArea` sign
disagrees with the expected outer-loop sign (`:700-727`) — i.e. it was catching loops that
invert (turn inside-out) mid-morph. The live engine later replaced the naïve centroid match
with explicit split/merge handling (`splitByNearest` / `mergeByNearest`,
`ActiveFrontTransition.ts:568-590`), which is precisely the capability this dead mode lacks.

### 4. Genuinely novel / worth keeping
The **per-region orchestration** is what this mode ADDS over the bare `lerpArcAligned`
kinetic lerp; if `active_front`-style whole-map fill morphing is ever revived, reuse:
- **Section-span bookkeeping** (`appendPolyline` returning `{startIndex,endIndex}`, `:161`)
  that lets one interpolated front be sliced back into per-section polylines and re-stitched
  into loops — this is the "interpolate the shared frontier once, reuse for both owners"
  trick that guarantees planarity.
- **Collapsed-front-from-centroid** growth for pure insertions (`:517-529`).
- The **winding-flip guard** (`:700-717`) as a cheap correctness monitor for any loop-morph.
- `kernelSignedArea` winding use: it imports `signedArea` from
  `geometry/kernel/polygonArea` (`:68`) and its local `signedArea` (`:151-154`) is a thin
  guard (`<3` pts → 0) over the kernel — **already de-duplicated onto the kernel**, no debt.

---

## 2. `interpolatePolylines.ts` — CDF / optimal-transport resampling primitives

### 1. What the player would have seen
This is a utility module, not a mode; its visible effect is via `OptimalTransportBorderMode`
(§3). Header principle (`:5`): *"Borders Lead, Fills Follow."* Drifted borders morph
smoothly and monotonically (points don't cross); spawned/vanished borders fade from/to their
midpoint.

### 2. Algorithm precise enough to rebuild
- `buildArcLengthCDF(points)` (`:49-70`): cumulative Euclidean length per vertex, normalized
  to `[0,1]` (`cdf[0]=0`, `cdf[last]=1`) — the arc-length **CDF**.
- `evaluateAtArcFraction(points, cdf, u)` (`:76-101`): binary-search the CDF for the segment
  containing `u`, then linearly interpolate within it. (Binary search — contrast with
  `ActiveFrontFillMode`'s linear scan `samplePolylineAtParam`.)
- `otInterpolatePolyline(prev, next, t, sampleCount)` (`:107-127`): the core morph. For each
  of `sampleCount` output samples at `u = i/(sampleCount-1)`, evaluate BOTH polylines at the
  same `u` and lerp: `result[i] = (1-t)·prevAt(u) + t·nextAt(u)`. This is **1-D optimal
  transport under arc-length parameterization** — monotone `u→u` coupling, which the header
  (`:16`) claims guarantees non-self-intersecting intermediates.
- `matchPolylinesByKey(prev, next)` (`:133-222`): groups both sides by `ownerPairKey` and
  classifies each pair `static | drifted | spawned | vanished`. Spawned = only-in-next
  (prev synthesized as two copies of the next polyline's `polylineMidpoint`); vanished =
  only-in-prev (next synthesized as the prev midpoint); when a key has different segment
  counts on each side, extras are matched **by array index** (`:157-190`).
- `interpolateMatchedPolylines(...)` (`:228-266`): `t<=0`→clone prev, `t>=1`→clone next;
  else run OT on drifted/spawned/vanished, pass through static (`sampleCount =
  max(prev.len, next.len, 4)`).

### 3. Correspondence strategy & failure mode
**Arc-length CDF transport** for the geometry, but **array-index matching** for pairing
multiple segments that share an `ownerPairKey` (`:157`). Index matching is the weak link:
when the *number* of border segments for a pair changes between frames, or their order
reshuffles, index `i↔i` pairs unrelated segments and the morph jumps. The commit history
records this class of bug directly: **`68432145e` "CRITICAL FIX: multimap deduplication bug
in production transition — GeometryTopologyDiff, interpolatePolylines, CorrespondencePlanner
all silently dropped duplicate segments"**. The whole approach was introduced by
**`632bd2319` "feat: CDF-based 1D optimal transport interpolation for border transitions"**
and the broader snap/interpolation family was reverted at least once —
**`7c72caed6` "revert: snap-to-target transition modes — broken interpolation reverted"**.

### 4. Duplicate-of-kernel check
The geometry **kernel exports only `shoelace` / `signedArea` / `polygonArea` and the Chaikin
family** (`geometry/kernel/index.ts:6-13`); it has **no arc-length / resampling primitive**.
So `buildArcLengthCDF` + `evaluateAtArcFraction` are **NOT duplicated in the kernel** — but
they ARE a *third, parallel* copy of the same idea that already exists twice more in the tree:
- `ActiveFrontFillMode.buildArcLengthTable` / `samplePolylineAtParam` (`:93`, `:110`) — same
  math, un-normalized table + linear scan.
- The LIVE `ActiveFrontTransition.buildArcLengthTable` / `samplePolylineAtParam` (imported by
  its `lerpArcAligned`).
- Also related: `geometry/geometryUtils.resampleClosedPolygonBySpacing` (`:105`) walks the
  perimeter at equal arc-length intervals (fixed *spacing*, not fixed *fraction*).

**Worth keeping / promoting:** `evaluateAtArcFraction`'s **binary-search** segment lookup is
the most efficient of the three arc-length samplers (the others linear-scan). If a shared
`geometry/kernel/arcLength.ts` primitive is ever created to collapse these three-plus copies,
lift the binary-search form from here. That consolidation is the one concrete piece of
reusable IP in this module; everything else is superseded by the live `pv_frontline` engine.

---

## 3. `OptimalTransportBorderMode` — Optimal-Transport Correspondence Border

**Mode id `optimal_transport`** (`OptimalTransportBorderMode.ts:17`). Class implementing
`BorderTransitionMode`. Aliased as `OptimalTransportCorrespondenceBorderMode` (see §7).

### 1. What the player would have seen
Only the borders (owner-vs-owner frontier lines, `kind === 'owner_border'`) animate; fills
are not this mode's concern. Unchanged (topologically identical) borders are drawn static;
changed borders morph via OT; appearing/vanishing borders fade from/to a midpoint.

### 2. Algorithm
`plan()` (`:20-30`) just snapshots prev + next `FrontierTopology`. `sample()` (`:32-124`):
1. **Match by section id.** For each NEXT `owner_border` section whose id exists in PREV,
   pass it through **unchanged** (`:53-69`) — comment `:57-58` explicitly assumes *"strict
   topological identity means strict geometric identity"* (no lerp even if it drifted).
2. Group the unmatched NEXT and unmatched PREV sections by `ownerPairKey` (`:64-79`).
3. Per key, walk `max(nextCount, prevCount)` and call `otInterpolatePolyline` (§2):
   spawned → morph from `[mid,mid]`; vanished → morph to `[mid,mid]`; drifted → morph
   prev→next matched **by array index** (`:82-121`, note `:109-111`).

### 3. Correspondence strategy & failure mode
Two-tier: **exact section-id identity** for the stable majority, **arc-length OT + array-index
pairing** for the localized changed boundary. The comment at `:110-111` rationalizes the index
heuristic ("only affects the localized, newly drawn boundary"), but it inherits
`interpolatePolylines`' index-pairing fragility (§2.3) and the same `68432145e` dedup bug. Its
tier-1 assumption — that an unchanged section id means unchanged geometry — is exactly the
kind of "strict identity" premise the winding/drift debugging in `ActiveFrontFillMode` shows
does not always hold.

### 4. Novel? No. Thin orchestration over `interpolatePolylines`; nothing to keep beyond §2.

---

## 4. `RopeMorphBorderMode` — "Rope-Interpolated Border" (SNAP, not a morph)

**Mode id `rope_morph`** (`RopeMorphBorderMode.ts:15`). Aliased as
`RopeInterpolatedBorderMode` (§7).

### 1–3. What it does
Despite the "morph"/"interpolated" name, this is a **snap-to-target**: `plan()` stores
`input.nextGeometry.frontierPolylines` (`:24`); `sample()` **ignores `ctx.progress`
entirely** (param named `_ctx`, `:32`) and returns the target frontiers verbatim (`:34-37`).
**Correspondence: none** — there is no interpolation, so the border simply pops to its final
shape. This is one of the "snap-to-target transition modes" the git log flags as broken:
**`7c72caed6` "revert: snap-to-target transition modes — broken interpolation reverted"**.

### 4. Novel? No — it is a placeholder/degenerate mode.

---

## 5. `CrossfadeFillMode` — "Alpha Crossfade Fill" (SNAP at the geometry layer)

**Mode id `crossfade`** (`CrossfadeFillMode.ts:15`). Aliased as `AlphaCrossfadeFillMode` (§7).

### 1–3. What it does
`plan()` stores `input.nextGeometry.territoryRegions` (`:24`); `sample()` **ignores
`ctx.progress`** (`_ctx`, `:30`) and returns the target regions verbatim (`:33-37`).
**Correspondence: none — crossfade by design** (no vertex correspondence at all). The intent
was that a *renderer* would alpha-blend old fill over new; at the geometry layer this mode
emits only the final regions, so on its own it snaps. It is the honest "no-morph" baseline —
the thing every correspondence attempt was trying to beat.

### 4. Novel? No — intentional degenerate/baseline mode.

---

## 6. `TerritoryTransitionPlanner` & the two 7-line contract re-exports

- `planners/TerritoryTransitionPlanner.ts` (`:12-24`): `planFillTransition` /
  `planBorderTransition` are one-line wrappers that call `mode.plan(input)`. No logic —
  an indirection seam only.
- `modes/FillTransitionMode.ts` / `modes/BorderTransitionMode.ts` (7 lines each): pure
  `export type` re-exports of the real contracts from `contracts/TransitionContracts.ts`.
  No IP.

---

## 7. Registry map — mode id → class → alias id(s)

From `registry.ts` (`:8-16`) and `TerritoryModeSelection.ts:7-18`.

**Fill transition modes** (`FILL_TRANSITION_MODES`):

| mode id | implementing symbol | file | alias re-export |
|---|---|---|---|
| `active_front` | `ActiveFrontFillMode` (object literal) | `modes/ActiveFrontFillMode.ts` | — (registered directly) |
| `crossfade` | `CrossfadeFillMode` → `AlphaCrossfadeFillMode` | `modes/CrossfadeFillMode.ts` | `modes/AlphaCrossfadeFillMode.ts` (registry imports the alias) |

`FillTransitionModeId` also declares `frontier_morph` (*legacy OT — broken*, deleted),
`unified_topology`, and the LIVE `pv_frontline` / `off` — none of which are in this island's
registry array.

**Border transition modes** (`BORDER_TRANSITION_MODES`):

| mode id | implementing symbol | file | alias re-export |
|---|---|---|---|
| `optimal_transport` | `OptimalTransportBorderMode` → `OptimalTransportCorrespondenceBorderMode` | `modes/OptimalTransportBorderMode.ts` | `modes/OptimalTransportCorrespondenceBorderMode.ts` |
| `rope_morph` | `RopeMorphBorderMode` → `RopeInterpolatedBorderMode` | `modes/RopeMorphBorderMode.ts` | `modes/RopeInterpolatedBorderMode.ts` |

Lookup maps `FILL_TRANSITION_MODE_BY_ID` / `BORDER_TRANSITION_MODE_BY_ID` (`registry.ts:18-22`)
key these by `mode.id`. The default selection (`DEFAULT_TERRITORY_MODE_SELECTION`,
`TerritoryModeSelection.ts:33-39`) is `fillTransitionMode: 'pv_frontline'`,
`borderTransitionMode: 'off'` — i.e. **none of these island modes is the default**; the
shipped path is `pv_frontline` (live `ActiveFrontTransition`), confirming the island is dead.

---

## Relation to the live engine (context, not re-documented)

`ActiveFrontFillMode` (dead) and `ActiveFrontTransition` (live, `pv_frontline`) are the **same
technique family**: per-owner-pair front chains, arc-length-parameter resampling of PREV at
NEXT's fractions, straight lerp of the paired points. The dead mode's `buildArcLengthTable`,
`samplePolylineAtParam`, `lerpPoint`, `distance`, `appendPolyline` are duplicates of the live
engine's identically-named helpers. What the dead `ActiveFrontFillMode` **adds** over the live
`lerpArcAligned` is the **whole-map fill orchestration**: section-span slicing, loop
re-stitching from `FrontierTopology`, centroid chain-matching, static-front culling, and the
winding-flip guard. What it **lacks** is the live engine's explicit split/merge correspondence
(`splitByNearest` / `mergeByNearest`) — the very feature that made naïve centroid matching
unreliable. That gap is the concrete embodiment of the verdict *"vertex-correspondence lerp
was NEVER reliable."*

## Git verdict trail (cited)
- `632bd2319` feat: CDF-based 1D optimal transport interpolation for border transitions — introduces `interpolatePolylines`.
- `7c72caed6` revert: snap-to-target transition modes — broken interpolation reverted — the snap family (`rope_morph` / `crossfade` behaviour).
- `68432145e` CRITICAL FIX: multimap deduplication bug … interpolatePolylines … silently dropped duplicate segments.
- `34fc23e6c` Refactor: Convert Frontier morphs to Topological Segment matching.
- `31ce7739e` feat(territory): Wire ActiveFrontFillMode into transition pipeline — the (later unwired) wiring.
- `61c405ba2` perf: cull legacy fill modes and remove ship throttling.
- Verdict on `frontier_morph`: *"legacy OT — broken"* (`TerritoryModeSelection.ts:8`); `ActiveFrontFillMode.ts:7` states it replaced that broken mode.
