# Pax Fluxia — Terminology & Jargon

> Canonical definitions for project-wide terms. Referenced from `agent.md` §3.2.

| Term | Definition |
|------|-----------|
| **Territory** | Connected same-owner stars and the space within their bounds |
| **Frontier** | Boundary geometry where two territories meet — the core term for all territory edges |
| **Front** | A contested section of frontier — an active attack/battle zone between two players |
| **Region** | A contiguous area of space owned by one player |
| **Holding** | The sum total of a player's territories across the sector |
| **Sector** | The game map |
| **Star** | A node on the map — produces ships, can be conquered |
| **Lane** | A connection/route between two stars |
| **Order** | A player command to move ships between stars |
| **Deferred Order** | An order set to a non-owned star, activates upon conquest |
| **Tick** | One game time unit — all game actions resolve on the synchronized tick |
| **Transfer** | Ships moving between stars along a lane |
| **Conquest** | The capture of a star by an attacking player |
| **Scatter** | Escaping ships dispersing to connected friendly stars after conquest |
| **Retreat** | Directed withdrawal of ships from a contested star |
| **Production** | Ship generation at owned stars per tick |
| **Repair** | Conversion of damaged ships back to active ships per tick |
| **Surge** | Visual attack animation — ships rush toward target during combat |

## Architecture Terms

| Term | Definition |
|------|-----------|
| **Ownership Layer** | Who owns what — graph-native, from conquest events |
| **Geometry Layer** | Shapes from ownership — Voronoi cells, regions, frontiers |
| **Transition Layer** | Animating between geometry states — morphers, easing |
| **Presentation Layer** | Drawing to screen — PIXI.Graphics fills, strokes |
| **Compiler** | Produces geometry data from ownership state — no rendering, no PIXI |

## Map Model Terms

| Term | Definition |
|------|-----------|
| **Star Layout** | The star positions on a map |
| **Connectivity** | Which star pairs are connected |
| **Lane Geometry** | The actual line used for an existing connection |
| **Forces** | Player ownership, ship counts, and other per-star starting state |
| **Reshape** | Recompute lane geometry while preserving the existing connectivity |
| **Recompute Connectivity** | Rebuild which star pairs are connected, then derive lane geometry from that new connectivity |
| **Authored Map** | A map whose star layout and connectivity were chosen by a human or loaded from a saved map |
| **Generated Map** | A map whose star layout and/or connectivity were produced by map generation logic |

## Lane Constraint Terms

| Term | Definition |
|------|-----------|
| **Lane Margin** | Distance from the center of a non-endpoint star to the nearest point on a lane |
| **Straight Line** | The direct line between two connected stars |
| **Adjusted Lane** | A lane whose geometry changed to satisfy lane margin while preserving the same connection |
| **Connectivity Restore** | An explicit connection added only when the feasible graph would otherwise be disconnected |
