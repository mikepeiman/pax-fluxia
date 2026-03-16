# MP Lobby System Design

> **Status:** Design concept — NOT yet implemented
> **Scope:** Game system feature. Works with current menu OR V2 layout.

## Core Concept

The MP lobby is **integrated into the main menu**, not a separate screen. Players see the lobby inline alongside map/settings configuration.

## Lobby Flow

1. **Create Lobby** — Host selects map + settings, clicks "Create Lobby"
2. **Lobby View** — Shows all slots (AI and Human), who's joined, who's waiting
3. **Host Controls:**
   - Assign any slot to AI or Human
   - Change map or settings **after lobby creation but before game start**
   - Kick players, reorder slots
4. **Join Flow** — Other players see available lobbies, click to join open human slots
5. **Start** — Host launches game once satisfied with roster

## Slot Management

| Slot State | Description |
|------------|-------------|
| **Human (waiting)** | Open slot, waiting for a player to join |
| **Human (filled)** | Player has joined this slot |
| **AI** | Computer-controlled, host sets difficulty/personality |

## Map Selection

Identical for SP and MP:
- User picks map type (Classic / Custom / New)
- Configures settings
- SP → "Start Game" | MP → "Create Lobby"
- Host can change map/settings post-creation

## UI Placement

- In current menu: could be a modal or expandable section
- In V2 menu: lives in Step 2 column ("Choose Opponents" → MP tab)
- Either way, lobby is **visually part of the menu**, not a full-screen takeover
