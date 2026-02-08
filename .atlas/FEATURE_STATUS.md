# Feature Regression Tracker

**Purpose**: Systematic tracking of feature status for human-AI development collaboration.

**Last Updated**: 2026-02-08  
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
| Attrition (per-tick damage) | ✅ | 🔄 | V4 symmetric formula, UI sliders now wired via CombatConfigOverride |
| Conquest (star capture) | ✅ | 🔄 | Fixed: per-player aggregation, largest player wins |
| Retreat (directed) | ✅ | 🔄 | 35% capture, 65% escape verified |
| Scatter (escape routes) | ✅ | 🔄 | Fixed: now uses actual connections |
| Ship Transfer Rate | ✅ | 🔄 | Slider step 5→1, min 5→1; wired correctly |
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
5. ~~**Multi-star conquest** — Sum ALL attacking forces per player per tick; largest player wins.~~ **FIXED 2026-02-08**
6. **Transfer rate equilibrium** — Stars sit at 4-8+ ships instead of draining; production outpaces transfer due to `floor` rounding.
7. ~~**Attack orders persist** — When another player conquers your target, your attack orders should auto-cancel.~~ **FIXED 2026-02-08**
8. **Attack travel animation** — Ships animate along lanes during attacks; should only happen on friendly transfers.
9. **Conquest ship bloom** — Captured ships bloom from star center instead of showing transfer from conquering star.
10. ~~**Pause doesn't freeze orbits** — Orbit animations continue during pause.~~ **FIXED 2026-02-08**
11. ~~**Control panel variables** — Combat sliders (Aggressor, Lethality, Damage) disconnected from combat math.~~ **FIXED 2026-02-08** via `CombatConfigOverride`
12. **Map lane overlap** — Random maps can generate lanes with near-zero angle between them.
13. **MP: Spacebar** — Spacebar doesn't control play/pause in multiplayer.
14. **MP: Combat logs empty** — Logs show nothing in multiplayer mode.
15. **MP: Multi-star conquest** — Same as #5 but on server side.
16. **Lane passes under star** — Map lanes should never visually cross underneath a star. Obscures gameplay.
17. **Command arrows reach target** — Order arrows extend to target star; should stop partway. Termination point should be adjustable via control panel slider.
18. **MP: Restart button broken** — Restart does not work in multiplayer.
19. **MP: Can draw arrows to non-connected stars** — No apparent effect but misleading; should be blocked.

---

## Planned Features (Backlog)

| Feature | Priority | Notes |
|---------|----------|-------|
| **Audio System** | ✅ Done | Tone.js: tick metronome, ambient drone, order chimes (ascending), combat sounds (intensity-scaled), conquest fanfare. |
| **Star Distance Slider** | ✅ Done | Pre-game setting (0.5x dense to 2.0x sparse). Saved to localStorage. |
| **Passthrough Orders** | ✅ Done | Queue orders from/through enemy stars. Dashed arrows for deferred orders. Executes on capture. |
| **Combat Log Improvements** | ✅ Done | Shows player owners (YOU, AI1, etc.) instead of star colors. |
| **Chain Conquest Fix** | ✅ Done | Attacks invalidated when star ownership changes mid-tick. |
| **Ship Transfer Animations** | ✅ Done | Ships visually fly along connections with eased motion, spread, and jitter |
| **Conquer-Scatter Animations** | ✅ Done | Burst effect + ships scatter to escape route stars on conquest |
| **Retreat Animations** | ✅ Done | Ships fly from conquered star to retreat target |
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
| **AI: Pre-Conquest Retreat** | 🟢 Standard | AI orders retreat before losing a star to minimize losses. Variable aggressiveness makes AI easier/harder |
| **Multiplayer Deployment** | 🟡 Medium | Deploy for alpha testing (Vercel + Railway) |
| **Percentage Directives** | 🔵 Backlog | Split forces: send fractions in multiple directions from one star. Requires new order model. |
| **Command Arrow Styles** | 🔵 Backlog | Different colors and styles for attack vs reinforce vs deferred order arrows. |
| **Scrollwheel Zoom** | 🟡 Medium | Zoom in/out centered on cursor position via mousewheel. |
| **Performance Audit** | 🟡 Medium | Major perf examination — machine runs hot at ~few thousand ships. Optimize rendering, batching, culling. |
| **Custom Map Editor** | 🔵 Backlog | Implementation plan needed with effort estimates |
| **Slow-Mo Debug Mode** | 🟢 Standard | Keyboard shortcut to slow tick ~20x on conquest for animation debugging/tuning |
| **Conquest Stats Popup** | 🟢 Standard | Pause on conquest + popup showing destroyed/damaged/retreated/captured stats |
| **Animation Style Toggle** | 🟢 Standard | UI widget to switch between animation styles; keep all styles available |
| **Ship Color Fade** | 🟢 Standard | Ships fade toward white mid-travel, back to player color at destination |
| **Damaged Ship Overlapping Orbits** | 🟢 Standard | Large numbers of damaged ships stack in overlapping rings instead of dense single ring |

---

## Session Log

| Date | Summary |
|------|---------| 
| 2026-02-08 | Control panel wiring fix: combat sliders now drive actual combat math via `CombatConfigOverride`. Transfer rate slider step 5→1. MECHANICS.md rewritten as canonical spec. Multi-star per-player aggregation. Pause freeze. Order cancel on conquest. |
| 2026-02-08 | Ship animation redesign: unified lifecycle (orbit→depart→travel→arrive). Fixed scatter to use real connections + real ship count diffs. |
| 2026-02-07 | Group A+B: Star selection bug fix, combat log enhancements (captured/escaped/destroyed), My Battles filter, DAMAGED_SHIP_EFFECTIVENESS config, logging levels, root README. |
| 2026-02-07 | Protocol audit & consolidation, comprehensive game spec, dev history, new doc-everything rule. |
| 2026-02-07 | Engine Convergence Phase 2 (conquest/scatter/retreat unified). Fixed MP connection constraint bug (orders could bypass routes). |
| 2026-02-07 | Colyseus multiplayer: fixed player interaction, star ownership with sessionId. |
| 2026-02-03 | Audio system (Tone.js), passthrough orders fix, star spacing slider. |
| 2026-02-02 | Fixed scatter/escape on conquest (checks connections). Fixed competing orders A↔B. |
| 2026-02-02 | Fixed: rt-click cancel, ship disappear, attack damage reduced 90%. |
| 2026-02-02 | Fixed command lag via consistent `pendingOrders` in all order paths. Created tracker. |
| 2026-02-01 | Implemented V3.1 combat + individual ship animation. |

