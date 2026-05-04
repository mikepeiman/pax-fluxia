# Territory Transition Snapshot Recorder â€” User Specification

**Date:** 2026-03-24
**Status:** Planned â†’ Phase 1 implementation pending

## Objective

Whenever a conquest event occurs, automatically generate a dated debug bundle containing:
- Previous state screenshot
- Next state screenshot
- Screenshots with changed-frontier overlays
- Screenshots with planner/anchor overlays
- Metadata JSON describing the conquest and computed change set

This is **debug tooling only**. It must not affect gameplay logic, geometry truth, or transition output.

> [!IMPORTANT]
> For `perimeter_field`, recorder output must come from the real live family path. No synthetic replay renderer, export-only reconstruction, or side-effecting offscreen re-render is acceptable.

## Trigger

Use `OwnershipSnapshot.conquestEvents` as the primary trigger. For each conquest event, create one debug bundle keyed by timestamp, tick, transition id, starId, previousOwner, newOwner.

For simultaneous conquests, the bundle identity and exported filenames must include all participating conquest star-pair identifiers.

## Output Structure

```
debug/territory-transitions/YYYY-MM-DD/HHmmss_star-{starId}_{previousOwner}_to_{newOwner}_{transitionId}/
â”œâ”€â”€ 00-prev.png
â”œâ”€â”€ 01-next.png
â”œâ”€â”€ 02-prev-changed-frontiers.png
â”œâ”€â”€ 03-next-changed-frontiers.png
â”œâ”€â”€ 04-plan-anchors.png
â”œâ”€â”€ 05-plan-rings.png
â”œâ”€â”€ 06-composite.png
â””â”€â”€ meta.json
```

Plus top-level manifest: `debug/territory-transitions/index.json`

## Overlay Colors

- Changed frontier: thick red (5-8px)
- Unchanged matched frontier: thick green (3-5px)
- Inserted frontier: orange
- Deleted frontier: purple
- Anchors: cyan circles (6-10px radius)
- Conquered star: yellow marker
- Labels: white/bright contrasting

## Phase 1 Acceptance

- prev/next screenshots
- changed-frontier overlays
- conquest marker
- metadata JSON
- folder creation + manifest update

## Phase 2 Enhancements

- Planner anchor overlays from PatchMorphPlan
- Ring diagnostics overlays from AnimatedRingPlan.diagnostics
- Multi-frame capture across transition progress (t=0, .15, .35, .5, .65, .85, 1.0)
- Per-mode comparison folders
- Optional frontier-mask / raster-diff debug images

## `perimeter_field` Recorder Rules

- `PREV` must be captured from the real gameplay frame immediately before the conquest transition begins.
- `NEXT` must be captured from the real gameplay frame immediately after the transition settles.
- Every scrub frame must be a captured live gameplay frame, not a reconstructed debug surrogate.
- Diagnostic overlays may be generated for inspection, but they must not replace the clean gameplay capture in artifacts that are intended to represent gameplay truth.
- Diagnostics must be read-only and must never alter live gameplay rendering as a side effect of capture.

