# Territory Transition Playtest Findings v1

## Summary

Current conclusion: the branch is better instrumented, but the exported evidence still supports the user's visible judgment. There is not yet a clear gameplay-level transition improvement.

The reason is simple:
- too few active fronts are actually planned
- too many pair keys still land in topology gaps, unsupported splits, or no-change-span outcomes

That means the system can be more truthful internally without yet looking meaningfully better during play.

## Package 1

- package:
  - `C:\Users\mikep\Downloads\19-07-58---665`
- conquest:
  - `star-14: human-player -> ai-5`
  - `star-21: ai-4 -> ai-3`
- summary:
  - fronts: `2`
  - collapse targets: `4`
  - stable anchors: `30`
  - pair keys: `38`
  - planned pairs: `2`
  - topology gaps: `4`
  - unsupported splits: `15`
  - no-change-span pairs: `17`
  - active sections: `3`
- casebook hints:
  - `TC-02`
  - `TC-05/TC-06`
  - `TC-07`
- verdict:
  - `fail`
- reason:
  - false collapse pressure is still present
  - only `2` of `38` pair keys produced animated fronts
  - this is too little active transition coverage to create a convincing visible result

## Package 2

- package:
  - `C:\Users\mikep\Downloads\15-27-15---056_transition-diagnostic-package`
- conquest:
  - `star-26: ai-5 -> ai-4`
  - `star-27: ai-4 -> ai-3`
- summary:
  - fronts: `2`
  - collapse targets: `0`
  - stable anchors: `21`
  - pair keys: `31`
  - planned pairs: `2`
  - topology gaps: `3`
  - unsupported splits: `4`
  - no-change-span pairs: `22`
  - active sections: `17`
- casebook hints:
  - `TC-02`
  - `TC-07`
- verdict:
  - `fail`
- reason:
  - the conquest avoids false collapse, but still only `2` of `31` pair keys become active fronts
  - the transition logic is still dominated by non-moving or defective classifications

## Interpretation

These packages explain why the user sees no visible gameplay improvement:
- the branch may now export more truth
- the branch may now classify defects more honestly
- but the share of frontiers that actually animate remains too small

The current deficit is not just visual polish. It is transition coverage.

## Next Diagnostic Target

Use this protocol on fresh captures from the current branch, in this order:
1. `TC-01 simple 1:1 conquest`
2. `TC-02 dual conquest`
3. `TC-03 split 1:2`
4. `TC-04 merge 2:1`

Each fresh capture should be judged with:
- the visual frame sequence
- the package summary output
- freeze-on-unclassified behavior
