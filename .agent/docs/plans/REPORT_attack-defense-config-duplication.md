# Report: Attack/Defense Config Panel Layout

**Date**: 2026-03-01  
**Status**: Design decision documented

---

## Context

Economy and Battle settings sections both surface the same config variables:

| Economy (→ rename to "Global") | Config Key | Battle Section |
|-------------------------------|------------|----------------|
| 🛡️ Defense (slider 0.2–5×) | `AGGRESSOR_ADVANTAGE` (inverted: `1/v`) | Aggressor Advantage (slider 0–3) |
| ⚔️ Attack (slider 0–0.5) | `DAMAGE_PER_SHIP` | Damage Per Ship (slider 0–1) |

## Decision (User, 2026-03-01)

1. **"Economy" is the wrong label** → rename to **"Global Settings"**
2. **Attack/Defense sliders belong in Global** — they are global modifiers
3. **Duplicated variables across panels are acceptable** IF:
   - Labels are **exactly the same** in both panels
   - Values are **bound together as mirrors** (changing one updates the other)

## Current Problem

- Labels differ: "Defense" ≠ "Aggressor Advantage", "Attack" ≠ "Damage Per Ship"
- Values are not bound: moving one slider does NOT update the other

## Action Items

1. Rename "Economy" section → **"Global Settings"**
2. Harmonize labels: use identical names in Global and Battle
3. Bind mirrored sliders so changes propagate bidirectionally
4. Add `REPAIR_SUPPRESS_ATTACKER` and `REPAIR_SUPPRESS_DEFENDER` sliders to Global
