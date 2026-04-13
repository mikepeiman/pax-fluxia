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

## Deterministic Findings

### 1. False-positive curves were real

On the frozen map, lanes were being curved even when the straight chord already satisfied `Lane Margin`.

That failure is now eliminated in the audited sweep:

- `false_positive_curve = 0`
- `false_negative_straight = 0`
- `adjusted_but_still_violating = 0`

for the tested range below.

### 2. Strict straight-only connectivity becomes impossible at high LM

All-pairs straight-only feasibility on the frozen map:

- `LM 145` -> `49` valid straight edges, `components = 1`
- `LM 175` -> `18` valid straight edges, `components = 11`
- `LM 230` -> `5` valid straight edges, `components = 20`
- `LM 245` -> `1` valid straight edge, `components = 24`

So above roughly `175px` on this star layout, full traversal connectivity and strict straight-only LM compliance cannot both be satisfied at once.

This is not a render bug. It is a geometry constraint fact on the frozen map.

## Encoded Hierarchy

The builder now follows this explicit order:

1. Keep a straight lane if its chord satisfies `Lane Margin`.
2. If the chord fails and remap is enabled, try adjusted paths that satisfy `Lane Margin`.
3. If the strict feasible graph is still disconnected, preserve traversal connectivity with an explicit best-clearance straight connectivity override.
4. Lane-count targets remain weaker than connectivity.

The key change is that connectivity override is now explicit and auditable, not a hidden accidental behavior.

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

## Current Interpretation

- The original erratic solver behavior is now replaced by deterministic behavior on the frozen map.
- The remaining design question is no longer "why is the solver random?"
- The real design question is:
  - how aggressive should connectivity override be once the strict feasible graph disappears?

That is now a policy choice, not a hidden bug.
