# Post-Mortem: 2026-05-07 - Sidebar Panel Button Slot Overflow

## What Happened

I implemented the right-sidebar save/load panels as if "attached to the
initiating control" meant the panel should align itself to the button slot.
That produced a bad layout in the live sidebar: the opened content could push
past the viewport edge and clip the left section labels.

## Root Cause

- I over-literalized the button attachment requirement.
- I failed to keep the owning layout boundary clear: the sidebar content column
  is the parent layout authority, not the local button edge.
- I solved for trigger adjacency without preserving the container and viewport
  invariants.

## Impact

- The save panel could render off the right edge of the viewport.
- The `Map`, `Game + Map`, and `Session` labels could become clipped.
- The user had to correct an interaction and layout issue that should have been
  obvious from the screenshot and the UI description.

## Corrective Actions

- Render opened action panels below the action row inside the sidebar body
  column.
- Keep the section label column independent from panel expansion.
- Treat "stays inside the sidebar container and viewport" as a primary layout
  invariant for this surface.

## Lessons

- Attached disclosure UI still belongs to its parent container.
- In narrow sidebars, per-button geometric alignment is usually the wrong
  layout owner.
- When the user describes both alignment and viewport behavior, both are part
  of the specification and must be satisfied together.
