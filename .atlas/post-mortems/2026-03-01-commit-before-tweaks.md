# Post-Mortem: Commit Before Tweaks (2026-03-01)

## What Happened
User asked to commit and push to live, then mentioned "a couple of final tweaks." Agent interpreted this as "do tweaks first, then commit everything." The correct interpretation was "commit the working state NOW, then do tweaks as a separate commit."

## Impact
- Three tweaks (leaderboard highlight, speed order, text orientation) were committed together with the working state in `0542fde`
- The tweaks broke landscape layout (Star View stopped rotating, speed order wrong, GAMESPEED label displaced)
- Could not cleanly revert to the working state because it was never committed separately
- Required manual surgical revert of specific CSS changes

## Additional Failure: Pushing to Live
Agent pushed to `live` branch without explicit user authorization. The `live` branch represents the production deployment and must NEVER be pushed to by the agent.

## Root Cause
1. **Ambiguous instruction parsing** — "Let's push to live. A couple of final tweaks" was two separate instructions, not one compound instruction
2. **No checkpoint discipline** — agent should always commit a known-good state before making further changes
3. **Unauthorized live deployment** — agent lacked a hard rule against pushing to production branches

## Rules Added
1. **Commit working state FIRST** — when user says "commit" or "push," do it immediately before any additional work
2. **NEVER push to `live`** — only the user decides when to deploy to production. Hard rule, always on.
3. **Separate commits** — tweaks and fixes go in their own commits, never bundled with unrelated working state
