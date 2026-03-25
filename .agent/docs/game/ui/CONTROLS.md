# Player Controls Specification

**Canonical reference for all game input behaviors.**

---

## Star Selection

| Action | Behavior |
|--------|----------|
| **Click any star** | Selects it (info panel + focus ring). Sets `activeStarId`. |
| **Click same star again** | Deselects (toggle off). Clears `activeStarId`. |
| **Click different star** | Focus shifts to new star immediately. If connected to previous `activeStarId`, also issues an order (see Orders below). |
| **Click empty space** | Deselects all. Clears `activeStarId`. |

> [!IMPORTANT]
> Any star can be clicked regardless of ownership. Focus must **always** shift on click — the order is only issued if the stars are connected.

---

## Orders (Click-Click)

| Source Star | Target Star | Connection? | Result |
|-------------|-------------|-------------|--------|
| Owned | Any | Connected | **Normal order** (attack if enemy/neutral, reinforce if friendly) |
| Owned | Any | Not connected | No order. Focus shifts to target. |
| Enemy | Any | Connected | **Deferred order** (executes after conquest of source) |
| Enemy | Any | Not connected | No order. Focus shifts to target. |
| Neutral | Any | — | No order. Focus shifts to target. |

- **Ctrl+Click**: Order clears on conquest (non-persistent). Default is persistent.
- **Right-Click on owned star with order**: Cancel that star's order.
- **Right-Click on enemy star**: Cancel deferred order (if any).
- **Right-Click anywhere**: Clears selection.

---

## Orders (Drag)

| Action | Behavior |
|--------|----------|
| **Drag from owned star to connected star** | Issues order. Visual arrow preview during drag. |
| **Drag-through multiple stars** | Chains orders along the path (A→B→C→D). |
| **Drag-through enemy star** | Issues attack order, then deferred orders for subsequent chain. |
| **Drag > 10px movement** | Interpreted as drag, not click. |
| **Drag < 10px movement** | Interpreted as click (see Click-Click above). |

---

## Camera

| Action | Behavior |
|--------|----------|
| **Middle-click drag** | Pan the view |
| **Scroll wheel** | Zoom in/out (planned: R-13) |

---

## Speed Controls

| Action | Behavior |
|--------|----------|
| **Spacebar** | Toggle pause/resume |
| **Speed slider** | 1x–50x game speed |

---

## Interaction Principles

1. **Crisp targeting**: Click is an act of targeting. Must be instant and reliable — no lag, no dropped inputs.
2. **Focus always shifts**: Clicking any star always moves focus, regardless of whether an order can be issued.
3. **Deferred orders**: You can plan orders from stars you don't yet own. They execute upon conquest.
4. **Persistent by default**: Orders persist until manually cancelled (right-click) or the star is conquered by another player.
5. **No dead zones**: Every part of the gameboard is interactive. Empty space = deselect.
