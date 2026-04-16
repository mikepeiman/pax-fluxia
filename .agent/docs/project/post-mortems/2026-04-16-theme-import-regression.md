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
