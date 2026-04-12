# Post-Mortem - 2026-04-12 - Directed Lane Path Regression

## What Happened

I introduced a major directional regression when I added shared lane-path consumption across arrows, surge headings, and ship travel.

The lane cache stores a single polyline per **undirected** edge using canonical star-id order. I then reused that cached path in several **directed** runtime features without reversing it for the `B -> A` case.

That created mixed symptoms:

- order arrows drawn backward
- issued orders behaving backward or inconsistently
- attack surge pulsing in the wrong direction
- travel/conquest path setup reading the wrong start/end order when source/target IDs were reversed

Because only some edges have `sourceId <= targetId`, the bug appeared inconsistent in play instead of failing uniformly.

## Root Cause

I made a boundary/ownership mistake:

- **Correct ownership**: lane cache = undirected canonical storage
- **Correct consumer contract**: movement/arrows/surge = directed path request
- **My mistake**: I treated canonical storage as if it were already a directed API

This was not a random typo. It was a design error in how I translated shared map geometry into runtime motion/presentation.

## Why I Made It

My reasoning was too local.

I saw multiple systems needing the same lane polyline and optimized for reuse of the cached path, but I did not stop and ask the crucial contract question:

**"Is this path being consumed as geometry only, or as a directed motion path?"**

That is exactly the kind of systems-boundary check I should have made first.

## How I Diagnosed It

The user report was the key:

- reversed arrows
- reversed orders
- reversed surge
- inconsistent directionality

That symptom pattern strongly suggested a canonical-order vs runtime-direction mismatch.

I then traced:

1. lane cache storage in `lanePolylineCache.ts`
2. directed consumers in:
   - `applyLaneTravelPath.ts`
   - `LaneRenderer.ts`
   - `ShipRenderer.ts`
   - `GameCanvas.svelte`
3. runtime proof that `A -> B` and `B -> A` were reading the same stored path order

From there, the right fix was clear: make direction explicit at the API boundary.

## Fix

Added a directed read helper:

- `getDirectedLanePolyline(sourceId, targetId)`

Applied it to the direction-sensitive consumers:

- ship lane setup
- transfer handler
- order arrows
- attack surge heading

Also added a regression test proving:

- `A -> B` returns forward order
- `B -> A` returns reversed order

## Result

The architectural state is better now than before:

- cache remains canonical and undirected
- motion/presentation consumers now request directed geometry explicitly

That is the right split.

## Rule Added

When a shared geometry cache uses canonical/undirected storage, every motion or direction-sensitive consumer must go through an explicit directed adapter. Never let runtime direction be an implicit assumption.
