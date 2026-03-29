# Design Decisions

## 2026-03-15

### D-001: Star Label Pill Layout
**Decision:** Display star data as a compact horizontal pill `#N │ active/damaged` instead of stacked vertical text.
**Rationale:** Reduces visual clutter, groups related data tightly, looks cleaner at small sizes.
**Config:** `STAR_LABEL_LAYOUT: 'horizontal' | 'vertical'` — both modes preserved.

### D-002: Star Label Color Mode (Player vs Universal)
**Decision:** Replace separate Owner Border / Owner Fill booleans with a single `STAR_LABEL_COLOR_MODE` toggle: `Player` (ownership-colored) or `Universal` (fixed HSLA).
**Rationale:** Simpler mental model. User wanted one clear toggle, not two checkboxes. Universal mode lets the user pick a single neutral color for all pills.
**Config:** `STAR_LABEL_COLOR_MODE`, `STAR_LABEL_UNIVERSAL_H/S/L/A`

### D-003: Leash Line Default Off
**Decision:** `STAR_LABEL_LEASH` defaults to `false`.
**Rationale:** User reported gray lines as unwanted artifacts. Leash is preserved as an opt-in feature.

### D-004: Main Menu V2 — Non-Destructive
**Decision:** New 4-column step-based main menu will be implemented as a **separate component** (`MainMenuV2.svelte`), togglable from the current menu via a sticky topnav toggle.
**Rationale:** User explicitly stated: *"Current main menu is worth keeping, though it needs refinement. I want options."* Both layouts coexist for exploration.

### D-005: Unified Map Selection for SP/MP
**Decision:** Map selection flow is identical regardless of SP or MP. Final action diverges: "Start Game" (SP) vs "Create Lobby" (MP).
**Rationale:** Reduces code duplication, consistent UX. Host can change settings post-lobby-creation.

### D-006: MP Lobby Integrated Into Main Menu
**Decision:** MP lobby is shown inline within the main menu, not as a separate full-screen view.
**Rationale:** User specified: *"it is built in, fully shown in main menu."* Host assigns AI/human slots, lobby waits for humans.
