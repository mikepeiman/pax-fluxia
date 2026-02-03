# VIEW E: FUNCTIONAL STORIES (Narratives)

**Last Updated:** 2026-01-29  
**Project:** Pax Fluxia

---

## Story Index

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| US-001 | Start a Game | P0 | `[x] COMPLETED` |
| US-002 | Issue Attack Order | P0 | `[x] COMPLETED` |
| US-003 | Cancel Attack Order | P0 | `[x] COMPLETED` |
| US-004 | Control Game Speed | P0 | `[x] COMPLETED` |
| US-005 | Conquer Enemy Stars | P0 | `[x] COMPLETED` |
| US-006 | Win or Lose | P0 | `[x] COMPLETED` |
| US-007 | Replay or Return to Menu | P1 | `[x] COMPLETED` |
| US-008 | Visual Feedback (Surge Animation) | P1 | `[x] COMPLETED` |

---

## [US-001] Start a Game

**Narrative:** As a **Player**, I want to **configure and start a new game**, so that I can **begin playing against AI opponents**.

**Status:** `[x] COMPLETED`

```mermaid
sequenceDiagram
    participant U as Player
    participant M as MainMenu
    participant S as gameStore
    participant E as GameEngine
    participant C as GameCanvas

    U->>M: Selects map, player count, difficulty
    M->>S: updateSettings({...})
    S-->>M: Settings updated
    U->>M: Clicks "START GAME"
    M->>S: restart() -> startGame()
    S->>E: createEngine(settings)
    E->>E: generateMap(players, template)
    E->>E: initializePlayers(count, difficulty)
    E-->>S: Engine ready
    S->>S: currentView = 'game'
    S-->>C: Render game canvas
    C->>E: engine.start()
    E->>E: Begin tick loop
```

### Functional Trace
1. **TRIGGER:** User clicks `[MainMenu: START_GAME button]`
2. **GUARD:** Check `settings.playerCount >= 2`
3. **DATA FLOW:** Settings passed to `createEngine()`
4. **SIDE EFFECT:** Engine initializes, tick loop starts
5. **FEEDBACK:** View transitions to Game screen, canvas renders
6. **UPDATE:** MainMenu now overlays and uses `restart()` logic.

### Validation Criteria
- [x] Map selector changes available options
- [x] Player count changes opponent count
- [x] Difficulty selector works (console log for MVP)
- [x] Click START transitions to game view
- [x] Stars appear on canvas with correct colors
- [x] Tick loop begins (metronome pulses)

---

## [US-002] Issue Attack Order

**Narrative:** As a **Player**, I want to **drag from my star to an enemy star**, so that I can **send ships to attack and capture it**.

**Status:** `[x] COMPLETED`

```mermaid
sequenceDiagram
    participant U as Player
    participant C as GameCanvas
    participant S as gameStore
    participant E as GameEngine
    participant St as Star
    participant L as FlowLink

    U->>C: MouseDown on Star A (owned)
    C->>C: Begin drag mode, show line
    U->>C: MouseUp on Star B (enemy)
    C->>S: issueOrder(starA.id, starB.id)
    S->>E: createLink(starA.id, starB.id)
    E->>E: Validate ownership
    E->>L: new FlowLink(starA, starB)
    E->>St: starA.targetId = starB.id
    E-->>S: State updated
    S-->>C: Re-render with flow line
    C->>C: Draw line from A to B
    Note over C: On next tick, ships surge
```

### Functional Trace
1. **TRIGGER:** User drags from `[Star: owned]` to `[Star: enemy or friendly]`
2. **EVENT:** Canvas emits `onDragEnd(sourceId, targetId)`
3. **GUARD:** Check `source.ownerId === currentPlayer.id`
4. **DATA FLOW:** FlowLink created, replaces any existing outbound link
5. **FEEDBACK:** Flow line rendered, ships begin surge animation

### Validation Criteria
- [x] Drag gesture detected correctly
- [x] Visual line follows mouse during drag
- [x] Link created only from owned stars
- [x] Previous link from same star is replaced
- [x] Flow line rendered between stars
- [x] Ships animate toward target each tick

---

## [US-003] Cancel Attack Order

**Narrative:** As a **Player**, I want to **right-click on my star**, so that I can **stop sending ships and defend instead**.

**Status:** `[x] COMPLETED`

```mermaid
sequenceDiagram
    participant U as Player
    participant C as GameCanvas
    participant S as gameStore
    participant E as GameEngine
    participant St as Star

    U->>C: Right-click on Star A (owned)
    C->>S: cancelOrder(starA.id)
    S->>E: cancelLink(starA.id)
    E->>E: Find link with source = starA
    E->>E: Remove FlowLink
    E->>St: starA.targetId = null
    E-->>S: State updated
    S-->>C: Re-render without flow line
    Note over C: Ships return to orbit animation
```

### Functional Trace
1. **TRIGGER:** User right-clicks `[Star: owned with active link]`
2. **EVENT:** Canvas emits `onStarRightClick(starId)`
3. **GUARD:** Check `star.ownerId === currentPlayer.id`
4. **DATA FLOW:** FlowLink removed from engine
5. **FEEDBACK:** Flow line disappears, ships return to idle orbit

### Validation Criteria
- [x] Right-click detected on star
- [x] Context menu prevented
- [x] Link removed only from owned stars
- [x] Flow line disappears immediately
- [x] Ships transition to orbit animation
- [x] Right click also clears active selection.

---

## [US-004] Control Game Speed

**Narrative:** As a **Player**, I want to **pause and change game speed**, so that I can **think strategically or speed up boring parts**.

**Status:** `[x] COMPLETED`

```mermaid
sequenceDiagram
    participant U as Player
    participant SC as SpeedControls
    participant S as gameStore
    participant E as GameEngine

    U->>SC: Clicks Pause button
    SC->>S: pauseGame()
    S->>E: pause()
    E->>E: clearInterval(tickInterval)
    E-->>S: Speed = 0
    S-->>SC: Pause button highlighted

    U->>SC: Clicks 2x button
    SC->>S: setSpeed(2)
    S->>E: setSpeed(2)
    E->>E: tickInterval = BASE_TICK_MS / 2
    E->>E: resume()
    E-->>S: Speed = 2
    S-->>SC: 2x button highlighted
```

### Functional Trace
1. **TRIGGER:** User clicks `[SpeedControls: speed button]`
2. **EVENT:** Button emits speed value
3. **GUARD:** None (always allowed)
4. **DATA FLOW:** Engine tick interval adjusted
5. **FEEDBACK:** Active button highlighted, metronome speed changes

### Validation Criteria
- [x] Pause button stops tick loop
- [x] Speed buttons change tick interval
- [x] Metronome pulses at correct rate
- [x] Active speed button is visually distinct
- [x] Game state frozen while paused

---

## [US-005] Conquer Enemy Stars

**Narrative:** As a **Player**, I want my **ships to battle and capture enemy stars**, so that I can **expand my territory**.

**Status:** `[x] COMPLETED`

```mermaid
sequenceDiagram
    participant E as GameEngine
    participant Src as SourceStar
    participant Tgt as TargetStar
    participant C as CombatRules

    E->>E: tick()
    E->>Src: Check active transfers
    Src-->>E: Linking to Tgt
    E->>Src: Mark Engaged (Repair Penalty)
    E->>Tgt: Mark Engaged (Repair Penalty)
    E->>C: resolveMultiwayCombat(Tgt, [Src])
    C->>C: Check Overwhelm (Active <= 0)
    C->>C: Active ships absorb damage -> Damaged
    C->>C: Damaged ships SAFE until conquest
    C->>Tgt: takeDamage(DmgToDefender)
    C->>Src: takeDamage(DmgToAttacker)
    C-->>E: State updated (Damaged/Destroyed counts)
```

### Functional Trace
1. **TRIGGER:** Tick fires with active FlowLink to enemy
2. **EVENT:** Engine processes combat vector
3. **COMBAT:** Asymmetric Damage + Pinning applied
4. **DATA FLOW:** Source & Target take damage simultaneously
5. **FEEDBACK:** Damaged ship counts rise, Repair inhibited
6. **CAPTURE:** If Active <= 0, attacker conquers. Damaged ships 50% destroyed, 50% captured.

### Validation Criteria
- [x] Attackers take damage at Source (Remote Return Fire)
- [x] Defenders accumulate Damaged status
- [x] Repair rate drops when under attack
- [x] Overwhelm triggers instant win for massive disparity
- [x] Damaged ships persist until conquest

---

## [US-006] Win or Lose

**Narrative:** As a **Player**, I want the **game to end when I conquer all stars or lose all mine**, so that I can **see my final score**.

**Status:** `[x] COMPLETED`

```mermaid
sequenceDiagram
    participant E as GameEngine
    participant P as Players
    participant S as gameStore
    participant R as ResultsModal

    E->>E: tick() → checkWinCondition()
    E->>P: Count stars per player
    Note over P: Red has 0 stars and 0 ships
    E->>P: red.isEliminated = true
    E->>E: Count remaining players
    Note over E: Only 1 active player
    E->>E: winner = blue
    E-->>S: Winner set
    S->>S: currentView = 'results'
    S-->>R: Display ResultsModal
    R->>R: Show VICTORY / stats
```

### Functional Trace
1. **TRIGGER:** Tick completes, win check runs
2. **EVENT:** Player star count reaches 0
3. **GUARD:** Check if only 1 player remains
4. **DATA FLOW:** Winner set, view transitions
5. **FEEDBACK:** Results modal displays with stats

### Validation Criteria
- [x] Eliminated toast shown when player loses all stars
- [x] Game ends when only 1 player remains
- [x] Results modal shows correct winner
- [x] Stats displayed (time, peak fleet, etc.)
- [x] VICTORY or DEFEAT shown appropriately

---

## [US-007] Replay or Return to Menu

**Narrative:** As a **Player**, I want to **play again or return to menu after game ends**, so that I can **continue playing**.

**Status:** `[x] COMPLETED`

```mermaid
sequenceDiagram
    participant U as Player
    participant R as ResultsModal
    participant S as gameStore
    participant E as GameEngine

    alt Play Again
        U->>R: Clicks "PLAY AGAIN"
        R->>S: restart()
        S->>E: restart()
        E->>E: Reset state, regenerate map
        E->>E: start()
        S->>S: currentView = 'game'
    else Return to Menu
        U->>R: Clicks "MAIN MENU"
        R->>S: returnToMenu()
        S->>E: destroy()
        E->>E: clearInterval, cleanup
        S->>S: engine = null
        S->>S: currentView = 'menu'
    end
```

### Functional Trace
1. **TRIGGER:** User clicks result screen button
2. **EVENT:** Button action dispatched
3. **DATA FLOW:** Engine reset or destroyed
4. **FEEDBACK:** View transitions appropriately

### Validation Criteria
- [x] PLAY AGAIN resets with same settings
- [x] MAIN MENU returns to menu view
- [x] Engine properly cleaned up on menu return
- [x] New game starts fresh (no lingering state)

---

## [US-008] Visual Feedback (Surge Animation)

**Narrative:** As a **Player**, I want to **see ships pulse outward when attacking**, so that I can **intuitively understand the flow of battle**.

**Status:** `[x] COMPLETED`

```mermaid
sequenceDiagram
    participant E as GameEngine
    participant S as gameStore
    participant C as GameCanvas
    participant P as PixiJS

    E->>E: tick() starts
    E-->>S: tickProgress = 0
    S-->>C: Snapshot with tick start
    
    loop Animation Frame
        C->>C: Calculate t = tickElapsed / tickDuration
        C->>P: Interpolate ship positions
        P->>P: Idle ships: orbit around star
        P->>P: Attacking ships: surge toward target
        Note over P: Amplitude = sin(t * PI) * 0.3
    end
    
    E->>E: tick() ends
    E-->>S: tickProgress = 1, new snapshot
    S-->>C: Ships snap to new positions
```

### Functional Trace
1. **TRIGGER:** Tick fires, requestAnimationFrame loops
2. **ANIMATION:** Ships interpolate between states
3. **ORBIT:** Idle/damaged ships circle their star
4. **SURGE:** Attacking ships pulse outward (30% at peak) and return
5. **FEEDBACK:** Visual rhythm matches tick rate (sinusoidal pulse)

### Validation Criteria
- [x] Idle ships orbit in circular/chaotic pattern
- [x] Attacking ships surge outward on tick (30% distance at peak)
- [x] Surge uses sinusoidal interpolation (smooth pulse-return)
- [x] Animation feels "rhythmic" and "pulsing"
- [x] Damaged ships stay in orbit, never surge

---

*Update this file when: Starting new features, refactoring user-facing flows, marking stories complete.*
