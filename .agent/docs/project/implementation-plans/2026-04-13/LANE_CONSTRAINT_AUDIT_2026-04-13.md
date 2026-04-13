# Lane Constraint Audit - 2026-04-13

## Purpose

Turn the lane-margin problem into a deterministic geometry audit on a frozen map, instead of guessing from live play.

## Frozen Map

- saved map: `common/resources/saved-maps/inner_circle_apr_13.json`
- working clearance definition:
  - center of non-endpoint star to lane centerline

## New Tooling

- command:
  - `bun run debug:lane-audit -- --saved-map common/resources/saved-maps/inner_circle_apr_13.json`
- outputs:
  - JSON
  - SVG snapshot
  - markdown summary
- key metrics per lane:
  - chord minimum clearance
  - final minimum clearance
  - closest blocking star
  - closest point on final lane
  - strict-vs-adjusted-vs-connectivity-override decision reason

## Deterministic Remap Rule

When a straight chord violates `Lane Margin`:

1. Find the exact nearest blocking star-to-lane witness.
2. Insert a vertex on that exact shortest path.
3. Push that vertex outward to the requested `Lane Margin`, and not beyond it.
4. Re-check the resulting lane.
5. If another blocker still violates the constraint, repeat deterministically on the new worst witness.

This replaces the earlier generic bulge-search behavior.

Correction applied in the follow-up pass:

- the first deterministic version over-pruned because it failed too early on multi-blocker cases
- the corrected version now:
  - iterates across multiple blockers on the same lane
  - uses a small explicit clearance epsilon to avoid floating-point reinsertion loops
  - converts angular remaps into curved lanes with conservative deterministic corner-rounding

## Deterministic Findings

### 1. False-positive curves were real

On the frozen map, lanes were being curved even when the straight chord already satisfied `Lane Margin`.

That failure is now eliminated in the audited sweep:

- `false_positive_curve = 0`
- `false_negative_straight = 0`
- `adjusted_but_still_violating = 0`

for the tested range below.

### 2. High LM creates a real graph-level conflict

All-pairs straight-chord feasibility on the frozen map:

- `LM 145` -> `49` valid straight edges, `components = 1`
- `LM 175` -> `18` valid straight edges, `components = 11`
- `LM 230` -> `5` valid straight edges, `components = 20`
- `LM 245` -> `1` valid straight edge, `components = 24`

So above roughly `175px` on this star layout, a graph made only of straight chords that satisfy `Lane Margin` is disconnected.

That is not a render bug. It is a geometry constraint fact on the frozen map.

## Encoded Hierarchy

The builder now follows this explicit order:

1. Full traversal connectivity is the winning constraint.
2. If a straight chord satisfies `Lane Margin`, keep it straight.
3. If a straight chord violates `Lane Margin`:
   - when Remap is enabled, try adjusted paths that satisfy the same clearance
   - when Remap is disabled, reject that specific lane and seek connectivity elsewhere
4. If the strict feasible graph is still disconnected, restore connectivity explicitly at the graph layer.
5. Lane-count targets remain weaker than the above.

The key change is that high-LM connectivity restoration is now explicit and auditable, not hidden accidental behavior.

## Frozen-Map Audit Sweep After Fix

- `LM 60`
  - `components = 1`
  - `54 straight`
  - `0 curved`
  - `0 connectivity overrides`
- `LM 90`
  - `components = 1`
  - `49 straight`
  - `5 curved`
  - `0 connectivity overrides`
- `LM 100`
  - `components = 1`
  - `48 straight`
  - `6 curved`
  - `0 connectivity overrides`
- `LM 145`
  - `components = 1`
  - `44 straight`
  - `3 curved`
  - `0 connectivity overrides`
- `LM 175`
  - `components = 1`
  - `28 straight`
  - `2 curved`
  - `10 connectivity overrides`
- `LM 230`
  - `components = 1`
  - `24 straight`
  - `0 curved`
  - `19 connectivity overrides`
- `LM 245`
  - `components = 1`
  - `24 straight`
  - `0 curved`
  - `23 connectivity overrides`

## Follow-up Validation

After correcting the over-pruning regression in the first deterministic version:

- `LM 100`, adjusted style `curved`
  - `components = 1`
  - `54 connections`
  - `48 straight`
  - `6 curved`
  - `0 audit violations`
- `LM 175`, adjusted style `curved`
  - `components = 1`
  - `31 connections`
  - `22 straight`
  - `9 curved`
  - `9 explicit connectivity-restoration edges`
  - `0 audit violations`

## Current Interpretation

- The original erratic solver behavior is now replaced by deterministic behavior on the frozen map.
- The remaining issue is no longer hidden randomness.
- The remaining issue is policy:
  - how should explicit connectivity-restoration edges be surfaced and diagnosed once strict feasible lanes are exhausted?
