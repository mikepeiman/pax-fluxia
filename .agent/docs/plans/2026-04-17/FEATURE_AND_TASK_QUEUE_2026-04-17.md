# Feature And Task Queue - 2026-04-17

## Purpose

Unify territory and transition diagnostics into one actual user-facing diagnostics surface, with a direct bottom-right entry point, and stop splitting recorder exports and perimeter-field diagnostics across unrelated panels.

## Active Tasks

- Collapse the floating transition debug panel and perimeter-field diagnostics into one diagnostics destination.
- Remove perimeter-field diagnostics controls from the Territory settings panel while keeping territory tuning there.
- Remove duplicate recorder/package controls from the Debug settings section and leave only a direct link into the unified diagnostics panel.
- Restore a bottom-right diagnostics icon and add the same entry path to the mobile quick menu.
- Verify the UI compiles and commit the unified diagnostics slice.

## Implemented

- Added a single floating diagnostics destination by embedding perimeter-field diagnostics inside `TransitionDebugPanel.svelte` and retitling it as the unified diagnostics surface.
- Removed the perimeter-field diagnostics subsection from Territory settings while preserving source, field, and transition tuning there.
- Replaced the old Debug-section recorder/package controls with a single `Open Diagnostics` entry point.
- Added a bottom-right diagnostics button and a mobile quick-menu diagnostics entry.
- Verified the slice with `bun x tsc --noEmit -p tsconfig.json`.

## Corrections

- Restricted the diagnostics panel to the diagnostics-only module from `PerimeterFieldTuning` after the first unification patch incorrectly exposed non-diagnostic source, field, and transition controls there.
- Added a post-mortem at `.agent/docs/project/post-mortems/2026-04-17-diagnostics-scope-regression.md`.
