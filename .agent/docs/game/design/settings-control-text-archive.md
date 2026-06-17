---
date created: 2026-06-17
purpose: Archive of descriptive/explanatory prose removed from the in-game Settings UI.
status: in progress — being filled as the settings surface is pruned section by section.
---

# Settings Control Text Archive

When descriptive prose is removed from a settings control/card to declutter the UI,
it is recorded here, keyed by **section → card/control**, so nothing is lost. If a
description is ever wanted again (as a tooltip, help panel, or doc), it can be pulled
from here.

Conventions:
- **Control** = the visible label / config key it sat next to.
- **Removed text** = the exact prose that was deleted from the UI.
- Tooltips (`title=...` on hover) are intentionally KEPT in the UI and not archived.

---

## Render Mode (ControlsSection-Territory.svelte)

### Mode card — intro
- **Removed text (render section):** "Choose the active renderer family and expose deprecated modes only when you intentionally need to compare against them."
- **Removed text (transition view variant):** "Runtime transition controls for the render mode currently selected from the topbar."

### Mode card — live render status note
- **Removed text:** "Live render: {mode} · geometry {ready|missing} · arrows {arrowRenderer}" (always-on dev status line). Kept only the conditional **Render failure** warning, which has real diagnostic value.

## Render Mode → Geometry Source (TerritoryGeometrySourceTuning.svelte)

### Base Geometry Source
- **Removed text:** "Final authority source for derived renderers. Saved Resolved Vector configs are normalized here so CX, DX, MSR, and lane-pair tuning all use the same geometry contract."
- **Kept as tooltip** on the label: "Which territory geometry pipeline provides the source boundary data used by derived render families."

### Geometry Source — footer note
- **Removed text:** "Topology ownership rules are no longer duplicated here. MSR, CX, lane-pair, and DX controls live only in Topology Rules."

## Render Mode → Topology Rules (TerritoryTopologyTuning.svelte)

### Topology Rules card — intro
- **Removed text:** "Set the minimum owned footprint and the connection rules that determine how fronts stay linked or deliberately split apart."

---

## TODO — remaining sections to sweep
The full settings surface still carries descriptive prose in other sections
(Combat, Economy, Travel, Conquest, Effects, Map Options, Fleet & Star Visuals,
Frontier FX, Territory Styles, Diagnostics, Audio, AI, Logging). Prune + archive
each here as that section is cleaned.
