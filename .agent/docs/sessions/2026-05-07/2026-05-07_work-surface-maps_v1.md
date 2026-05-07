# Work Surface Maps v1

Date: 2026-05-07
Branch: `codex/render-infra/pvv4-transition-bets`

## Prompt

The user asked for a quick, effective agentic practice: when I find a critical seam like the bundle generator, I should turn that into a reusable artifact with file and function references instead of re-finding it later.

## Implemented

1. Added standing thinking rules:
   - create a work surface map before the second pass in a subsystem
   - convert discovered seam knowledge into a reusable artifact the same day

2. Added process doc:
   - `.agent/docs/project/process/work_surface_maps.md`

3. Added first live map:
   - `.agent/docs/project/process/work-surfaces/active-front-export-overlay.md`

## Purpose

This gives one quick seam map for the current work area:

- scope
- entry points
- key files
- line references
- data flow
- hot edit seams
- known traps

## Result

The active-front export / overlay area now has a reusable artifact instead of relying on memory or repeated file hunting.
