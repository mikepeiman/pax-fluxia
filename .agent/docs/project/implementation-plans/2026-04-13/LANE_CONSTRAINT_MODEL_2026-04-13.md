# Lane Constraint Model - 2026-04-13

## Purpose

Define the canonical lane-constraint model so lane work stays explicit about:

- star layout
- connectivity
- lane geometry
- forces

and never conflates lane reshaping with connectivity recomputation again.

## Map Layers

Every map has four separable layers:

1. `star layout`
   - star positions
2. `connectivity`
   - which star pairs are connected
3. `lane geometry`
   - the actual line used for each connection
4. `forces`
   - ownership, ship counts, and other starting-state values

## Map Defaults

- `Random`
  - star layout: generated
  - connectivity: generated
  - lane geometry: derived
  - forces: assigned
- `Classic`
  - star layout: authored
  - connectivity: authored
  - lane geometry: derived from authored connectivity
  - forces: assigned
- `Custom`
  - star layout: authored
  - connectivity: authored
  - lane geometry: derived from authored connectivity
  - forces: authored or assigned from map content

## Runtime Operations

Two operations must stay distinct:

- `reshape lanes`
  - preserves star layout
  - preserves connectivity
  - recomputes only lane geometry
- `recompute connectivity`
  - preserves star layout
  - rebuilds connectivity under constraints
  - then derives lane geometry from that new connectivity

Default behavior:

- On authored maps, changing lane-constraint controls should call `reshape lanes`.
- On random maps, topology-sensitive controls may call `recompute connectivity`.
- Authored maps may opt into `recompute connectivity` with an explicit toggle.

## Lane Margin Definition

`Lane Margin` means:

- the distance from the center of a non-endpoint star
- to the nearest point on a lane

## Canonical Hierarchy

1. Full traversal connectivity is the highest constraint.
2. If a straight line satisfies Lane Margin, keep it straight.
3. If a straight line violates Lane Margin, reshape lane geometry first.
4. If reshape fails:
   - on fixed-connectivity maps, keep the authored connection and mark it `constraint_unsatisfied_authored`
   - on connectivity-recomputing runs, remove that connection and seek replacement connections
5. If the feasible connectivity graph is still disconnected, reconnect it explicitly.
6. Minimum/maximum connection-count targets are weakest.

## Reshape Bias

Internal meaning:

- `0%`
  - do not reshape violating connections
  - during connectivity recomputation, remove them immediately
  - on fixed-connectivity maps, keep the connection but mark it unsatisfied
- `100%`
  - exhaust deterministic reshape attempts before allowing removal
- intermediate values
  - scale deterministic search budget, not topology ambiguity

## Connection Status Values

Per-connection diagnostic status:

- `straight_ok`
- `reshaped_ok_angular`
- `reshaped_ok_curved`
- `constraint_unsatisfied_authored`
- `removed_for_constraint`
- `connectivity_restore`

## Diagnostics Requirements

Audits must report:

- whether connectivity was preserved or recomputed
- requested Lane Margin
- straight-line minimum distance
- final minimum distance
- blocking stars and nearest-point distances
- whether reshape was attempted
- why each attempt failed
- final connection status

## Current Implementation Hooks

- Shared geometry builder:
  - `C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia\\common\\src\\mapgen\\lanePolylines.ts`
- Authored/generated runtime split:
  - `C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia\\pax-fluxia\\src\\lib\\stores\\gameStore.svelte.ts`
- In-game control surface:
  - `C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia\\pax-fluxia\\src\\lib\\components\\ui\\settings\\ControlsSection-Visuals.svelte`
- Audit tooling:
  - `C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia\\tools\\debug\\audit-lane-constraints.ts`
