# Feature And Task Queue - 2026-05-20

## Purpose

Make Grid Gradient conquest fills visibly transition instead of snapping PRE/POST, using the dot-grid fill behavior the user requested.

## Active

- Grid Gradient fill transitions: user reports zero visible interpolation. Current fix freezes Grid Gradient previous-frame geometry during active transitions and adds a family test proving PREV/NEXT input yields changing cells and advancing local progress.
- Required verification: live UI must show `transitionEventCount > 0`, `activeTransitionCells > 0`, progress advancing between `0` and `1`, `fillStyle=pointillist`, and the expected visible dot growth/fade.
- Documentation correction: this exact daily queue is now the active queue path. The earlier topic-specific queue filename is being removed from this branch and its still-relevant points are represented here and in the session/takeaway docs.
- Local validation passed for the focused Grid Gradient test set and `bun run build`; live visual verification is still required.

## Follow-Up

- Do not create additional topic-specific session notes for this work unless the user explicitly requests an artifact or the change introduces a new architecture contract.
- Maintain the existing issue inventory in the daily session folder until it can be consolidated without losing user feedback.
- Start border transitions only after fill transitions are visually accepted.
- Keep Grid Gradient pinned to the validated geometry source unless a future change proves another source produces the same joined/blended border quality.
- Treat vector-border defects separately from optional dotted-border presentation. Different presentations must sample the same accepted border geometry.
