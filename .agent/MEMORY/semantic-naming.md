# Semantic Naming Convention

## Domain Vocabulary
Use game/military terminology over abstract CS jargon:
- **Order** (not "link" or "flow") — player commands to move/attack
- **Transfer** (not "flow") — ship movement between stars
- **Battle** (not "combat resolution") — when forces meet
- **Conquest** (not "capture") — taking a star

## Key Mappings
| Avoid | Prefer |
|-------|--------|
| `createLink` / `cancelLink` | `issueOrder` / `cancelOrder` |
| `flowRate` / `flowAmount` | `transferRate` / `transferAmount` |
| `processFlowLinks` | `executeTransferOrders` |
| `target` (ambiguous) | `orderDestination` (for transfers) |
| `isAttacking` | `hasActiveOrder` (could be reinforcement) |
| Version suffixes (`V4`, `V3`) | Canonical names only; Git handles versions |

## Visual Layer Naming
Names must describe what the visual **represents**, not the rendering technique:

| Avoid | Prefer | Reason |
|-------|--------|--------|
| `SHOW_TERRITORY` (for per-star glow) | `SHOW_STAR_POWER` | Per-star halos show fleet strength/power, not ownership boundaries |
| `TerritoryRenderer` (for halos) | `StarPowerRenderer` | Halos radiate from individual stars, not from ownership regions |
| Territory | Voronoi / Metaball | "Territory" is the concept; the renderer name should specify the technique |
