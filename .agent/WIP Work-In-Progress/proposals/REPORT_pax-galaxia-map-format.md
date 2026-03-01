# Report: Pax Galaxia Map Format Analysis (F-105)

**Date**: 2026-03-01  
**Source File**: `resources/pax-galaxia-maps/empire.txt`  
**Reference Screenshot**: `resources/pax-galaxia-maps/empire-classic-screenshot.png`  
**Status**: Format decoded — ready for implementation

---

## Header (lines 1–7)

```
players=6         # player count
stars=68          # total star count
registered=0      # (unused — registration flag?)
scalex=1.0        # x-axis scaling factor
scaley=1.0        # y-axis scaling factor
dx=0              # x-axis offset
dy=0              # y-axis offset
```

## Per-Star Lines (lines 8+)

Pattern: `COLOR-OWNER-sShips-xX-yY-nNeighbors-sup0-blo0 [neighbor indices...]`

| Field | Meaning | Examples |
|-------|---------|---------|
| `COLOR` | **Star type** (distinct from owner): `O`=Orange, `B`=Blue, `Y`=Yellow, `G`=Green, `R`=Red, `V`=Violet. Maps to our `StarType` enum. | `O`, `B`, `Y` |
| `OWNER` | Owner letter: `A`=Neutral, `B`–`F`=Players 1–5 | `A` (neutral), `B` (P1) |
| `s<N>` | Starting ship count | `s2` (normal), `s100` (capital), `s150` |
| `x<N>` | X position (pixels) | `x226` |
| `y<N>` | Y position (pixels) | `y95` |
| `n<N>` | Number of connections | `n4` |
| `sup0` | Supply value (always 0 in sample — possibly unused legacy) | `sup0` |
| `blo0` | Blockade state (always 0 — possibly unused legacy) | `blo0` |
| Trailing numbers | Space-separated 0-indexed neighbor star indices | `3 5 4 2` |

## Player Capitals (identified by `s100`+ and owner B–F)

| Star Index | Owner | Ships | Position | Color |
|-----------|-------|-------|----------|-------|
| 5 | B (Player 1) | 100 | (168, 68) | Red |
| 13 | F (Player 5) | 100 | (157, 438) | Red |
| 29 | C (Player 2) | 150 | (472, 59) | Red |
| 47 | E (Player 4) | 100 | (748, 469) | Red |
| 58 | D (Player 3) | 100 | (741, 56) | Red |

> **Note**: Star 23 has owner `A` (neutral) with `s100` ships — a neutral fortress.  
> All capitals are color `R` (Red). **Star color = star type**, which is distinct from star owner and owner color.  
> Star types affect gameplay stats (production, repair, etc). Owner colors are player identity.

## Canvas Bounds

- X range: 153–748 (width ≈ 595px)
- Y range: 57–484 (height ≈ 427px)
- Apply `scalex`, `scaley`, `dx`, `dy` for transforms

## Implementation Path

1. Create `common/src/mapImport.ts` — parser function
2. Map owner letters (A–F) to player indices
3. Use x, y positions directly (scale to canvas)
4. Build connection list from neighbor indices
5. Add "Import Map" in game setup UI
6. Map Pax Galaxia colors → our StarType enum
