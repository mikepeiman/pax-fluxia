# 04 — Verification Plan: Attack-Conquest Ship & Star Animations

**Date:** 2026-02-13

## Test Scenarios

### Scenario 1: Basic Conquest (1v1, adjacent stars)
1. Player attacks AI star with large fleet
2. **Expected**: Ships visually fly from player star → conquered star → settle into orbit
3. **Verify**: No ships appear from thin air. Star color changes. Ships visible in transit.

### Scenario 2: Scatter Conquest 
1. AI star has friendly neighbors
2. Player conquers it
3. **Expected**: Some defender ships fly to friendly neighbors (scatter animation). Attacker ships fly to conquered star.

### Scenario 3: No-Escape Conquest
1. AI star is surrounded by enemies
2. Player conquers it  
3. **Expected**: 100% captured. Attacker ships fly to conquered star.

### Scenario 4: Empty Star Conquest (0 defenders)
1. Attack an undefended star
2. **Expected**: Instant conquest, ships fly over to garrison it

### Scenario 5: Mode Switching via Debug Panel
1. While playing, switch between 'immediate', 'surge', 'travel' modes
2. **Expected**: Next conquest uses selected mode

### Scenario 6: All 3 Modes Work
1. **Immediate**: Ships teleport to orbit (old behavior)
2. **Surge**: Ships appear above star, settle down (radius only)
3. **Travel**: Ships visually fly from attacker to conquered (new default)

## Success Criteria
- [ ] Travel mode: ships are seen departing from attacker star
- [ ] Travel mode: ships are seen moving through lane between stars
- [ ] Travel mode: ships arrive and settle into orbit at conquered star
- [ ] Star color changes immediately on conquest
- [ ] Scatter/retreat animations still work for defender ships
- [ ] No "naked tick" (no frame where conquered star has 0 visible ships)
- [ ] Debug panel mode toggle works in real-time
- [ ] Performance acceptable with 50+ transferring ships
