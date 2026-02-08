# Feature & Regression Tracker

**Last Updated**: 2026-02-08  
**Last Verified By**: User (partial — see Verified column)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | User-verified working |
| ❓ | Agent-implemented, not user-verified |
| ❌ | User-confirmed broken |
| 🔧 | Code change made (commit ref in Notes) |

---

## Core Gameplay

| Feature | Status | Notes |
|---------|--------|-------|
| Start Game | ✅ | Menu → Game transition |
| Pause/Resume | ❓ | Orbit + traveling ship freeze added (`60395be`) |
| Speed Control (1x-50x) | ✅ | |
| Win/Lose Detection | ✅ | |
| Replay / Return to Menu | ✅ | SP only. MP restart broken (see Open Issues #18) |

---

## Input / Controls

| Feature | Status | Notes |
|---------|--------|-------|
| Click-to-Select Star | ✅ | |
| Drag-to-Attack | ✅ | |
| Click-Click Attack | ✅ | |
| Right-Click Cancel | ✅ | |
| Command Issue Speed | ❓ | Uses `pendingOrders` for optimistic UI |
| Vector Arrow Display | ❓ | Uses `pendingOrders` for instant rendering |

---

## Combat Mechanics

| Feature | Status | Notes |
|---------|--------|-------|
| Attrition (per-tick damage) | ❓ | V4 symmetric formula. UI sliders wired via `CombatConfigOverride` (`441010d`) |
| Conquest (star capture) | ❓ | Per-player aggregation via `shipsByOwner` map (`43cd2fc`) |
| Conquest Threshold | ✅ | User verified 2026-02-08 |
| Retreat (directed) | ❓ | 35% capture rate. Needs user verification |
| Scatter (escape routes) | ❓ | Uses star connections. Needs user verification |
| Ship Transfer Rate | ✅ | Slider step changed to 1% (`441010d`) |
| Repair (damaged → active) | ✅ | User verified 2026-02-08 |
| Production (ship spawn) | ✅ | |
| Order Persistence | ❓ | Orders persist until cancelled; `clearTarget` guard removed |
| Order Cancel on 3rd-Party Conquest | ❓ | Chained orders also cancelled (`60395be`) |

---

## Visual / Animation

| Feature | Status | Notes |
|---------|--------|-------|
| Ship Orbit (idle) | ✅ | |
| Ship Transfer (flow along lanes) | ❓ | Unified lifecycle: orbit→depart→travel→arrive |
| Tick Orb Pulse | ✅ | |
| Star Glow / Selection | ✅ | |

---

## Control Panel (CombatDebugPanel)

| Slider | Wired? | Notes |
|--------|--------|-------|
| Transfer Rate | ✅ | Step=1%, min=1%. Writes to `GAME_CONFIG.TRANSFER_RATE` (÷100) |
| Aggressor Advantage | ❓ | Wired via `CombatConfigOverride` (`441010d`) |
| Damage Per Ship | ❓ | Wired via `CombatConfigOverride` (`441010d`) |
| Lethality | ❓ | Wired via `CombatConfigOverride` (`441010d`) |
| Force Ratio Effect | ❓ | Wired via `CombatConfigOverride` (`441010d`) |
| Conquest Threshold | ✅ | Reads directly from `GAME_CONFIG` in GameEngine |
| Conquest Transfer % | ❓ | Reads from `GAME_CONFIG` |
| Retreat Capture Rate | ❓ | Reads from `GAME_CONFIG` |
| Scatter Capture Rate | ❓ | Reads from `GAME_CONFIG` |
| Scatter Destroy Rate | ❓ | Reads from `GAME_CONFIG` |
| Damaged Ship Effectiveness | ❓ | Reads from `GAME_CONFIG` |
| Repair Rate | ❓ | Reads from `GAME_CONFIG` |
| AI thresholds (4 sliders) | ❓ | Read from `GAME_CONFIG` in `AI.ts` |

---

## Open Issues

Issues requiring code fixes. Ordered by category.

### Bugs (SP)

| # | Issue | Status |
|---|-------|--------|
| 3 | Passthrough orders — deferred orders through enemy stars not working | Open |
| 6 | Transfer rate equilibrium — stars sit at 4-8 ships due to production/floor rounding | Open |
| 8 | Attack travel animation — ships animate along lanes during attacks; should only happen on friendly transfers | Open |
| 9 | Conquest ship bloom — captured ships appear from star center instead of transfer visual | Open |
| 12 | Map lane minimum angle — lanes can generate with near-zero angle between them | Open |
| 16 | Lane passes under star — lanes must not visually cross underneath a star | Open |
| 17 | Command arrows reach target — should stop partway; termination point adjustable via slider | Open |

### Bugs (MP)

| # | Issue | Status |
|---|-------|--------|
| 13 | Spacebar doesn't control play/pause in MP | Open |
| 14 | Combat logs empty in MP | Open |
| 15 | Multi-star conquest not aggregating per-player on server | Open |
| 18 | Restart button broken in MP | Open |
| 19 | Can draw order arrows to non-connected stars | Open |

### Resolved (User-Verified or Commit-Referenced)

| # | Issue | Resolution | Ref |
|---|-------|------------|-----|
| 1 | Command input lag | `pendingOrders` for optimistic UI | 2026-02-02 |
| 2 | Vector arrow delay | Same fix as #1 | 2026-02-02 |
| 4 | Star selection sticking | Fixed | 2026-02-07 |
| 5 | Multi-star conquest grouping | Per-player `shipsByOwner` map | `43cd2fc` |
| 7 | Attack orders persist after 3rd-party conquest | Orders cancelled on conquest | `60395be` |
| 10 | Pause doesn't freeze orbits | `animationTime` + `departTime` frozen | `60395be` |
| 11 | Combat sliders disconnected | `CombatConfigOverride` parameter | `441010d` |

---

## Planned Features (Backlog)

### Implemented (Needs Verification)

| Feature | Commit/Date |
|---------|-------------|
| Audio System (Tone.js) | 2026-02-03 |
| Star Distance Slider | 2026-02-03 |
| Passthrough Orders (UI) | 2026-02-03 |
| Combat Log: player owners | 2026-02-07 |
| Chain Conquest Fix | 2026-02-07 |
| Ship Transfer Animations | 2026-02-08 |
| Conquer-Scatter Animations | 2026-02-08 |
| Retreat Animations | 2026-02-08 |
| Logging Levels (8 categories) | 2026-02-07 |
| Combat Log: captured/escaped/destroyed | 2026-02-07 |
| Combat Log: "You" filter | 2026-02-07 |
| Damaged Ships Defense slider | 2026-02-07 |

### Not Started

| Feature | Priority |
|---------|----------|
| AI: Frontline Forces | 🟢 |
| AI: Match Opposing Forces | 🟢 |
| AI: Evenly-Distributed | 🟢 |
| AI: Backline-and-Pounce | 🟢 |
| AI: Tactical Surround | 🟢 |
| AI: Star Type Awareness | 🟢 |
| AI: Pre-Conquest Retreat | 🟢 |
| Conquest Stats Popup (pause + stats card) | 🟢 |
| Slow-Mo Debug Mode | � |
| Animation Style Toggle | 🟢 |
| Ship Color Fade (mid-travel) | 🟢 |
| Damaged Ship Overlapping Orbits | 🟢 |
| Scrollwheel Zoom | 🟡 |
| Performance Audit | 🟡 |
| Multiplayer Deployment | 🟡 |
| Percentage Directives | � |
| Command Arrow Styles | � |
| Custom Map Editor | � |

---

## Session Log

| Date | Summary |
|------|---------|
| 2026-02-08 | Combat slider wiring (`CombatConfigOverride`). Transfer rate slider step 5→1. MECHANICS.md canonical rewrite. Multi-star per-player aggregation. Pause freeze. Order cancel on conquest. |
| 2026-02-08 | Ship animation redesign: unified lifecycle (orbit→depart→travel→arrive). Scatter uses real connections. |
| 2026-02-07 | Star selection fix, combat log enhancements, My Battles filter, DAMAGED_SHIP_EFFECTIVENESS slider, logging levels, root README. |
| 2026-02-07 | Protocol audit, comprehensive game spec, dev history, doc-everything rule. |
| 2026-02-07 | Engine Convergence Phase 2. MP connection constraint fix. |
| 2026-02-07 | Colyseus multiplayer: star ownership via sessionId. |
| 2026-02-03 | Audio system, passthrough orders, star spacing slider. |
| 2026-02-02 | Scatter/escape connections fix. Competing orders fix. |
| 2026-02-02 | Right-click cancel, ship disappear fix, attack damage fix. |
| 2026-02-02 | Command lag fix via pendingOrders. Created tracker. |
| 2026-02-01 | V3.1 combat + individual ship animation. |
