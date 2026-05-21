# Feature And Task Queue - 2026-05-20

## Purpose

Make Grid Gradient conquest fills visibly transition instead of snapping PRE/POST, using the dot-grid fill behavior the user requested.

## Active

- Grid Gradient fill transitions: user reports zero visible interpolation. Current fix freezes Grid Gradient previous-frame geometry during active transitions and adds a family test proving PREV/NEXT input yields changing cells and advancing local progress.
- Required verification: live UI must show `transitionEventCount > 0`, `activeTransitionCells > 0`, progress advancing between `0` and `1`, `fillStyle=pointillist`, and the expected visible dot growth/fade.
- User diagnostics after the cache fix showed `shader_field`, `plan ready`, progress `0.397`, and 455 active cells, but still no visible transition. This moved the target from transition planning to presentation strength.
- Current pass changes Grid Gradient fills to a global dual-pass for changed cells: old-owner dots use `1 - progress`, new-owner dots use `progress`, so every changed cell participates for the full conquest duration.
- Follow-up diagnosis found the active-cell counter was ahead of the border-offset presentation rule: changed cells inside the offset band were counted active, then discarded by the shader before drawing. Current work keeps transition cells drawable in that band and adds `active / drawable / offset-zone` live stats.
- Documentation correction: this exact daily queue is now the active queue path. The earlier topic-specific queue filename is being removed from this branch and its still-relevant points are represented here and in the session/takeaway docs.
- Local validation for this pass: focused Grid Gradient tests passed and `bun run build` in `pax-fluxia/` passed with existing unused-CSS and chunk-size warnings. Live visual verification is still required.

## Follow-Up

- Do not create additional topic-specific session notes for this work unless the user explicitly requests an artifact or the change introduces a new architecture contract.
- Maintain the existing issue inventory in the daily session folder until it can be consolidated without losing user feedback.
- Start border transitions only after fill transitions are visually accepted.
- Keep Grid Gradient pinned to the validated geometry source unless a future change proves another source produces the same joined/blended border quality.
- Treat vector-border defects separately from optional dotted-border presentation. Different presentations must sample the same accepted border geometry.
