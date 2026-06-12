# Post-Mortem: 2026-05-27 - HUD Refinement Quality Gap

## What Happened

The user reported that the HUD work was still messy: insufficient padding, hard-to-read typography, inconsistent button styling, partial/varied Overlay Legend borders, and improper iconography relative to the attached icon plan.

## Root Cause

Earlier work treated the HUD style conversion as complete while several surfaces still had compressed spacing, mixed icon names, old glyph-based controls, and inconsistent local border recipes.

## Impact

The UI still read as a collection of patched fragments instead of a coherent Aurelia Drift command HUD. The Overlay Legend was a concrete example: the shell and rows did not share one border grammar.

## Corrective Actions

- Audit visible HUD/settings icon use and replace mixed names/glyphs with semantic registry entries.
- Add a dedicated refinement layer for spacing, row rhythm, type line-height, and button sizing.
- Rebuild Overlay Legend with one rounded panel shell and consistent row control styling.
- Record the work in the session docs and handoff notes so merge does not erase the refinement layer.

## Lessons

- Visual QA must check padding, alignment, and component border grammar, not just whether controls render.
- Icon replacement is not complete until call sites use semantic registry entries and visible glyph fallbacks are removed from the touched path.
- A reference image requirement must be verified surface-by-surface; one polished area does not make the full HUD coherent.
