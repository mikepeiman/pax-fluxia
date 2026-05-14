# Pax Fluxia - Developer Overview

## Purpose

This is the most concise summary of **what Pax Fluxia is, how to play it, and what mechanisms, constraints, and dynamics matter most** for someone designing advanced features, roadmap work, or game variations.

This is a **developer-facing overview**, not the ground-truth tuning sheet. For exact formulas and live mechanical authority, see:

- `.agent/docs/game/design/MECHANICS.md`
- `.agent/docs/game/design/GAME_SPECIFICATION.md`

## One-Sentence Summary

**Pax Fluxia is a tick-based real-time strategy game of galactic conquest where players route force across a connected star graph, using production, remote combat, reinforcements, and timing to take stars and control territory.**

## What The Game Is

### At a high level, Pax Fluxia is fundamentally:

- a **map-topology strategy game**
- a **synchronized-tick warfare game**
- a **flow-of-force game**

The map is not background scenery. The **star graph and lane connectivity are the terrain**. Strategy is about:

- where force is produced
- how force can flow
- which fronts are exposed
- how timing and persistence of orders shape the next few ticks

### How To Play

At the highest level, the player does one core action:

1. **Select stars, and issue or cancel orders along connected lanes**

### Mechanically - the Order Model

1. Player can click on and off of stars to select them; they can also click and drag through a series of stars.
When a player clicks on a star, or drags through it, is becomes the active (selected) star. Thus, in a drag-through action, the selected star becomes whichever star the mousedown has just entered the hitbox of. The final active star of the moment will be whatever star the dragthrough is released (mouseup action) on. 
2. Orders would be issued from the starting star of the drag, chained through all subsequent stars to the final star of that drag.
3. Right-click on a star cancels outgoing orders from that star.

Each owned star can be:

- idle
- reinforcing a friendly star (travel orders)
- attacking an enemy star (attack orders)

Orders are persistent until explicitly canceled.

That persistence is one of the game’s defining rules:

- an empty star with an order keeps that order
- reinforcements arriving at that star continue flowing onward
- chained intent matters more than single-click tactics - this is crucial to the "flow" feel of the game

#### Future concepts:
- Predetermined group orders, determined algorithmically:
  - "Reinforce frontlines" will direct ships to distribute amongst all owned stars with enemies adjacent
    - Reinforce equal distribution
    - Reinforce proportional distribution (proportional to enemy forces)
  - Shock & Awe: all forces directed to target one or multiple selected enemies
  - Territory hold: evenly distribute ships, including in backlines
There could be other modes and commands that might enrich the tactical experience.

- Per-map "constellations": sets of stars that, when all owned by one player, serve to either provide bonuses or secure game objectivews. This dynamic alone provides a strong foundation for roguelike progressive gameplay.
- Order Splitting: potentially we could implement a system where a single star could issue orders simultaneously to more than one target (whether transfer or attack).

## Strategic elements
It is worth mentioning that strategy & tactics are used fairly interchangeable here; though the distinction could potentially be made useful, if we distinguished these aspects.

Pax Fluxia gains its depth from the underlying mechanics:

#### Ships and combat; "pinning" gameplay mechanic
1. Ships are both destroyed and damaged during combat, on both the offensive and defensive side (eg. rates of 10-25% per tick)
2. Ships are repaired automatically every tick, at a rate which depends on the star type
3. Stars under attack have their repair rate dramatically suppressed, which introduces a crucial important dynamic called "pinning forces", where a much smaller force can achieve a major tactical advantage by maintaining and unwinnable attack; because being under attack by any size of force suppresses ship repair at that star, rendering the majority of ships inactive/out of action.
   1. Additionally, victory in a conquest has three outcomes:
      1. Retreat conquest: the losing player actively directs their ships to abandon the star; victor captures the smallest percentage 
      2. Scatter conquest: the losing player held defenses until loss; their surviving ships are automatically scattered to all friendly connected stars; victor capture rate is higher than retreat capture
      3. Complete capture: the loser is surrounded and has no exits; when they lose, the victor captures the majority of ships (unless some future roadmap feature provides another variable or special ability...)
4. Additionally, the pool of damaged ships at a star contribute to its defensive power, at a certain rate (eg. each ship contributes 10-50% of a normal ship defensive value)

#### Star Types and attributes
Stars each have a type (out of 6 available), with one being basic, and five each have a 2X attribute boost in one attribute 
   1. [BLUE STAR, CIRCLE] Transit rate: how quickly this star can receive or disptch ships
   2. [RED STAR, SQUARE] Attack strength
   3. [GREEN STAR, TRIANGLE] Defensive strength
   4. [PURPLE STAR, HEXAGON] Repair rate
   5. [YELLOW STAR, PENTAGON] Production rate: ships are produced every tick at every star (eg. 1 ships every 2.5 ticks default)
   6. BASIC STAR, no bonses

### Player Fantasy And Core Experience

The player is commanding a galactic network, not micromanaging individual ships.

The intended feel is:

- issue strategic flow orders across the sector
- watch fronts intensify or collapse on the tick
- exploit star specializations and map topology
- chain captures into deeper breakthroughs

The game should reward:

- positional foresight
- timing
- topology reading
- pressure management across multiple fronts

And likewise, crucially, ***the game must produce a visual aesthetic, and specific VFX/effects and design choices that make these factors visible and interpretable.***

### Win Condition

The standard win condition is simple: complete conquest of the map; total ownership. However, as mentioned above as a roadmap feature: in future, victory might be attainable by other factors, like constellation capture, economic thresholds, or other criteria.

## Core World Model

### Stars

Stars are the basic strategic units. Each star:

- belongs to a player or to `neutral`
- produces ships
- stores active and damaged ships
- may have an active order
- may have a deferred order that activates on conquest
- has a ***TYPE*** which determines its special bonus (currently simple, one-dimensional; in future could be much more varied, a la RPG-style attributes spreads and customization)

### Ships

- these are (currently) of only one type, and are rendered as dots; they occur as an abstraction

#### Future:
- multiple distinct ship types
  - available options produced by specific star or structure types?
  - available options given by player character/race?
  - available options given by player-built improvements/upgrades?

### Lanes

Lanes are the only routes of interaction.

If two stars are not connected:

- they cannot reinforce each other
- they cannot attack each other

### Territory

The map is the territory. Territory is comprised of regions, with each region being a collection of connected same-owner stars. A player may have more than one region. The boundaries between regions, and around regions bordering empty space, are called borders. 

#### Rendering

- Regions are "filled". Thus, they have fills and borders which can receive visual effects. The way this is done dramatically shapes the game experience, and the semantics/legibility of the strategic game dynamics. 
- Ships are drawn as dots, orbiting stars in concentric, close rings, collectively forming an even mass of dots in ~five layers around stars. These can be rendered as static, or rotating, or other effects (eg. pulsing).
- When attacking, the whole mass of ships "surges" towards the enemy, along the connecting lane. This is a rhythmic pulse that occurs every tick while combat is active. On conquest, the surge continues, with a set percentage of the ships transferring immediately to the newly-conquered star.

#### Future:
- currently that conquest-transfer amount is global. In future it could be exposed to the player as a free individual choice to apply strategically. We would then want quick click controls and keyboard shortcuts to the player can predetermine that percentage for a given conflict, or globally. 

## The Game Loop

The game runs on a synchronized tick. Every tick resolves in this order:

1. **Production**
2. **Orders**
3. **Repair**
4. **Stats aggregation**
5. **Combat resolution**
   1. Win check
   2. Ships destroyed
   3. Ships damaged

This order is important so we have coherent and consistent gameplay. It has a subtle but real effect on the game’s rhythm and balance.

## Key Mechanical Systems

### 1. Production

Owned stars generate ships every tick. This is the economic engine of the game. Default rate eg. `0.4`, = 1 ship every 2.5 ticks, while as previously mentioned, yellow stars get double production.

#### Future concepts:
- Total area of region could provide a 2nd economic quantity; given that stars have unequal territory, depending on the specific topology of the given map.
- Additional attributes via "special stars" and/or "special bonuses" (local or global) could provide further complexity. Eg. "constellations" could provide this kind of bonus.
- Built structures like "starbases, "moons" or "planets" could provides additional economic and combat attributes

### 2. Transfer / Reinforcement

Friendly orders send ships along lanes over time, constrained by the global transfer rate of stars.

#### Future:
- Players may be allowed to adjust their own transfer rates within certain limits as a strategic consideration; or they may be able to invest in upgrades to this capacity, whether per instantiated star, or per star type, or globally.

### 3. Combat

Simply, attack orders issued between enemy stars cause combat for each tick they are active. As mentioned, there is an "attack surge" animation which is crucial to the feel and visual intelligence of the game.

### 4. Damage States

Ships have two main states:

- **active**
- **damaged**

Damaged ships still matter:

- they contribute weakly to defense
- they can be repaired back into active force
- they typically constitute the majority of a retreating or captured force

This gives the game attrition depth instead of making every fight purely binary.

### 5. Conquest

A star changes ownership when the conditions are met:
- attacking force exceeds defending force by a certain ratio (eg. 5:1 to 25:1; global tuning per-match available)

Conquest is not just ownership transfer. It also:

- moves part of the victor’s force into the captured star
- resolves surviving defender escape behavior
- can activate deferred orders
- changes the region composition and thereby the rendering of territory totality

### 6. Scatter / Retreat

When a star falls, surviving defenders may:

- retreat to a friendly order, if that order is active on the tick combat resolves
- scatter to connected friendly neighbors, if no retreat order is given
- or be fully captured if trapped

This system prevents conquest from being too clean and adds positional value to escape routes and network shape, as well as the tactical decision and reflexes to retreat or not.

### 7. Deferred Orders

Deferred orders are one of the game’s most strategically distinctive mechanics.

They allow a player to say, effectively:

- “when this star becomes mine, keep moving there next”

This supports:

- breakthrough planning
- deep attack chains
- momentum play
- intentional routing through enemy-held junctions

## Star Specialization Model

Star types are a strong source of asymmetry. Each type has a 2x bonus in one axis.

The core roles are:

- **Yellow**: economy / production
- **Blue**: logistics / transfer speed
- **Purple**: repair / attrition recovery
- **Red**: defense / fortress role
- **Green**: attack / assault role
- **Grey**: baseline / neutral role

Additionally, some maps may contain "portals": these occur as stars that exist in multiposition (usually two places only). When a player occupies one, that exact same force shows up at both locations equally and simultaneously. Thus, they
- Defend against attacks from stars connected to either portal location simultaneously
- Can attack or move only from one portal location at a time (it is truly only one, singular fleet)

## Strategic Dynamics That Actually Matter

### Topology Is Everything

The most important design truth in Pax Fluxia is:

- **the graph is the battlefield**

Map shape determines:

- chokepoints
- interior lines
- escape routes
- reinforcement efficiency
- whether a front is shallow or deep

### Pressure Is Continuous, Not Turn-Burst

Because orders persist and combat resolves every tick.

### Logistics Compete With Front Strength

Players are always balancing holding force at the front versus moving force elsewhere.
A star sending ships away may weaken itself at exactly the wrong time.

### Attrition Matters

Because damage is split between destruction and disablement:

- losing a fight is not always immediate death
- repair stars and fallback lines matter
- repeated low-grade pressure can still decide the game
- reckless attacking has a cost (attacking causes more attrition than defending, in most situations)

## Important Constraints And Invariants

These are the rules future features should not casually violate.

### Connectivity Constraint

Only connected stars interact directly.

If a new mechanic bypasses graph connectivity, it is no longer standard Pax Fluxia and should be treated as a deliberate variation.

### Persistent Order Constraint

Orders persist until canceled.

This is not cosmetic. It is a core part of the game’s flow identity.

### Remote Combat Constraint

Enemy attacks are remote engagement, not physical transfer at a location away from the star.

If a variation changes this, it meaningfully changes the game’s combat identity.

### Neutral Ownership Constraint

Neutral is a real owner state, not a missing value.

Neutral stars, ship forces, and territory do contribute to gameplay and geometry meaningfully, even though passive; neutral stars can have ships, which serve both as obstacles to active-player expansion, and resources that can be captured.

### Lane Territory Constraint

Territory systems are expected to preserve lane readability:

- a lane should belong to one owner or be contested by two owners
- a third player must never visually intrude on that lane corridor

This is a rendering/geometry constraint in order to provide strategic readability ("visual intelligence").

## Where Roadmap And Variations Naturally Live

The most fertile variation axes are:

### Map / Topology Variations

- authored maps
- generated maps
- density and spacing models
- chokepoint frequency

### Combat Variations

- lethality
- aggressor advantage / defender advantage
- overwhelm thresholds
- damaged-ship usefulness
- conquest transfer rules

### Economy Variations

- production rates
- repair rates
- transfer rates
- star-type asymmetry strength

### Command / Flow Variations

- deferred order depth
- persistence rules
- retreat behavior
- multi-order routing systems

### Victory / Match Structure Variations

- elimination
- score / territory control
- timed modes
- sector campaigns
- multi-sector escalation

## Short Definition

If you need the shortest possible developer-facing description:

**Pax Fluxia is a real-time, synchronized-tick graph-conquest strategy game where persistent orders route force through a star network, combat is remote and attritional, conquest changes the routing topology, and the main strategic skill is controlling pressure, flow, and front structure across the map.**
