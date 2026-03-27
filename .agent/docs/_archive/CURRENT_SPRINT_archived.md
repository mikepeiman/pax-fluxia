# Current Sprint

> Updated: 2026-03-01

## Active Work
- **Mobile UI**: Portrait map orientation is working but transpose on rotation not verified. Landscape sidebar layout pending.
- **Map Transpose**: Existing system in `GameCanvas.svelte` lines 564-605 — needs debugging/verification that it fires correctly on rotation.

## Recently Completed (This Session)
- ✅ Slider +/- nudge buttons (all panels)
- ✅ Close button cutoff fix
- ✅ Back button navigation (popstate handler)
- ✅ Exit confirmation modal
- ✅ Redundant mobile buttons removed (restart/audio/quit → FAB popup)
- ✅ Android nav bar bottom offset fix
- ✅ Portrait map generation
- ✅ AGENT.md master context file
- ✅ Rule consolidation (21 → 10)

## Pending Items
- [ ] Debug map transpose on orientation change
- [ ] Landscape sidebar layout (top/bottom bars → left/right)
- [ ] Evaluate/install Entire CLI for session persistence
- [ ] SliderRow component refactor (R-1)
