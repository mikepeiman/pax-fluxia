# Takeaways - 2026-04-29

- The retained active-frontier optimization introduced a real transition-lifecycle regression.
- The bug was not in the wave math itself; it was in the handoff from active conquest to steady state.
- Any retained transition layer now needs explicit cleanup-boundary coverage before a paint-skip optimization is considered safe.
