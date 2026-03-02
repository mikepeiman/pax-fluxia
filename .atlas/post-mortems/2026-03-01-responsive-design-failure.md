# Post-Mortem: Responsive Design — CSS Patches vs Actual Redesign

**Date**: 2026-03-01
**Severity**: Process failure (repeated correction needed)

## What Happened

When asked to implement landscape mobile sidebars and a fullscreen drawer overlay, the agent applied CSS patches (hiding text, changing widths, repositioning elements) without actually redesigning the layout for each orientation. This resulted in:
1. Theme selector kept as a vertical element in landscape mode despite horizontal space being abundant
2. Leaderboard stretched too wide in landscape (max-width 400px when 280px was appropriate)
3. Multiple rounds of user correction before getting it right

## Root Cause

The agent treated "responsive design" as "hide things and change positions" rather than "rethink the layout for each context." Desktop-first thinking leaked into mobile work — elements were repositioned but not reimagined.

## Extracted Rule: Responsive Design Protocol

When adapting UI between orientations or breakpoints:

1. **Budget the constraint axis first** — landscape = height is scarce, portrait = width is scarce. Count pixel budget before writing any CSS.
2. **Reflow, don't just reposition** — if an element was vertical (stacked), ask: should it be horizontal (side-by-side) in this orientation? And vice versa.
3. **Eliminate, don't just hide** — if a label doesn't fit, remove the label and use an icon. Don't add `display:none` and call it done.
4. **One-screen rule for overlays** — fullscreen overlays must fit all content on one screen without scrolling in their target orientation. If content overflows, compact it (smaller fonts, tighter gaps) rather than adding scroll.
5. **Test the dimension you changed** — if you changed portrait→landscape, mentally walk through what happens to EVERY element in that narrower height. Don't just check if it "looks OK."

## Action Items

- [x] Rule added to `.agent/context/ui-patterns.md`
- [x] Landscape drawer uses horizontal flex (leaderboard left, theme right)
- [x] Leaderboard capped at 280px in landscape
