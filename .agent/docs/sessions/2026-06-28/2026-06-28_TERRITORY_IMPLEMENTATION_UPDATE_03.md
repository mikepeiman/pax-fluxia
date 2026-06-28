# Territory Implementation Update 03

Timestamp: 2026-06-28 15:58 America/New_York

## Core Question

Is repeated physical-board checking necessary or beneficial during a loaded game?

Answer: no. The physical board layout is fixed after the game starts. Star ownership can change, and territory must react to that. Star positions, lane connections, and board size should not be rescanned every frame inside the runtime worker.

## What Was Tried First

I first tried to reuse the previous physical-board signature when the worker received the same `stars` and `lanes` array objects again.

That was not enough. The real app rebuilds those arrays while preserving the same physical board. A fresh benchmark showed this failure clearly:

- Map: `First Symmetry-6_April 17b`
- Size: 172 stars, 428 runtime connections
- Mode: `territory_runtime`
- Worker physical-board scans: 500
- Repeated scans that found the same board again: 498
- Time spent on those scans: about 93ms during a roughly 1.8s sample

## Working Fix

The runtime path now passes a `boardLayoutKey` with each territory frame. In plain terms, this key says: "this is the same loaded board for this game session."

The key is based on:

- game session id
- star count
- lane count
- world width and height

The runtime worker now uses that key instead of repeatedly reading through the physical board. Ownership still has its own version, so captures still invalidate and update territory correctly.

Callers that do not provide a `boardLayoutKey` still use the older full-scan path. That keeps tests and non-game callers conservative.

## Verified Result

Fresh benchmark after the fix:

- Map: `First Symmetry-6_April 17b`
- Size: 172 stars, 428 runtime connections
- Mode: `territory_runtime`
- Worker physical-board scans: 0
- Board-layout-key uses: 546
- Worker cache misses: 1
- Worker cache hits: 545
- Transition fallbacks: 0

Frame timing in the same run:

- Average frame: 8.905ms
- 95th percentile frame: 16.6ms
- Max frame: 16.8ms
- Over 20ms frames: 0
- Over 33ms frames: 0

## Important Limits

This specifically improves the clean runtime territory path measured in `territory_runtime`.

It does not prove every render mode is fixed. The next work still needs mode-by-mode checks for vector, Grid Gradient, Cell Grid, and transition-heavy captures.

The largest remaining measured cost in this runtime sample is Pixi stage rendering, not territory geometry calculation.
