# 2026-05-05 Territory Transition Casebook v1

## Purpose

This casebook is the fixed conquest test set for the territory runtime recovery work.

Each case answers:

1. what exact map situation is under test
2. what the geometry layer should produce
3. what the transition layer should produce
4. what counts as a defect

This is not a plan document. It is the branch's stable reference set for judging correctness.

## Status Vocabulary

- `defined`
  - the case exists and its expected result is written down
- `captured`
  - at least one real diagnostic package has been attached to the case
- `accepted`
  - current runtime behavior is correct enough for this case
- `failed`
  - current runtime behavior is known to be wrong for this case

## Case Template

Each case should eventually carry:

- `Case ID`
- `Short Name`
- `Status`
- `Conquest shape`
- `Geometry expectation`
- `Transition expectation`
- `Constraint relevance`
- `Known defect signatures`
- `Reference packages`

## Locked Cases

### TC-01 - Simple 1:1 Conquest

- Status: `defined`
- Conquest shape:
  - one star changes owner
  - one continuous changed frontier span
- Geometry expectation:
  - plain power-Voronoi shape with only local adjustments
- Transition expectation:
  - one local active front
  - unchanged border tails stay fixed
- Constraint relevance:
  - none required by default
- Known defect signatures:
  - whole-region drift
  - broad section transport
  - false collapse

### TC-02 - Dual Conquest

- Status: `defined`
- Conquest shape:
  - two stars change owner on the same tick
  - separate or weakly interacting changed frontier spans
- Geometry expectation:
  - both local changes appear in the same post-conquest map
- Transition expectation:
  - each changed frontier span is classified and animated independently
  - unrelated regions do not collapse or birth
- Constraint relevance:
  - none required by default
- Known defect signatures:
  - collapsing ghost regions
  - whole-map continuity errors

### TC-03 - Split 1:2

- Status: `defined`
- Conquest shape:
  - one pre-conquest frontier branch becomes two post-conquest branches
- Geometry expectation:
  - 3-way junctions are respected as structural facts
- Transition expectation:
  - split is handled explicitly and locally
  - no broad “activate everything” fallback
- Constraint relevance:
  - none required by default
- Known defect signatures:
  - whole-section motion
  - missing branch classification

### TC-04 - Merge 2:1

- Status: `defined`
- Conquest shape:
  - two pre-conquest branches become one post-conquest branch
- Geometry expectation:
  - structural junctions remain coherent
- Transition expectation:
  - merge is handled explicitly and locally
  - no whole-region translation
- Constraint relevance:
  - none required by default
- Known defect signatures:
  - path collapse to wrong center
  - branch mismatch

### TC-05 - Single-Star Final Region Disappearance

- Status: `defined`
- Conquest shape:
  - a region containing exactly one star disappears on that tick
- Geometry expectation:
  - that region is absent in POST
- Transition expectation:
  - collapse to star center
  - no birth elsewhere
- Constraint relevance:
  - none required by default
- Known defect signatures:
  - centroid collapse
  - whole-region drift before collapse

### TC-06 - Multi-Star Final Region Disappearance

- Status: `defined`
- Conquest shape:
  - a region containing multiple stars disappears entirely on that tick
- Geometry expectation:
  - that region is absent in POST
- Transition expectation:
  - default mode is per-star collapse
  - no whole-region birth elsewhere
- Constraint relevance:
  - none required by default
- Known defect signatures:
  - single centroid collapse when not selected
  - unrelated loop collapse

### TC-07 - Topology Gap

- Status: `defined`
- Conquest shape:
  - a pre/post structural section exists on one side only
- Geometry expectation:
  - the section difference is real and localized
- Transition expectation:
  - diagnostics must classify the gap
  - freeze mode must stop on any unclassified section
- Constraint relevance:
  - none required by default
- Known defect signatures:
  - silent snap
  - hidden unclassified boundary

### TC-08 - DX Trigger

- Status: `defined`
- Conquest shape:
  - two same-owner stars are not lane-connected
  - midpoint territory incorrectly joins them
- Geometry expectation:
  - explicit disconnect zone removes the false corridor
- Transition expectation:
  - transition uses corrected geometry, not false corridor geometry
- Constraint relevance:
  - `DX`
- Known defect signatures:
  - same-owner blob bridge without a lane

### TC-09 - LP Contested Lane

- Status: `defined`
- Conquest shape:
  - a lane is contested by exactly two players
- Geometry expectation:
  - only those two players occupy that lane
- Transition expectation:
  - conquest changes along that lane remain owned by the two lane players only
- Constraint relevance:
  - `LP`
- Known defect signatures:
  - third-player intrusion onto a contested lane

### TC-10 - MSR Intersection

- Status: `defined`
- Conquest shape:
  - a border would otherwise cut too close to a star
- Geometry expectation:
  - border is rewritten around the star's protected range
- Transition expectation:
  - transition follows corrected local border geometry
- Constraint relevance:
  - `MSR`
- Known defect signatures:
  - border inside the protected star range
  - jagged vertex push instead of one coherent rewritten section

## Current Use

The first use of this casebook is:

1. truth-export work
2. geometry-constraint normalization
3. freeze-on-unclassified diagnostics
4. PV transition rebuild

No transition-quality claim should be accepted unless it is stated against one or more of these cases.
