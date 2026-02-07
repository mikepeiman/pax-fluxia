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
4. ~~**Star Selection Sticking** — After issuing order, star selection chains and requires multiple clicks to deselect.~~ **FIXED 2026-02-07**

---

## Planned Features (Backlog)

| Feature | Priority | Notes |
|---------|----------|-------|
| **Audio System** | ✅ Done | Tone.js: tick metronome, ambient drone, order chimes (ascending), combat sounds (intensity-scaled), conquest fanfare. |
| **Star Distance Slider** | ✅ Done | Pre-game setting (0.5x dense to 2.0x sparse). Saved to localStorage. |
| **Passthrough Orders** | ✅ Done | Queue orders from/through enemy stars. Dashed arrows for deferred orders. Executes on capture. |
| **Combat Log Improvements** | ✅ Done | Shows player owners (YOU, AI1, etc.) instead of star colors. |
| **Chain Conquest Fix** | ✅ Done | Attacks invalidated when star ownership changes mid-tick. |
| **Ship Transfer Animations** | 🔴 High | Ships visually flowing along connection paths |
| **Conquer-Scatter Animations** | 🔴 High | Ships scattering to escape route stars on conquest |
| **Retreat Animations** | 🔴 High | Ships retreating to friendly stars |
| **Logging Levels** | ✅ Done | Toggleable `logFlags` in logger — 8 categories, runtime toggling via `window.logFlags` |
| **Combat Log: Captured Ships** | ✅ Done | Shows captured, escaped, and destroyed counts on conquest |
| **Combat Log: "You" Filter** | ✅ Done | "👤 You" toggle button filters to own battles |
| **Damaged Ships Defense in UI** | ✅ Done | `DAMAGED_SHIP_EFFECTIVENESS` config + tuning panel slider |
| **AI: Frontline Forces** | 🟢 Standard | Distribute ships along frontline, configurable allocation |
| **AI: Match Opposing Forces** | 🟢 Standard | AI matches enemy force levels on frontline |
| **AI: Evenly-Distributed** | 🟢 Standard | Option to spread ships evenly across territory |
| **AI: Backline-and-Pounce** | 🟢 Standard | Hold back, commit to battles on frontline capture |
| **AI: Tactical Surround** | 🟢 Standard | Multi-star coordination to surround enemy forces |
| **AI: Star Type Awareness** | 🟢 Standard | Attack from Green, defend Red/Purple |
| **Multiplayer Deployment** | 🟡 Medium | Deploy for alpha testing (Vercel + Railway) |
| **Custom Map Editor** | 🔵 Backlog | Implementation plan needed with effort estimates |

---

## Session Log

| Date | Summary |
|------|---------| 
| 2026-02-07 | Group A+B: Star selection bug fix, combat log enhancements (captured/escaped/destroyed), My Battles filter, DAMAGED_SHIP_EFFECTIVENESS config, logging levels, root README. |
| 2026-02-07 | Protocol audit & consolidation, comprehensive game spec, dev history, new doc-everything rule. |
| 2026-02-07 | Colyseus multiplayer: fixed player interaction, star ownership with sessionId. |
| 2026-02-03 | Audio system (Tone.js), passthrough orders fix, star spacing slider. |
| 2026-02-02 | Fixed scatter/escape on conquest (checks connections). Fixed competing orders A↔B. |
| 2026-02-02 | Fixed: rt-click cancel, ship disappear, attack damage reduced 90%. |
| 2026-02-02 | Fixed command lag via consistent `pendingOrders` in all order paths. Created tracker. |
| 2026-02-01 | Implemented V3.1 combat + individual ship animation. |

