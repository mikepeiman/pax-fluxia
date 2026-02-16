

# Pax Fluxia Core Concepts (MANDATORY CONTEXT)

## CRITICAL: Read `.atlas/gdd/00_OVERVIEW.md` before ANY gameplay-related work

The GDD contains essential context that MUST be loaded before working on:
- Combat, attacks, or damage
- Ship animations or VFX
- Game timing, ticks, or speed controls
- UI controls or debug panels

## The #1 Rule: Attack ≠ Transfer

| Action | Ships Move? | Visual | Mechanic |
|--------|------------|--------|----------|
| **Attack** | NO — ships STAY at source | Surge/recede pulse at star | Remote engagement, damage across lane |
| **Transfer** | YES — ships travel lane | Sprites move along lane | Reinforcement to friendly star |

**"Attack animation"** = the surge pulse of orbiting ships pushing toward target. Ships do NOT leave.
**"Transfer animation"** = ships physically traveling along a connection lane.

## Animation Timing Sources (6 systems, each separate)

| System | Timing Source | Config Key |
|--------|-------------|-----------|
| Attack Surge pulse | `tickProgress` | `ATTACK_SURGE_*` |
| Attack Surge ramp-in | `performance.now()` | `ATTACK_SURGE_RAMP_MS` |
| Ship Transfer travel | `performance.now()` | `effectiveTickMs` |
| Orbit | frame-based `orbitTime` | none |
| Settle | `performance.now()` | `SETTLE_DURATION_MS` |
| Conquest flash | `performance.now()` | — |

## Key Docs

- GDD: `.atlas/gdd/00_OVERVIEW.md`
- Animations: `.atlas/gdd/01_ANIMATIONS.md`
- Mechanics: `.atlas/MECHANICS.md`
- Feature Status: `.atlas/FEATURE_STATUS.md`
- Controls: `.atlas/CONTROLS.md`

