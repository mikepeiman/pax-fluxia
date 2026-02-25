# Game Design — Deep Dive

## GDD Reference
- GDD overview: `.atlas/00_OVERVIEW.md` (if exists) or `.atlas/04_FUNCTIONAL_STORY.md`
- Decisions log: `.atlas/DECISIONS.md`
- Feature status: `.atlas/FEATURE_STATUS.md`

**Mandatory**: Read the GDD and DECISIONS.md before any gameplay-related work.

---

## The #1 Rule: Attack ≠ Transfer

| Action | Ships Move? | Visual | Mechanic |
|--------|-----------|--------|----------|
| **Attack** | NO — ships STAY at source | Surge/recede pulse at star | Remote engagement, damage across lane |
| **Transfer** | YES — ships travel lane | Sprites move along lane | Reinforcement to friendly star |

- **"Attack animation"** = the surge pulse of orbiting ships pushing toward target. Ships do NOT leave.
- **"Transfer animation"** = ships physically traveling along a connection lane.

---

## Animation Timing (6 Independent Systems)

**All use `gameNowMs` (FXClock)** — never `performance.now()` or `Date.now()`.

| System | Timing Source | Config Key |
|--------|-------------|-----------|
| Attack Surge pulse | `tickProgress` | `ATTACK_SURGE_*` |
| Attack Surge ramp-in | `gameNowMs` delta | `ATTACK_SURGE_RAMP_MS` |
| Ship Transfer travel | `gameNowMs` | `effectiveTickMs` |
| Orbit | frame-based `orbitTime` | none |
| Settle | `gameNowMs` | `SETTLE_DURATION_MS` |
| Conquest flash | `gameNowMs` | — |

### Timing Exceptions
- `performance.now()` OK for: tick scheduling (`setInterval`), end-game elapsed time stats
- Everything else: **gameNowMs**

### Why
`gameNowMs` is pause-aware and speed-aware. Wall-clock time diverges during pause/resume, speed changes, and tab backgrounding. Mixing causes animation glitches on tick boundaries.

---

## Animation Architecture

### Event-Driven, Not Diff-Based (D-17)
The engine emits typed events with full context. Never reverse-engineer actions from state diffs.

```typescript
// CORRECT: consuming engine events
engine.events.forEach(event => {
    if (event.type === 'reinforce') animateTravel(event);
    if (event.type === 'conquest') animateConquestTransfer(event);
});

// WRONG: observing state changes
if (prev.ships > current.ships) animateTravel(); // Can't distinguish attack from transfer!
```

### Hard Constraints
- **D-16**: Settle ships appear at full orbit scale (0.8) and full alpha (1.0) immediately. NEVER bloom from small/faint.
- **D-18**: Every animation timing parameter MUST be exposed as a `GAME_CONFIG` slider. No opaque timing math.
- **D-19**: Conquest ships distribute `settleStartAngle` evenly around 2π using batch index, not clustered.
- **D-21**: Orders take effect immediately on client. Attack surge waits for tick boundary.

---

## Tunability (Repeated instruction — 3+ times)

When implementing ANY new feature, mechanic, or visual effect:

1. **Extract ALL magic numbers** into `GAME_CONFIG` or equivalent
2. **Add UI controls** (sliders, toggles, color pickers) in the settings panel
3. **Persist** all values to localStorage
4. **Show current values** in UI next to each control

Anti-patterns:
- `const x = 500;` — hardcoded, no way to tune
- Opaque stagger formulas that silently create 2000ms+ delays

---

## Backwards-Compatible Effects (Repeated instruction — 3+ times)

1. **NEVER delete** an existing animation/effect to replace it
2. **ALWAYS keep** as a selectable option via config toggle
3. **Add new implementations alongside** — build a library of variants
4. When changing easing: add mode selector (`linear | cubic`)
5. When adding ramp-in: make duration configurable (0 = disabled = old behavior)

Exception: dead code that was never functional can be cleaned up per user request.

---

## Orders System

- Orders **persist until explicitly cancelled** by the player
- Zero ships does NOT auto-cancel an order
- The game is about chains of command and flows of forces — orders define the flow topology

### Opposing Orders (D-20)
- "Opposing" = same-player loop (own Star A→B and B→A). Self-contradictory.
- Cross-player mutual combat is ALWAYS allowed (normal gameplay).
- `ALLOW_OPPOSING_ORDERS` is client-only boolean. When false (default): A→B cancels B→A (same owner only).

---

## Scope: Pax Galaxia vs Pax Fluxia

| | Pax Galaxia | Pax Fluxia |
|---|---|---|
| **Goal** | 100% recreation of 2007 game | Evolution with new mechanics |
| **Status** | **Active development** | Roadmap only |
| **Scope** | Core combat, production, repair, AI, star types | Star upgrades, conditional orders, spectator, etc. |

**Rule**: Never conflate roadmap features with active core gameplay work.

---

## Spec Compliance

Before touching ANY game logic, re-read:
- `.atlas/DECISIONS.md` — architectural decisions
- `.atlas/FEATURE_STATUS.md` — current bugs and planned features
- `.atlas/DESIGN_RULES.md` — UI/UX rules

### Ship Movement Rule
Transfer always means animated visual travel. Ships never appear from nowhere. Engine logic may be "instant" but visual representation shows the journey.

### Scoped Fixes (Lesson from B-87)
When fixing a bug in a specific scenario (conquest, transfer):
- NEVER modify shared rendering functions (`getOrbitSlot`, `drawShip`) for one code path
- Scope the fix to the specific lifecycle phase (e.g., post-pass for conquest only)
- Verify normal rendering is unaffected
