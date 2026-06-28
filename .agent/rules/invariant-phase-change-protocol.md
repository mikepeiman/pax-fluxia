# Invariant And Phase-Change Protocol

**Created:** 2026-06-28 15:08:18 -04:00
**Status:** Active rule
**Purpose:** Prevent agents from building logic around impossible runtime changes.

## Core Rule

Repeated sameness is a signal.

When a value repeatedly stays the same across the runtime interval being studied,
stop and ask whether it is an invariant. Before adding detection, cache
invalidation, fallback logic, tests, diagnostics, or recovery paths around that
value changing, identify the exact game phase where it is allowed to change.

If no current product spec permits the change, treat the change as a bug
condition or bad measurement, not a normal runtime case to support.

## Required Questions Before Change-Handling Work

For any value used in a cache key, transition trigger, rebuild trigger, or
diagnostic warning, answer these before designing code:

1. What value did I observe?
2. Did it actually change in the relevant runtime phase?
3. If it stayed the same repeatedly, is that sameness evidence of an invariant?
4. Which product spec says it is allowed to change?
5. Which code path is the source of truth for changing it?
6. If it changes anyway, is that a supported feature or a bug?
7. Should the implementation detect the change, or assert/report violation of an invariant?

Do not continue into implementation until the answers separate:

- setup/load changes;
- live gameplay changes;
- restart/new-map changes;
- future roadmap changes that are not part of the current product.

## Pax Fluxia Board Contract

For the current game, after a board has loaded and gameplay has started:

| Value | Setup/load | Live gameplay | Restart/new map |
| --- | --- | --- | --- |
| Star count | may change | must not change | may change |
| Star positions | may change | must not change | may change |
| Lane count | may change | must not change | may change |
| Lane connections | may change | must not change | may change |
| Lane shape/distance | may change | must not change | may change |
| Star ownership | may change | may change | may change |
| Ships/orders/combat | may change | may change | reset or change |
| Territory geometry | derived from ownership/settings over the fixed board | may change | reset or change |

Future dynamic-map features are out of scope unless explicitly requested.
Do not silently design current runtime code around future live board-layout changes.

## Correct Response To Impossible Changes

If a live-game path appears to change star positions, lane connectivity, lane
shape, lane distance, star count, or lane count:

1. First suspect the probe or diagnostic.
2. Then search for the actual mutating source.
3. If the mutation is real, report it as a bug.
4. Do not normalize the mutation into renderer cache-invalidation design unless
   the user explicitly changes the product spec.
