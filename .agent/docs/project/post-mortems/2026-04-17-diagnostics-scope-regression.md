# Post-Mortem: 2026-04-17 - Diagnostics Scope Regression

## What Happened

I unified diagnostics entry points, but I mounted the entire `PerimeterFieldTuning` surface inside the diagnostics panel instead of only its diagnostics-specific controls. That put source, field, and transition tuning into Diagnostics even though those controls belong in the Territory panel.

## Root Cause

I solved the navigation problem before enforcing control ownership. `PerimeterFieldTuning` already mixed tuning and diagnostics modules, and I reused it wholesale instead of constraining it to a diagnostics-only subset. I also failed to account for persisted module visibility state, which could further distort what the diagnostics panel showed.

## Impact

- Diagnostics showed non-diagnostic territory controls.
- The new unified surface violated the user's explicit requirement to move only diagnostics-specific tools and settings.
- It created another round of avoidable user-facing churn immediately after a consolidation patch.

## Corrective Actions

- Added a `visibleModules` constraint to `PerimeterFieldTuning`.
- Made single-module mode render that module unconditionally instead of depending on persisted all/none/module state.
- Updated `PerimeterFieldDiagnosticsPanel` to request only the `diagnostics` module.

## Lessons

- When reusing a mixed-scope component, do not assume the host surface will imply the right subset. Constrain it explicitly.
- UI consolidation work must preserve control ownership, not just entry-point count.
- If the user says “move only diagnostics-specific tools and settings,” treat that as a hard surface-boundary rule, not a general direction.
