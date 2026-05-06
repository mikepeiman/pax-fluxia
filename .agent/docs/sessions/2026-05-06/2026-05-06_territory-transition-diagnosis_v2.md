# Territory Transition Diagnosis v2

## Scope

Record the first code checkpoint that directly answers the `v1` diagnosis:

- make active-front planning conquest-local
- remove forward/reverse duplicate paths before split classification

This document is still diagnostic. It records what changed and what evidence now exists.

## Files Changed

- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.test.ts`

## What Changed

### 1. Conquest-local anchor-pair gating

The planner no longer evaluates the full global union of stable-anchor pair keys when conquest events exist.

It now:

1. builds deduplicated PRE and POST chain sets
2. groups them by stable-anchor pair key
3. keeps only pair keys whose sections touch the captured or attacking stars from the conquest events

The local test data for this rule uses:

- captured star: `star-captured`
- attacker star: `star-attacker`
- one changed border pair
- one unrelated unchanged border pair

Result:

- only the changed border pair is planned
- the unrelated unchanged pair no longer inflates `pairCount`
- the unrelated unchanged pair no longer contributes a false `defect_no_change_span`

### 2. Directional deduplication before split classification

The planner now collapses geometry-identical chains before grouping and split detection.

This removes the specific failure where one foundational section appears twice:

- once forward
- once reverse

and then gets misread as a multi-path split.

Result:

- fake `2:2` split noise is removed before classification
- the planner sees one path where there is really one path

## Test Evidence

Added focused active-front tests:

1. `limits active-front planning to conquest-local anchor pairs`
   - verifies `pairCount = 1`
   - verifies `frontCount = 1`
   - verifies `defectNoChangeSpanCount = 0`

2. `dedupes forward and reverse copies of the same border before split classification`
   - verifies `pairCount = 1`
   - verifies `defectUnsupportedSplitCount = 0`
   - verifies `prevPathCount = 1`
   - verifies `nextPathCount = 1`

Validation run:

- `bunx vitest run pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`

## What This Does Not Yet Prove

It does not yet prove the visible gameplay result.

The old packages in `C:\Users\mikep\Downloads\...` were exported before this planner change, so they cannot show the new gating or deduplication effect.

The next required evidence is a fresh PVV4 playtest package captured after this checkpoint.

## Expected Visible Difference

On a fresh single-star conquest or small dual conquest, the planner should now:

- animate fewer unrelated borders
- spend less effort on unchanged distant anchor pairs
- stop misclassifying one border as a fake split because of forward/reverse duplication

The practical expectation is:

- more real moving fronts
- fewer classification defects
- visibly tighter changed-front motion around the actual conquest
