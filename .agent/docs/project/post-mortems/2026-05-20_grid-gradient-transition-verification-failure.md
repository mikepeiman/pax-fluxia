# Post-Mortem: 2026-05-20 - Grid Gradient Transition Verification Failure

## What Happened

Grid Gradient fill transition work was reported as implemented, but user verification showed no visible interpolation. The map still snapped PRE/POST.

## Root Cause

Validation proved that transition code existed and built, but did not prove the live Grid Gradient runtime received changing PREV/NEXT cells or rendered intermediate progress frames.

## Mistaken Reasoning

I treated family/shader implementation and tests as enough evidence for visible transition behavior. That missed the live dispatch cache that supplies the previous geometry snapshot.

## Diagnostic Method

Check live transition state during conquest: event count, active transition cell count, progress, clock source, backend, and fill style. Add a focused test that gives Grid Gradient distinct PREV/POST geometry and asserts active transition cells remain nonzero at intermediate progress.

## Impact

The user had to detect the failure visually. The report overstated confidence and increased review burden.

## Corrective Actions

- Treat live transition diagnostics as required evidence: event count, active transition cell count, progress, clock source, backend, and fill style.
- Freeze Grid Gradient previous-frame geometry during active transitions so PREV geometry is less likely to be overwritten by POST geometry.
- Add a focused test proving Grid Gradient produces active transition cells and advancing progress when given PREV/NEXT snapshots.

## Lessons

Compile success and static shader tests do not verify rendered transitions. For animation work, report only what was actually observed or directly asserted.

## Derived Rule

For rendering transitions, verify the live dispatch path preserves a distinct previous frame until the transition completes; do not infer that from renderer-local tests.
