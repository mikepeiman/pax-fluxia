# Rendering Visual Specification GDD

## Purpose

This document describes how the game should look and behave visually when the rendering architecture is rebuilt cleanly.

It is intentionally written as a player-facing and designer-facing description, not a source-code inventory.

## Core Baseline: Elegant Tactical

## 1. Global Principles

1. The map is terrain.
   - Territory, lanes, stars, and ship movement must make the topology legible at a glance.

2. Territory is trustworthy.
   - Fills and borders must always describe the same frontier.
   - Territory changes must never look like a border says one thing while the fill says another.

3. Rhythm matters.
   - Combat, transfer, conquest, repair, and retreat should read as a pulsing clocked system, not as random particle noise.

4. Readability beats spectacle.
   - Bright effects are allowed, but only if ownership, pressure, direction, and danger stay easy to read.

5. Every important state should have a distinct visual sentence.
   - Idle
   - selected
   - ordered
   - attacking
   - traveling
   - arriving
   - damaged
   - repaired
   - destroyed
   - conquered

## 2. Territory

### 2.1 Idle Territory

Idle territory should read as quiet strategic pressure, not a noisy effect layer.

- Each player owns translucent fill regions that feel like zones of influence rather than opaque paint.
- Each region border is crisp, confident, and exactly aligned with the fill edge.
- The border should be the authoritative territorial statement; the fill should support it, not blur it.
- Each owned star has a guaranteed pocket of territorial breathing room around it. No border should crowd a star so tightly that the star appears to sit on or inside its own boundary line.
- Lane-connected stars of the same owner may share one territorial body when the selected geometry mode declares that they should. Non-connected same-owner regions must remain visually separate when the active geometry rules require it.
- Neutral or unowned space should feel available and readable, not muddy.

### 2.2 Territory During Conquest

Conquest is the most sensitive territory transition because it changes truth, color, and pressure all at once.

- The moment conquest occurs, the system should acknowledge it immediately with a star-level event, but the territorial handoff should remain legible and spatially coherent.
- Fill and border transition on the same timing envelope.
- At no point may the border leap ahead of the fill or the fill bleed across a border that has not moved.
- The losing color should contract with dignity; the winning color should occupy space with momentum.
- Transition motion should emphasize frontier reallocation, not arbitrary mesh warping.

### 2.3 Territory During Live Geometry Control Changes

Geometry-affecting controls are part of the rendering design, not a debug afterthought.

- If the user changes Chaikin smoothing, buffer radius, resampling density, corridor policy, disconnect policy, or other geometry controls during runtime, the territory should remain trustworthy.
- The system may recompute, debounce, or briefly restage the transition, but it may not produce illegal topology or fill/border mismatch.
- Small geometry adjustments should feel like the map is refining itself.
- Large topology-affecting adjustments may use a controlled retessellation or controlled transition reset, but that reset should be explicit and visually stable rather than glitchy.

## 3. Stars

### 3.1 Star Body

- The star itself is the anchor of the whole map.
- Body shape communicates star type.
  - Grey reads neutral and stable.
  - Yellow reads productive.
  - Blue reads fast and logistical.
  - Purple reads repair-oriented.
  - Red reads defensive.
  - Green reads aggressive.
- The ownership ring is separate from the body so player ownership and star identity do not collapse into one signal.

### 3.2 Selected And Active States

- Selection should be unmistakable but not overwhelming.
- The selection overlay should frame the star rather than smother it.
- Dragging from a star should temporarily upgrade it into an "active source" state.

### 3.3 Conquest State

- During delayed color handoff, the star should visibly remember its previous owner until the conquering transfer lands.
- A conquest flash should mark the event as decisive, brief, and intentional.

### 3.4 Labels

- Labels should read like tactical instrumentation.
- Active ship count is the primary numeric signal.
- Damaged ship count is secondary and visually dimmer.
- Leash lines should keep labels connected without cluttering the star itself.
- Numeric changes should interpolate cleanly, never jitter or pop noisily.

## 4. Lanes And Orders

### 4.1 Lane Bodies

- Lanes are structural topology, not decoration.
- They should be visible even when nothing is moving.
- Gaps around stars and intervening stars keep the lane network readable and prevent line collisions.
- A shadow or under-stroke pass is appropriate because it separates lanes from fills and other map clutter.

### 4.2 Orders

- Confirmed orders should look deliberate and stable.
- Pending orders should look real but slightly provisional.
- Deferred orders should look queued and conditional.
- Arrow length, shaft width, and head readability matter more than flourish.

### 4.3 Future Contested Lane States

The current game needs a better language for lane occupation and contest, especially under the two-player-on-lane rule.

Desired behavior:

- If only one side is visibly flowing through a lane, the lane should feel controlled and directional.
- If both sides are present, the lane should show controlled conflict without becoming illegible.
- This should likely be represented as split occupancy, braided flow, dual-edge accents, or centerline contention markers rather than as a full territory fill.

## 5. Ships

## 5.1 Orbit Idle

- Active ships are solid, vivid dots arranged in concentric orbit rings.
- The orbit should feel alive, not static wallpaper.
- Orbit motion should imply energy under command, not random buzzing.
- Larger groups should feel denser and more pressurized.

## 5.2 Orbit Contested

- When a star is attacking or under pressure, orbit behavior should become directional.
- Biasing the orbit toward a target is desirable as long as it stays readable and does not look like travel has already begun.

## 5.3 Damaged State

- Damaged ships should never be confused with active ships.
- They should feel impaired, vulnerable, and partially withdrawn from the main orbit.
- A separate damaged orbit or danger-avoidance cluster is appropriate.

## 5.4 Friendly Transfer / Transport

Friendly transfer is the main physical travel behavior in the game.

Desired sequence:

1. Ships leave their orbit cleanly.
2. They converge into a lane-committed travel shape.
3. They move visibly along the lane.
4. They hand off cleanly at arrival.
5. They settle into the destination orbit without teleporting.

This sequence must begin immediately on event dispatch, not one tick later.

## 5.5 Attack

Attack is remote engagement, not physical transfer.

Desired behavior:

- Ships do not leave the attacking star during ordinary attack.
- Instead, the attacking orbit performs an aggressive forward surge toward the target.
- The surge should have a clear lifecycle: engage, peak, resolve.
- Direction should remain stable for the duration of a surge pulse.
- Stronger forces may justify stronger surge amplitude, but only if readability stays intact.

## 5.6 Conquest

Conquest is where strategic truth becomes physically embodied.

Desired behavior:

- The conquering player's ships visibly claim the conquered space.
- The star color delay, territory transition, and ship transfer should feel like parts of one event, not unrelated animations.
- Different conquest transfer modes may exist, but each should still obey the same narrative:
  - origin pressure
  - route commitment
  - target capture
  - orbit settlement

Arrowhead and surge-style conquest modes are desirable variants because they communicate force concentration and landing momentum clearly.

## 5.7 Repair

Repair should have a visible language distinct from both damage and normal idle state.

Desired behavior:

- A repaired ship or repaired cluster should visibly rejoin readiness.
- Good cues include pulse-in, color restoration, or reinsertion into the active orbit ring.
- Repair should feel restorative and controlled, not explosive.

## 5.8 Destruction

Ship destruction is currently under-expressed and should become legible.

Desired behavior:

- There should be a readable moment of loss.
- The effect can be subtle, but it should not be silent.
- Good directions include fade fracture, brief spark breakup, or radial micro-burst aligned to combat intensity.
- Cleanup should be fast and clean so it does not pollute the tactical view.

## 6. Timing Rules

- All in-game rendering and FX timing should run on one game clock.
- Speed changes and pause state must affect all visual lifecycles coherently.
- Territory transitions, ship transfers, conquest landings, repair pulses, and destruction cleanup should all respect the same time-domain discipline.

## Optional Visual Variants

## 1. Cinematic Flow

- Stronger glows, bolder arrival arcs, richer conquest bursts, more pronounced lane motion.
- Suitable for showcase mode or replays.
- Not the default competitive baseline.

## 2. Cartographic Command

- Territory borders become more map-like and surveyor-clean.
- Fills are calmer and flatter.
- Good for maximum strategic clarity and low-distraction play.

## 3. High-Spectacle Conflict

- Richer attack surge, stronger conquest landings, optional ship trails, optional border energy.
- Should remain an optional branch because it can easily overpower the topological clarity of the map.

## Non-Negotiable Visual Rules

- Territory fill and border must share canonical frontier truth.
- Geometry-affecting controls belong to Geometry, not Presentation.
- Remote attack must remain visually distinct from physical transfer.
- Conquest must read as one coherent event across star, ships, and territory.
- Damage, repair, and destruction must each gain their own readable state language.
