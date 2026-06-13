---
date created: 2026-06-13
last updated: 2026-06-13
last updated by: AI
relevant prior docs:
  - .agent/docs/engineering/DESIGN_SYSTEM_TOKENS.md
---

# Post-Mortem: 2026-06-13 — Third-namespace deletion left dangling app.css refs

## What Happened
While unifying the token namespace, I deleted the deprecated third-namespace
token *definitions* (`--color-*`, `--space-*`, `--radius-*`, `--font-*`,
`--transition-*`, `--glass-*`, `--glow-*`, `--border-*`) from `app.css`, but
left ~70 *references* to them inside `app.css`'s own global utility classes and
base rules (`body`, `.font-display`, `.btn`, `.glass-panel`, `.input`, `.tab`,
animations, scrollbar). Those refs became dangling (undefined custom property →
silent fallback). `bun run check` and `bun run build` both passed, so nothing
flagged it. The landing page (which uses `class="font-display"`, `.btn`, etc.)
would have rendered with fallback fonts/colors/spacing.

## Root Cause
When inventorying third-namespace consumers I saw `app.css` in the file list and
mentally classified it as "the definitions file." I missed that `app.css` is
**both** the definer **and** a heavy consumer (its global utility classes
reference the same tokens lower in the file). I migrated `landing-site/*.svelte`
and `RangeDual.svelte`, then deleted the defs — without migrating app.css's own
rules first.

## Impact
None shipped. Caught proactively before rewriting Hero copy, by tracing the
`.font-display` class the Hero consumes. Live regression existed only on the
working branch for a few commits; fixed in the same session.

## Diagnostic Method
About to rewrite the Hero, I noticed it uses `class="headline font-display"` and
asked whether `.font-display` (defined in app.css) still resolved after I deleted
`--font-display`. Grepped app.css for `var(--<deleted-token>)` → found ~70
dangling refs → applied the same `--pax-*` mapping to app.css → re-grepped the
whole live tree to confirm zero dangling refs.

## Corrective Actions
- Migrated all of app.css's utility/base rules to `--pax-*` (commit alongside).
- Re-verified: zero dangling deleted-token refs in live code; check + build pass.

## Lessons
1. **A file can both define and consume tokens.** When deleting definitions,
   grep the *same file* for consumers, not just other files.
2. **A passing CSS build does NOT prove token refs resolve.** `var(--undefined)`
   is silent. After deleting any CSS custom property, explicitly
   `grep` the tree for dangling `var(--deleted)` references — that grep is the
   real gate, not the build.
3. Migrate *all* consumers (including global utility classes) **before**
   deleting the definitions, so the tree is never in a silently-broken state.
