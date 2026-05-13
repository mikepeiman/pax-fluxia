# Takeaways - 2026-05-07 - Sidebar Panel Column Alignment

## Lessons
- "Attached to the initiating control" does not mean "geometrically aligned to the local button edge at all costs."
- Sidebar panels are owned by the sidebar column first and the triggering button second.
- Viewport respect and label readability are hard invariants for the right-sidebar action surface.

## Rule
- When expanding controls inside the in-game sidebar, anchor the opened content to the section body column and test mentally against the narrowest expected desktop width before declaring the layout direction correct.
