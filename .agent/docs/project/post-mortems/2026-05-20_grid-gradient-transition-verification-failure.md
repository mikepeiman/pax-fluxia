# Post-Mortem: 2026-05-20 - Grid Gradient Transition Verification Failure

## What Happened

Grid Gradient fill transition work was reported as implemented, but user verification showed no visible interpolation. The map still snapped PRE/POST.

## Root Cause

Validation proved that transition code existed and built, but did not prove the live Grid Gradient runtime received changing PREV/NEXT cells or rendered intermediate progress frames.

Follow-up user diagnostics later proved the transition plan was present: `shader_field`, local transition clock, progress around `0.397`, and 455 active cells. The remaining failure was presentation-specific. The shader-field packer counted changed cells before the border-offset visibility rule, while the shader then discarded cells with `distanceBand <= 0` when offset was enabled. Changed cells in the offset band were therefore counted active but not drawn.

## Mistaken Reasoning

I treated family/shader implementation and tests as enough evidence for visible transition behavior. That missed the live dispatch cache that supplies the previous geometry snapshot.

I then treated `activeTransitionCells > 0` as evidence that transition cells were visible. It was only evidence that classification found changed cells.

## Diagnostic Method

Check live transition state during conquest: event count, active transition cell count, progress, clock source, backend, and fill style. Add a focused test that gives Grid Gradient distinct PREV/POST geometry and asserts active transition cells remain nonzero at intermediate progress.

After those diagnostics were positive but the user still saw no animation, inspect the packing-to-shader presentation path: packed distance band, border offset discard, transition role handling, mark size, and live draw stats.

## Impact

The user had to detect the failure visually. The report overstated confidence and increased review burden.

## Corrective Actions

- Treat live transition diagnostics as required evidence: event count, active transition cell count, progress, clock source, backend, and fill style.
- Freeze Grid Gradient previous-frame geometry during active transitions so PREV geometry is less likely to be overwritten by POST geometry.
- Add a focused test proving Grid Gradient produces active transition cells and advancing progress when given PREV/NEXT snapshots.
- When live diagnostics show active cells and progress but no visible animation, move to the shader/presentation path and make the changed-cell transition visually continuous across the full conquest duration.
- Keep transition cells drawable inside the Grid Gradient border-offset band while preserving offset suppression for steady native fill.
- Add live diagnostics that separate active changed cells from drawable changed cells and offset-zone changed cells.

## Lessons

Compile success and static shader tests do not verify rendered transitions. For animation work, report only what was actually observed or directly asserted.

An "active cells" counter is not sufficient if later presentation rules can discard those cells. Diagnostics must name the specific render survivability they claim.

## Derived Rule

For rendering transitions, verify the live dispatch path preserves a distinct previous frame until the transition completes; do not infer that from renderer-local tests.
