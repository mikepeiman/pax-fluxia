# Restore Whole State

When reverting to a prior working commit:

1. **Restore ALL files changed since that commit**, not just one. A bug can live in any file in the diff.
2. Use `git diff --name-only <working-commit> HEAD` to see every changed file.
3. Restore them all with `git checkout <commit> -- <file1> <file2> ...`
4. If unsure which commit worked, **try it** — that's what version control is for.

## Post-Mortem: Single-File Restore Failure (2026-03-06)

**Error:** Restored only `DistanceFieldTerritoryRenderer.ts` from commit `55fe8fe` while territory alignment bug could have been caused by changes in game config, settings UI, star data packing, or container positioning — any of the other files that changed.

**Root cause:** Tunnel vision on the renderer file because that's where border code lives. Failed to consider that "territory-starmap alignment" involves the full pipeline: star positions → data texture → mesh geometry → container placement → shader.

**Rule:** When a user says "go back to the working version," that means the FULL working state, not one file.
