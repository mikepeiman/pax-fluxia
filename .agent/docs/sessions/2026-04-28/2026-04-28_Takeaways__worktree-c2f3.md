# Merge Note

- source worktree: `c2f3`
- source commit: `cad080942cd19c311f7954fe342e3213663ce1dd`
- merge intent: fold deltas into the canonical unsuffixed master doc, do not overwrite it

# 2026-04-28 Takeaways â€” worktree `c2f3`

## Principles Confirmed

- Semantic naming is a functional correctness issue, not cosmetic polish.
- User-facing and code-facing names should either match exactly or clearly represent the same thing.
- A control that exists in more than one editable location is a design bug unless ownership is explicit and intentional.
- A pinned mode must hide irrelevant controls rather than explaining away contradictory UI.
- Diagnostics is a product surface, not a catch-all junk drawer for unrelated controls.

## Key Findings

- The missing diagnostics quick-access button is a wiring/ownership bug, not a styling bug.
- The current subsection-chip model is driven by implicit DOM scanning, which explains why nested territory groups do not behave like proper Settings subsections.
- The recorder bundle export path can produce output even while the visible bundle list stays stale, indicating a UI-state/reactivity bug rather than missing capture data.
- `Ruler OFF` currently disables input without clearing persisted ruler state.
- The active Power Voronoi path still leaks `canonical` naming across ids, summaries, and diagnostics kinds.
- The direct-runtime territory stack already behaves like a single surface-transition system; the separate `border transition` concept is mostly stale contract and UI residue.
- Route-shell diagnostics and in-game diagnostics are different lifecycle layers. The data path for startup failures is useful, but the always-visible floating `Shell diag` dock is not.
- Failure-only startup diagnostics is the right disclosure level for route-shell telemetry; default-visible dev overlays are too invasive even when the underlying data is useful.
- `USE_RENDER_FAMILIES` had collapsed to a misleading Settings-only gate with no meaningful clean-runtime routing role, so complete removal was lower risk than keeping it as dead compatibility theater.
- In `metaball_grid`, late worker-plan availability must not be allowed to reuse scheduler progress directly or the family will miss the transition window and snap.

## Applied Lessons

- Hiding irrelevant controls is not enough; the chip/navigation layer must be mode-aware too, or it still lies about what is available.
- Derived-geometry subpanels must not own shared topology tuning just because they depend on it.
- â€œFix the lagâ€ for heavy tuning controls means staging the UI change first and moving the expensive compile onto a bounded follow-up commit path.
- Diagnostics becomes much more usable once bundles, live mode state, ruler state, and compile state live in the same Settings-owned surface.
- When runtime behavior and contract vocabulary diverge, the UI starts lying. That semantic drift must be treated as an architecture bug, not a wording bug.
- Once a compatibility gate no longer protects a real runtime branch, it should be deleted from config, persistence, debug summaries, and fingerprints in the same pass or it will keep lying through residue.
- For async conquest families, the visible animation clock must belong to the family once the plan is ready; otherwise off-thread plan latency leaks straight into visible snaps.

