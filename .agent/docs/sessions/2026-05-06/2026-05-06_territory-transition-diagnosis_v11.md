# Territory Transition Diagnosis v11

## Package analyzed
- `C:\Users\mikep\Downloads\12-52-27---742_cq_s27_a4-a3_tdp`

## Finding
- This package is **not** the 2-star snap case.
- It contains:
  - `1` planned active front
  - `8` additional conquest-local anchor pairs with `no_change_span`
  - `0` topology gaps
  - `0` unsupported splits
- The overlay paused because the planner still treated `no_change_span` as a classification defect.

## Meaning
- The overlay was rendering truthful pair diagnostics.
- The planner/evaluation layer was misclassifying normal unchanged local pairs as defects.
- That caused:
  - `AF eval: classification_defect`
  - `freezeOnUnclassifiedBoundary`
  - misleading overlay text: `no-span defects`

## Code correction
- `no_change_span` is now treated as a normal classified outcome, not a defect.
- It remains visible in diagnostics as `no-motion pairs`.
- Real defect states remain:
  - topology gap
  - unsupported split
  - any actual defect sections

## User-visible expectation
- A normal conquest with one planned front plus nearby unchanged local pairs should:
  - stay in `animated_fronts`
  - not freeze on first conquest
  - still show the overlay and labels

## Next playtest target
- Re-test the actual `2-star -> 1-star` case now that the false freeze is removed.
