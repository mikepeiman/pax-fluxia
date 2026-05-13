# Takeaways - 2026-05-07 - Attached Menu Panels And Confirmations

## Lessons
- In a constrained sidebar, “attached to the control” is a structural requirement, not a spacing tweak.
- Shared utility drawers are the wrong ownership model when the user expects local affordances.
- Confirmation behavior must be applied consistently to visible destructive actions, not just legacy exit flows.

## Decisions
- Keep action panels inside the originating action slot.
- Use 200ms transitions for the touched sidebar/theme interactions.
- Route restart and delete through explicit confirmation state.

## Follow-Up
- If the user wants tighter control over the scroll motion itself, replace browser-native smooth scrolling with a custom fixed-duration scroll routine.
