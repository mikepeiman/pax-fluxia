# 02 — Event Matrix: Attack-Conquest Ship & Star Animations

**Date:** 2026-02-13

## Mermaid Diagram 1: Engine Tick Sequence

```mermaid
flowchart TD
    TICK["executeTick() — tick++"]
    TICK --> P1["Phase 1: Production<br/>star.activeShips += production"]
    P1 --> P2["Phase 2: Transfers<br/>Move ships between friendly stars"]
    P2 --> T_CHECK{"star.targetId &&<br/>same owner?"}
    T_CHECK -- Yes --> T_MOVE["source.activeShips -= shipped<br/>target.activeShips += shipped<br/>emit TransferEvent"]
    T_CHECK -- No --> P3
    T_MOVE --> P3["Phase 3: Combat<br/>Group attackers by target"]
    P3 --> C_CALL["resolveMultiSourceCombat()"]
    C_CALL --> C1["Step 1: Filter valid attackers<br/>(activeShips > 0, targetId = defender.id)"]
    C1 --> C2["Step 2: Aggregate force<br/>Group by owner"]
    C2 --> C3["Step 3: Calc defender force<br/>(active + damaged × effectiveness)"]
    C3 --> C4{"defenderForce <= 0?"}
    C4 -- Yes --> INSTANT_CONQ["Instant conquest<br/>applyConquest(victor, defender)"]
    C4 -- No --> C5["Step 5: Weighted attack mult"]
    C5 --> C6["Step 6: calculateCombat()<br/>Symmetric damage"]
    C6 --> C7["Step 7: Apply to defender<br/>defender.activeShips -= damage"]
    C7 --> C8["Step 8: Apply to attackers<br/>proportional damage back"]
    C8 --> C9{"defender.activeShips <= 0<br/>OR overwhelm threshold?"}
    C9 -- Yes --> CONQ["applyConquest(victor, defender)"]
    C9 -- No --> EMIT_COMBAT["emit CombatEvent<br/>(conquered: false)"]
    CONQ --> EMIT_BOTH["emit CombatEvent (conquered: true)<br/>emit ConquestEvent"]
    INSTANT_CONQ --> EMIT_CONQ["emit ConquestEvent<br/>(no CombatEvent if defenderForce=0)"]
    EMIT_COMBAT --> P4
    EMIT_BOTH --> P4
    EMIT_CONQ --> P4
    P4["Phase 4: AI<br/>Phase 5: History"]
    P4 --> DONE["onTick(state)<br/>onTickEvents(events)"]
```

## Mermaid Diagram 2: Visual Ship Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Orbiting: Ship created
    
    Orbiting --> Departing: TransferEvent OR\nConquestEvent("travel" mode)
    note right of Departing: ship spliced from\nvisualShips[source]\nset departFromX/Y\npushed to travelingShips[]
    
    Departing --> Traveling: departDuration elapsed\nship.x eased to laneStartX/Y
    note right of Traveling: Linear interpolation\nalong lane with wobble\nship.laneOffset perpendicular
    
    Traveling --> Arriving: travelDuration elapsed\nship.x reaches laneEndX/Y
    note right of Arriving: Ship added to\nvisualShips[destination]\nsettleStartRadius = arrival distance\nsettleStartAngle = arrival angle

    Arriving --> Settling: settleStartTime set
    note right of Settling: Polar arc ease\nfrom settleStartRadius → orbit radius\nfrom settleStartAngle → orbit angle\neaseOutCubic over SETTLE_DURATION_MS

    Settling --> Orbiting: settle complete (t >= 1)\nship.x = targetX, ship.y = targetY

    Orbiting --> Orbiting: Normal orbit\ngetOrbitSlot() for position\nattack surge displacement\norbit bias toward target
    
    Orbiting --> Killed: CombatEvent damage\nship removed from visualShips[]
```

## Mermaid Diagram 3: Conquest Event Handler (Client)

```mermaid
flowchart TD
    CE["ConquestEvent received<br/>in processTickEvents()"]
    CE --> GET_STAR["conqueredStar = starsById[conquest.starId]"]
    GET_STAR --> DEF_SHIPS["ships = visualShips[conquest.starId]<br/>(defender's visual ships)"]
    
    DEF_SHIPS --> SCATTER_CHECK{"scatterTargetIds<br/>exists & length > 0?"}
    SCATTER_CHECK -- Yes --> SCATTER["SCATTER BRANCH<br/>Splice escapingCount ships<br/>Set state='departing'<br/>fromStarId=conquest.starId<br/>toStarId=scatterTarget<br/>Push to travelingShips[]<br/>Remaining: change color to newOwner"]
    
    SCATTER_CHECK -- No --> RETREAT_CHECK{"retreatTargetId<br/>exists?"}
    RETREAT_CHECK -- Yes --> RETREAT["RETREAT BRANCH<br/>Splice escapedCount ships<br/>Set state='departing'<br/>fromStarId=conquest.starId<br/>toStarId=retreatTarget<br/>Push to travelingShips[]<br/>Remaining: change color to newOwner"]
    
    RETREAT_CHECK -- No --> NO_ESCAPE["NO-ESCAPE BRANCH<br/>capturedCount = conquest.shipsCaptured<br/>Trim ships to capturedCount<br/>Change color to newOwner"]
    
    SCATTER --> ATK_CHECK
    RETREAT --> ATK_CHECK
    NO_ESCAPE --> ATK_CHECK
    
    ATK_CHECK{"conquest.attackerStarId &&<br/>shipsTransferred > 0?"}
    ATK_CHECK -- Yes --> ATK_SPLICE["Get attacker visual ships<br/>Score by dot product (nearside)<br/>Splice top N = shipsTransferred"]
    ATK_CHECK -- No --> END["Done"]
    
    ATK_SPLICE --> MODE_CHECK{"CONQUEST_ANIMATION_MODE?"}
    
    MODE_CHECK -- immediate --> IMM["Place ships at conquered star<br/>settleStartRadius = star.radius+8<br/>settleStartAngle = random<br/>settleStartTime = now<br/>← Ships teleport (no travel)"]
    
    MODE_CHECK -- surge --> SURGE["Place ships at conquered star<br/>settleStartRadius = star.radius+40<br/>settleStartAngle = from attacker direction<br/>settleStartTime = now + stagger<br/>← Ships appear from above (no travel)"]
    
    MODE_CHECK -- travel --> TRAVEL["Set ship state='departing'<br/>departFromX/Y = current position<br/>Calculate lane geometry<br/>Push to travelingShips[]<br/>← Ships FLY from attacker to conquered"]
    
    IMM --> END
    SURGE --> END
    TRAVEL --> END
    
    style TRAVEL fill:#0a0,stroke:#0f0,color:#fff
    style IMM fill:#555,stroke:#999,color:#ccc
    style SURGE fill:#555,stroke:#999,color:#ccc
```

## Key Variables

| Variable | File | Line | Purpose |
|----------|------|------|---------|
| `conquest.starId` | TickEvents.ts | 31 | Conquered star ID |
| `conquest.attackerStarId` | TickEvents.ts | 32 | Victor's source star ID |
| `conquest.newOwner` | TickEvents.ts | 34 | New owner player ID |
| `conquest.shipsTransferred` | TickEvents.ts | 38 | How many ships transfer |
| `conquest.shipsCaptured` | TickEvents.ts | 35 | Defender ships captured |
| `conquest.shipsEscaped` | TickEvents.ts | 36 | Defender ships escaped |
| `conquest.retreatTargetId` | TickEvents.ts | 39 | Retreat destination |
| `conquest.scatterTargetIds` | TickEvents.ts | 40 | Scatter destinations |
| `visualShips` | GameCanvas.svelte | 74 | Map<starId, VisualShipState[]> |
| `travelingShips` | GameCanvas.svelte | 79 | Ships in-flight |
| `starsInCombat` | GameCanvas.svelte | 85 | Set for surge animation |
| `CONQUEST_ANIMATION_MODE` | game.config.ts | 121 | 'immediate' / 'surge' / 'travel' |
