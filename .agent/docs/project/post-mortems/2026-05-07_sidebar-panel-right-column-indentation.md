# Post-Mortem: 2026-05-07 - Sidebar Panel Right-Column Indentation

## What Happened

After fixing the panel overflow, I still left the opened save/load disclosures
nested inside the right action subcolumn. That preserved a large left indent,
which the user correctly called out as still wrong.

## Root Cause

- I stopped at the first structural improvement instead of checking the full
  user requirement.
- I treated "inside the viewport" as sufficient, even though the user also
  specified correct container and column alignment.
- I did not treat the disclosure's DOM ancestry as the primary layout owner.

## Impact

- The opened save/load surfaces still looked visibly misplaced.
- The user had to correct a second obvious layout issue on the same surface.

## Corrective Actions

- Move opened action panels and feedback rows out of `menu-action-body`.
- Make them direct children of the action section and span the full section
  width.
- Tighten save-row sizing so the input can shrink within the sidebar width.

## Lessons

- A disclosure can be "inside the viewport" and still be structurally wrong.
- The correct width and the correct ancestor are separate requirements.
- When a user is describing left-edge alignment, assume they are talking about
  the owning section boundary unless they explicitly say button alignment.
