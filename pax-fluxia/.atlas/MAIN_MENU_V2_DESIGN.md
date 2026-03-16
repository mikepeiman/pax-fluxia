# Main Menu Design Proposal: 4-Column Step Flow

> **Status:** Design concept — NOT yet implemented
> **Constraint:** Non-destructive. Current main menu stays. Toggle between layouts via sticky topnav.

## Overview

Replace the current single-view main menu with a horizontal 4-column step-based game setup flow. Each column is a numbered step, dark bg, rounded corners, 1rem margin.

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

**Branching by game type:**

- **Single Player:** Select number of players, AI difficulty, or load an AI Theme
- **Multiplayer:** Lobby browser showing all available lobbies + "Create Lobby" button

### Step 3: Mode & Options

Game rules configuration (speed, conquest mode, etc.)

### Step 4: Start

Single large, inviting "Start Game" (SP) or "Create Lobby" (MP) button.

## MP Lobby Design

The lobby is **built into the main menu**, not a separate screen:

- All human players visible in waiting room and lobby
- Lobby host assigns each slot to **AI or Human**
- Lobby stays open until human slots are filled
- Host **CAN change map or settings** after lobby creation but before game start

## Map Selection

Identical flow for SP and MP:
1. User selects map type (Classic / Custom / New)
2. Configures settings
3. SP → "Start Game" | MP → "Create Lobby"

## Implementation Approach

> **Non-destructive:** Current `MainMenu.svelte` is preserved.
> New layout lives in a separate component (e.g. `MainMenuV2.svelte`).
> A **sticky topnav toggle** lets the user switch between Current and New layouts for exploration and comparison.

## Visual Notes

- Dark background, rounded corners on each column
- 1rem left margin
- Map cards should have accurate map thumbnails (not placeholders)
- Step numbers visible as column headers
- Progressive disclosure: each step informs the next
