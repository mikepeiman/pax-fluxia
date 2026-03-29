# Main Menu V2: 4-Column Step Flow

> **Status:** Design concept — NOT yet implemented
> **Constraint:** Non-destructive. Current `MainMenu.svelte` stays. Toggle between layouts via sticky topnav.

## Concept

A horizontal 4-column step-based game setup flow. Each column is a numbered step, dark bg, rounded corners, 1rem margin.

## Columns

### Step 1: Choose A Map

**Sub-type selector:** `Classic | Custom | New`

Each sub-type shows a scrollable list of **map cards with accurate thumbnails**.

| Sub-type | Content |
|----------|---------|
| **Classic** | Pre-built maps shipped with the game |
| **Custom** | Any user-saved map: created from scratch, saved from random, or edited classic |
| **New** | Random generation with full customization controls (star count, spacing, connectivity, etc.) |

### Step 2: Choose Your Opponents

- **Single Player:** Select number of players, AI difficulty, or load an AI Theme
- **Multiplayer:** Shows lobby browser + "Create Lobby" button (see `MP_LOBBY_DESIGN.md`)

### Step 3: Mode & Options

Game rules configuration (speed, conquest mode, etc.)

### Step 4: Start

Single large, inviting button: "Start Game" (SP) or "Create Lobby" (MP).

## Implementation Approach

- Current `MainMenu.svelte` is preserved
- New layout lives in `MainMenuV2.svelte`
- **Sticky topnav toggle** lets user switch between Current and V2
- Map selection flow is shared between SP and MP

## Visual Notes

- Dark background, rounded corners on each column
- 1rem left margin
- Map cards with accurate thumbnails (not placeholders)
- Step numbers as column headers
- Progressive disclosure: each step informs the next
