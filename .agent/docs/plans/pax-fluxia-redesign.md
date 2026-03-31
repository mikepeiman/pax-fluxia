# Pax Fluxia Redesign Plan: "The Master's Directive"

## Overview
Elevate the current "functional but soulless" MVP design to a "AAA" atmospheric experience. The goal is to immerse the user in the "Neon Void" universe through visual depth, tactical UI elements, and narrative-driven layout.

## Phase 1: Atmosphere & Depth (The Container)
**Objective:** Kill the "flat page" feel.
1.  **Global Background**: Implement a subtle "tactical grid" pattern or deep space texture.
2.  **Vignette**: Add a massive, soft radial gradient (dark purple/blue/cyan) behind key sections to create depth and focus.

## Phase 2: The "Data Terminal" Card Upgrade
**Objective:** Transform generic cards into Heads-Up Display (HUD) elements.
1.  **Structure**: Add a "Header Bar" to each card.
    *   Index numbers ("01", "02", "03").
    *   Decorative "status light" or technical markings.
2.  **Borders**: Replace flat borders with subtle gradients or "tech-line" strokes (cyan/accent colors).
3.  **Layout**: **Stagger the cards.** Offset the middle card (Attrition Engine) vertically to create a dynamic "arrow" or "pyramid" formation.

## Phase 3: Visual Rhythm (New Sections)
**Objective:** Break the monotony and add narrative density.
1.  **"The Ticker"**: Insert a full-width scrolling text strip between Hero and Features.
    *   Content: `/// SYSTEM STATUS: ONLINE /// DETECTING FLUX ANOMALIES /// JOIN THE CONQUEST`
    *   Style: Monospace, high contrast, technical.
2.  **"Faction Database" (Split Feature)**:
    *   **Left**: Large concept art (Ship/Planet).
    *   **Right**: "Tech Specs" list (Class, Speed, Shields).

## Phase 4: The "Command Console" Footer
**Objective:** Expand utility and lore.
1.  **Grid Layout**: 4-column structure.
    *   **Col 1**: Logo & Status.
    *   **Col 2**: Database Links (Ships, Maps, Lore).
    *   **Col 3**: Community Links.
    *   **Col 4**: "Transmission" (Newsletter input).

## Execution Notes
*   Maintain the `JetBrains Mono` (technical) and `Inter` (UI) font pairing.
*   Use the `$cyan`, `$primary`, and `$accent` variables to enforce the neon palette.
*   Ensure all new text elements are `fixed-width` to prevent layout breaks.
