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
