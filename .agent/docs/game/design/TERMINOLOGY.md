# Pax Fluxia — Terminology & Jargon

> Definitive definitions for project-wide terms. Referenced from `agent.md` §3.2.

| Term | Definition |
|------|-----------|
| **Territory** | Connected same-owner stars and the space within their bounds |
| **Frontier** | Boundary geometry where two territories meet — the core term for all territory edges |
| **Front** | A contested section of frontier — an active attack/battle zone between two players |
| **Region** | A contiguous area of space owned by one player |
| **Holding** | The sum total of a player's territories across the sector |
| **Sector** | The game map |
| **Board Layout** | The physical map facts: star count, star positions, lane count, lane connections, lane shape, and lane distance |
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

After a board is loaded and gameplay has started, Board Layout is immutable in
the current product. Ownership, ships, orders, combat, and territory derived from
ownership can change during play; Board Layout cannot.

## Lane Constraint Terms

| Term | Definition |
|------|-----------|
| **Lane Margin** | Optional map-layout/editor clearance: distance from the center of a non-endpoint star to the nearest point on a lane |
| **Straight Line** | The direct line between two connected stars |
| **Adjusted Lane** | A lane whose geometry changed to satisfy lane margin while preserving the same connection |
| **Connectivity Restore** | An explicit connection added only when the feasible graph would otherwise be disconnected |

### CX — Corridor Extension
- **Expansion:** *distributed corridor virtual stars along lanes.*
- **Purpose:** Ensure same-owner lanes remain fully within that owner's territory. On contested lanes, ensure the two contesting owners' fronts meet along the lane's midline (arc-length midpoint, not necessarily geometric center) and that no third player impinges on the corridor.
- **Stage:** pre-metaball, in the geometry source pipeline. Mutates the site set fed to `power_voronoi_0319` / `computeGeometry0319`.
- **Knobs:** `MODIFIED_VORONOI_CORRIDOR_ENABLED`, `MODIFIED_VORONOI_CORRIDOR_SPACING`, `TERRITORY_CX_COUNT` (explicit count overrides spacing when > 0), `TERRITORY_CX_WEIGHT`.
- **Implementation:** `src/lib/territory/corridor/buildCorridorVirtualSites.ts` L1-288.

### CP — Contested-lane midpoint Pair
- **Expansion:** *paired virtual stars on either side of the midpoint of an enemy-owned (contested) lane.*
- **Purpose:** CX's contested-case mechanism. The paired Vs pull the two contesting owners' regions forward toward the midline and block any third party from touching the lane.
- **Stage:** pre-metaball, same pipeline as CX.
- **Knobs:** `TERRITORY_CX_CONTEST_MIDPOINT_VSTARS` (on/off), `TERRITORY_CX_CONTEST_PAIR_COUNT`, `TERRITORY_CX_CONTEST_PAIR_WEIGHT`.
- **Implementation:** `src/lib/territory/corridor/buildCorridorVirtualSites.ts` L183-242.
- **Known bugs flagged externally (to audit/fix later):** one metaball-family wiring gap; short lanes can suppress pair emission entirely.

### DX — Disconnect eXclusion
- **Expansion:** *conditional enemy virtual stars between disconnected same-owner components.*
- **Purpose:** Prevents territory rendering from visually suggesting star-star connections that don't exist as lanes.
- **Stage:** pre-metaball, same pipeline. Conditional by design — on many maps legitimately produces nothing (no owner has ≥ 2 disconnected components).
- **Knobs:** `MODIFIED_VORONOI_DISCONNECT_ENABLED`, `MODIFIED_VORONOI_DISCONNECT_DISTANCE`, `TERRITORY_DX_WEIGHT`.
- **Implementation:** `src/lib/territory/disconnect/buildDisconnectVirtualSites.ts` L1-229+.

### MSR — Minimum Star Range
- **Expansion:** *territory/frontier breathing room around owned stars.*
- **Current implementation:** power-diagram site-weight term (`MODIFIED_VORONOI_STAR_MARGIN`, internally squared) in `powerVoronoiTerritoryGeometryGenerator.ts` L110-125 plus explicit post-solve minimum-star-margin cleanup in the resolved geometry path.
- **Not lane routing:** MSR no longer acts as lane margin fallback and must not trigger gameplay lane rerouting. Lane Margin is a separate map-layout/editor control.
- **Default:** `MODIFIED_VORONOI_STAR_MARGIN = 0`; MSR is inactive unless explicitly tuned.
