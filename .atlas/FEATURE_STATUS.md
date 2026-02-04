# Feature Regression Tracker

**Purpose**: Systematic tracking of feature status for human-AI development collaboration.

**Last Updated**: 2026-02-02  
**Last Reviewer**: Agent

---

## How to Use

Each feature has:
- **Works?** — Boolean: ✅ (working) or ❌ (broken)
- **Changed?** — Did this change since last session? 🔄 (yes) or ➖ (no)
- **Notes** — Current status, issues, or observations

Update this file after each development session.

---

## Core Gameplay

| Feature | Works? | Changed? | Notes |
|---------|--------|----------|-------|
| Start Game | ✅ | ➖ | Menu → Game transition works |
| Pause/Resume | ✅ | ➖ | Speed controls functional |
| Speed Control (1x-50x) | ✅ | ➖ | All speeds work |
| Win/Lose Detection | ✅ | ➖ | Elimination and victory detected |
| Replay / Return to Menu | ✅ | ➖ | Both work correctly |

---

## Input / Controls

| Feature | Works? | Changed? | Notes |
|---------|--------|----------|-------|
| **Instant Command Issue** | ✅ | 🔄 | Fixed pendingOrders consistency for optimistic UI |
| Click-to-Select Star | ✅ | ➖ | Selection works |
| Drag-to-Attack | ✅ | ➖ | Drag gesture works |
| Click-Click Attack | ✅ | ➖ | Two-click mode works |
| Right-Click Cancel | ✅ | ➖ | Cancels selection |
| Vector Arrow Display | ✅ | 🔄 | Fixed — now instant via pendingOrders |

---

## Combat Mechanics

| Feature | Works? | Changed? | Notes |
|---------|--------|----------|-------|
| Attrition (per-tick damage) | ✅ | 🔄 | V3.1 symmetric formula implemented |
| Conquest (star capture) | ✅ | ➖ | Works correctly |
| Retreat (directed) | ✅ | 🔄 | 35% capture, 65% escape verified |
| Scatter (escape routes) | ✅ | 🔄 | 50%/25%/25% logic verified |
| Repair (damaged → active) | ❓ | ➖ | Needs verification |
| Production (ship spawn) | ✅ | ➖ | Works |

---

## Visual / Animation

| Feature | Works? | Changed? | Notes |
|---------|--------|----------|-------|
| Ship Orbit (idle) | ✅ | ➖ | Ships orbit stars |
| Ship Surge (attack) | ✅ | 🔄 | V3.1 individual ship animation |
| Ship Transfer (flow) | ✅ | 🔄 | Ships flow along connection lines |
| Tick Orb Pulse | ✅ | ➖ | Metronome visual works |
| Star Glow / Selection | ✅ | ➖ | Visual feedback works |

---

## Known Regressions (Priority)

~~1. **Command Input Lag** — UI interactions not instant. Must fix.~~ ✅ FIXED
~~2. **Vector Arrow Delay** — May be same root cause as #1.~~ ✅ FIXED
3. **Passthrough Orders** — Deferred orders through enemy stars not working. Need to fix drag-through logic.

---

## Planned Features (Backlog)

| Feature | Priority | Notes |
|---------|----------|-------|
| **Audio System** | ✅ Done | Tone.js: tick metronome, ambient drone, order chimes (ascending), combat sounds (intensity-scaled), conquest fanfare. |
| **Star Distance Slider** | ✅ Done | Pre-game setting (0.5x dense to 2.0x sparse). Saved to localStorage. |
| **Passthrough Orders** | ✅ Done | Queue orders from/through enemy stars. Dashed arrows for deferred orders. Executes on capture. |
| **Combat Log Improvements** | ✅ Done | Shows player owners (YOU, AI1, etc.) instead of star colors. |
| **Chain Conquest Fix** | ✅ Done | Attacks invalidated when star ownership changes mid-tick. |

---

## Session Log

| Date | Summary |
|------|---------|
| 2026-02-03 | Audio system (Tone.js), passthrough orders fix, star spacing slider. |
| 2026-02-02 | Fixed scatter/escape on conquest (checks connections). Fixed competing orders A↔B. |
| 2026-02-02 | Fixed: rt-click cancel, ship disappear, attack damage reduced 90%. |
| 2026-02-02 | Fixed command lag via consistent `pendingOrders` in all order paths. Created tracker. |
| 2026-02-01 | Implemented V3.1 combat + individual ship animation. |

