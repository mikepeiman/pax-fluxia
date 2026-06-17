---
name: design-protocol
description: Run BEFORE any UI/design work (panels, controls, layouts, components, styles). A procedural design-reasoning protocol that forces explicit thinking and a fixed set of questions, so whole classes of defects (duplicated labels/values, boxes-in-boxes, nested scroll, instinct edits) are caught up front. Use whenever creating or refining any interface surface, or when the user reports a visual/UX defect.
---

# Design Protocol

A short, mandatory reasoning pass for any interface work. You do NOT need a screenshot to design — you need to think. Screenshots verify; reasoning designs. Run this protocol first, write the answers down (briefly), THEN edit.

## When to run
- Creating or changing any panel, control, row, layout, component, or style.
- Diagnosing any visual/UX complaint ("too busy", "doubled", "nested", "ugly", "doesn't fit").
- Before claiming a UI change is done.

## Step 0 — Ground in reality by SEARCH (not assumption)
Per AGENT.md RULE 0: grep the whole repo for the on-screen text, the class/selector, and the component. Find the data source that drives what's rendered (e.g. a rail driven by `SETTINGS_TOOLS`, not `SETTINGS_SECTIONS`). Determine the cascade/specificity winner from evidence. Do not proceed on a guess.

## Step 1 — The seven questions (answer ALL, every time)
1. **One job.** What is the single purpose of this surface/control? What is the minimum UI that does it?
2. **Information inventory.** List every piece of text/number/icon shown. Is anything DUPLICATED — label shown twice, value shown twice, the same control labelled by both a wrapper and an inner component? Collapse every duplicate to one.
3. **Containers & nesting.** How many borders/boxes nest here? How many independently-scrolling regions result? Targets: **one scroll surface per panel**; **no box inside a box**. Grouping comes from spacing → dividers → typography, and only then a border.
4. **Hierarchy.** Is the most important thing the most prominent? Are label, value, and control in a scannable order (e.g. `Label … value` on one line, control below)?
5. **Consistency.** Does this match the pattern sibling controls/panels already use? If it diverges, either conform or fix the pattern everywhere — never add a third variant.
6. **States & affordances.** Hover, active, disabled, focus, empty, overflow/long-text — are they all handled and obvious? Are interactive targets large enough and not overlapping (e.g. a nudge button that steals the slider's hit area)?
7. **Completeness.** Does the surface expose every control the feature needs, with sensible icons and ordering? What's missing?

## Step 2 — Decide, then act minimally
State the intended end-structure in one or two sentences (the markup/elements and where the single label, single value, single scroll live). Make the smallest set of edits that realizes it. Prefer fixing a shared component/pattern once over editing many call sites inconsistently.

## Step 3 — Verify
- Re-search to confirm no stray rule/duplicate remains (e.g. grep the selector again).
- `bun run check` for type/markup soundness.
- Report as "implemented; please verify" with a precise prediction of what the user will see and what is intentionally unchanged. Never claim done without evidence (AGENT.md §2.2).

## Anti-patterns this protocol exists to kill
- Editing on instinct before tracing the real source.
- A border around every control (boxes-in-boxes); a scroll inside a scroll.
- The same label/value rendered by both a wrapper row and the inner control.
- Claiming a rail/menu item exists after editing a list the renderer doesn't read.
