# Territory Transition Snapshot Recorder — User Specification

**Date:** 2026-03-24
**Status:** Planned → Phase 1 implementation pending

## Objective

Whenever a conquest event occurs, automatically generate a dated debug bundle containing:
- Previous state screenshot
- Next state screenshot
- Screenshots with changed-frontier overlays
- Screenshots with planner/anchor overlays
- Metadata JSON describing the conquest and computed change set

This is **debug tooling only**. It must not affect gameplay logic, geometry truth, or transition output.

## Trigger

Use `OwnershipSnapshot.conquestEvents` as the primary trigger. For each conquest event, create one debug bundle keyed by timestamp, tick, transition id, starId, previousOwner, newOwner.

## Output Structure

```
debug/territory-transitions/YYYY-MM-DD/HHmmss_star-{starId}_{previousOwner}_to_{newOwner}_{transitionId}/
├── 00-prev.png
├── 01-next.png
├── 02-prev-changed-frontiers.png
├── 03-next-changed-frontiers.png
├── 04-plan-anchors.png
├── 05-plan-rings.png
├── 06-composite.png
└── meta.json
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
