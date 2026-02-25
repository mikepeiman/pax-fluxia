# Lesson: Never Modify Shared Functions Without Scoping

## Incident (2026-02-18)
**Bug**: B-87 — conquest settlement ring had a gap.  
**Root cause**: `getOrbitSlot()` uses `2π/capacity` as angle step. Fewer ships than capacity = partial ring.

**Mistake**: Passed `ships.length` to `getOrbitSlot()` from the **main orbit renderer** — changing how ALL ships at ALL stars are distributed. This broke normal orbit layout.

**Correct fix**: Post-pass that only redistributes `conquestSettle` ships' `settleStartAngle` after the travel loop, using the correct total count. Normal orbit rendering is untouched.

## Rule
When fixing a bug in a specific scenario (conquest, transfer, etc.):
1. **NEVER modify shared rendering functions** (`getOrbitSlot`, `drawShip`, etc.) if the bug only affects one code path
2. **Scope the fix** to the specific lifecycle phase (e.g., post-pass for conquest arrivals only)
3. **If adding a parameter to a shared function**, do NOT pass it from the default/normal code path — only from the specific scenario that needs it
4. **Verify** that normal rendering is unaffected before committing
