# Post-Mortem - 2026-04-12 - Transit Tuning Flattened By Lane-Path Fix

## What went wrong

I fixed the correctness problem of ships not following curved lane paths, but I did it too narrowly.

I treated the lane polyline as if it were the complete motion model, when it should have been treated as the motion spine. That collapsed several user-facing transit shaping controls into "follow the line exactly," especially once a lane polyline existed.

## Root cause

- I optimized for restoring path truth quickly.
- I did not first enumerate the full transit-tuning contract from surfaced controls plus active config.
- I changed the interpolation layer before auditing which variables were supposed to remain expressive on top of the path.
- I failed to explicitly distinguish:
  - path truth
  - motion shaping
  - arrival / settle shaping

## Variables I risked flattening

Surfaced transit controls:

- `TRAVEL_FOLLOW_LANE_PATHS`
- `TRAVEL_MODE`
- `TRAVEL_EASING`
- `TRAVEL_EASING_POWER`
- `TRAVEL_DURATION_MULT`
- `TRAVEL_ARC_INTENSITY`
- `DEPART_MODE`
- `DEPART_STAGGER`
- `SETTLE_DURATION_MS`
- `ARRIVAL_SPREAD`
- `WOBBLE_AMP`
- `DEPART_JITTER_MS`
- `LANE_OFFSET_PX`
- `LANE_CONVERGENCE`
- `LANE_CONVERGENCE_POINT`
- `CONQUEST_ANIMATION_MODE`
- `CONQUEST_TRAVEL_SPEED`
- `CONQUEST_SETTLE_MS`
- `CONQUEST_SURGE_STAGGER_MS`
- Arrowhead conquest transit controls:
  - `ARROW_TAPER`
  - `ARROW_WIDTH`
  - `ARROW_SPEED`
  - `ARROW_EASING`
  - `ARROW_STAGGER_AUTO`
  - `ARROW_STAGGER_MS`
  - `ARROW_ENGULF_MODE`
  - `ARROW_ENGULF_RADIUS`
  - `ARROW_SPIRAL_MIN_DEG`
  - `ARROW_SPIRAL_MAX_DEG`
  - `ARROW_SPIRAL_RANDOM`
  - `ARROW_SPIRAL_DURATION_MS`

Active but unsurfaced or second-order config that still affects transit:

- `DEPART_FRACTION`
- `DEPART_ARC_INTENSITY`
- `ARRIVAL_ARC_INTENSITY`
- `ORBIT_BIAS_STRENGTH`
- `ORBIT_BIAS_OSCILLATE`
- `ORBIT_BIAS_MIN`
- `ORBIT_BIAS_MAX`
- `ORBIT_BIAS_FREQ`
- `ORB_TRAVEL`
- `CONQUEST_LERP_DELAY_MS`
- `CONQUEST_COLOR_DELAY_TICKS`
- `CONQUEST_FLASH_TICKS`
- `CONQUEST_FORCE_GLOW`
- `CONQUEST_FORCE_GLOW_MULT`
- Attack-surge transit-adjacent controls:
  - `ATTACK_SURGE_MULT`
  - `ATTACK_SURGE_PROPORTIONAL`
  - `ATTACK_SURGE_FORCE_COFACTOR`
  - `ATTACK_SURGE_RAMP_MS`
  - `ATTACK_SURGE_SHAPE`
  - `SURGE_PULSE_DURATION_MS`

## Correct model

- Lane polyline = authoritative path spine
- Motion-shaping variables = offsets, easing, timing, convergence, stagger, settle, and arrival behavior layered on top
- Conquest / surge / transfer each may have different setup logic, but they must feed the same runtime transit model

## Fix applied

- Restored `TRAVEL_FOLLOW_LANE_PATHS` as the actual runtime gate instead of hardcoding path-following on
- Reintroduced `TRAVEL_ARC_INTENSITY` as a lateral bulge on top of the lane spine
- Reintroduced `DEPART_ARC_INTENSITY` as departure-phase bulge toward the lane
- Reintroduced `ARRIVAL_ARC_INTENSITY` as extra settle radius for arrival shaping
- Gave conquest travel ships nonzero lane-offset spread so those motion-shaping variables have something to act on there too

## Validation I ran

- `bunx tsc -p C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\tsconfig.json --noEmit --pretty false`
  - passed
- Direct behavior probe:
  - `bezierDepart` with curved lane + arc controls produced `x: 35.25, y: 35.14`
  - `laneTravel` with curved lane + arc controls produced `x: 38.68, y: 48.86`
  - nonzero lateral displacement confirms the shaping controls are again affecting motion instead of motion snapping to the lane centerline only

## Rule derived

Before changing any visual-motion path logic:

1. Enumerate every surfaced and active config variable affecting that motion surface.
2. Classify each as:
   - path truth
   - motion shaping
   - timing / sequencing
   - settle / arrival
3. Preserve or intentionally retire each one explicitly.
4. Do not ship a path-correctness fix that silently collapses shaping variables.
