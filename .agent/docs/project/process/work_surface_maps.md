# Work Surface Maps

This is the quick-and-dirty system for area-of-work seam maps.

## Rule

When work enters a subsystem for a second real pass, create or update one work surface map for that area.

## Purpose

Stop re-finding the same files, functions, and call paths.

## Required Sections

1. Scope
   - what exact area this map covers

2. Entry points
   - where the area is entered from live runtime or UI

3. Key files
   - file path
   - line reference
   - function or symbol
   - why it matters

4. Read / write flow
   - what data comes in
   - what data goes out

5. Hot edit seams
   - the smallest places most likely to need edits

6. Known traps
   - previous mistakes
   - misleading nearby seams

## Naming

Put maps in:

- `.agent/docs/project/process/work-surfaces/`

Name them by work area, not by date.

Examples:

- `active-front-export-overlay.md`
- `region-disappearance.md`
- `geometry-constraints.md`

## Update Rule

Update the map when:

- a new entry point is found
- a seam moves
- a previous trap is exposed
- a new primary edit site is discovered

## Standard

Keep it short.
It is a seam map, not a design document.
