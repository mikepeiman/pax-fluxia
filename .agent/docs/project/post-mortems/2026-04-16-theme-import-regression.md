# Post-Mortem: 2026-04-16 - Theme Import Regression And Premature Closeout

## What Happened

I reported the theme import and routing audit as effectively complete, but the imported themes did not reproduce correctly in the live app. The user verified that most imported themes did not switch render modes correctly, while a recent explicit-mode theme still mostly worked.

I also missed the repo-local process rule in `.agent/AGENT.md` to commit a working state first.

## Root Cause

- I treated legacy boolean render-mode themes as if they would still activate through fallback during apply.
- That assumption was wrong because the live config already carries an explicit `TERRITORY_RENDER_MODE`, so older themes that omit that key inherit the current renderer instead of falling back.
- I audited static theme files instead of tracing the actual apply path against current live config semantics.
- I closed out before user verification, which violated the repo rule that user observations are ground truth.

## Impact

- Imported themes were grouped and reported incorrectly.
- The user lost trust in the audit because the real app behavior did not match the report.
- Time was lost on a misleading diagnosis.

## Corrective Actions

- Trace theme apply semantics end-to-end instead of auditing theme JSONs in isolation.
- Normalize legacy themes to explicit `TERRITORY_RENDER_MODE` on load/import/apply so they are self-contained under the current config model.
- Re-audit imported themes using effective apply semantics, not raw-file assumptions.
- Do not claim fixed without user verification.
- Follow the repo-local commit-first rule once a real working state is re-established.

## Lessons

- A legacy fallback is not real compatibility if another explicit state key preempts that fallback.
- Static config analysis is insufficient when behavior depends on merge semantics with existing live config.
- "Implemented" is not "works" until the user verifies the observed app behavior.

## Addendum - Theme Apply Runtime Gap

- I later misframed the branch screenshot mismatch instead of immediately auditing the mounted vs unmounted theme-apply paths.
- The concrete defect was that `themeStore.applyTheme()` used a raw config-write fallback whenever `GameSettingsPanel` was unmounted, while the mounted-panel callback also synchronized visuals, runtime stores, and background events.
- Derived rule: if a feature can be invoked from a control outside the component that owns the canonical side effects, move those side effects into a shared runtime path before diagnosing renderer internals.

## Addendum - Geometry Misdiagnosis

- I then made a second obvious diagnostic mistake by blaming commander/ownership drift after the user had already stated the same map and owner-regions were being compared.
- The actual geometry divergence was stale paused-render state: `GameCanvas.svelte` was using a hand-built `territoryConfigFp` that omitted multiple perimeter-field geometry keys, so imported theme values could be written to config and shown in the UI while the old region boundaries remained on screen.
- Derived rule: when the user says "same settings, different render," audit cache keys and invalidation before attributing the difference to simulation input.
