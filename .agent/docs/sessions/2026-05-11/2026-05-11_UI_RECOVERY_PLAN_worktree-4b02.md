# Pax Fluxia UI Recovery Plan - Worktree 4b02 - 2026-05-11

## Mission

Recover the in-game HUD and settings UI as one coherent interface layer. The goal is not to patch a few broken widgets. The goal is to restore structural correctness, interaction clarity, visual discipline, and functional trust across the entire game surface.

## Core Rules

1. The whole game UI is one system. No component may be redesigned in isolation without checking its shell, neighboring surfaces, data semantics, and typography/iconography consistency.
2. The master game view must be driven by one layout shell. Topbar, canvas, settings ribbon, leaderboard column, quick-access icons, and low-frequency actions must belong to one explicit layout model.
3. No new labels are added unless they are necessary and materially improve comprehension. Spatial hierarchy should do most of the work.
4. No metric gets a strong combat-sounding name unless it is authoritative or explicitly labeled as a proxy.
5. No HUD widget is considered complete until it is checked in browser for spacing, overflow, type rhythm, icons, hover/active states, and selected-state wiring.

## Confirmed Failures To Correct

1. `StarNav` is not wired to selected-star state and therefore fails the core selection-reflection behavior.
2. `StarNav` presents proxy math with ambiguous labels and poor ratio semantics.
3. `GameHudTopBar` is not part of the master `game-layout` grid.
4. The settings column does not implement the intended collapse-to-topbar-stub pattern.
5. The settings utility cluster mixes unrelated actions, including `Load Map`, beside theme controls.
6. The quick-access icon strip uses weak labeling and corrupted icon treatment.
7. The leaderboard header and summary hierarchy are visually broken and typographically noisy.
8. The desktop/right-column shell relies too much on extra labels to explain weak grouping decisions.

## Recovery Principles

### A. Architecture First

- `GameContainer.svelte` becomes the true shell owner for the whole playable HUD.
- `game-layout` owns the topbar as a grid area, not as a sibling overlay.
- The layout must explicitly support:
  - canvas
  - topbar
  - settings ribbon / controls column
  - leaderboard / right-column stack
  - quick-access icon strip
  - mobile-specific control bar

### B. Interaction Semantics Before Styling

- Selected-star UI must track `selectedStarStore` directly.
- Star View must distinguish:
  - selected star
  - currently owned star navigation
  - fit-to-map action
  - outgoing target
  - incoming hostile targeting
- Settings must have an explicit desktop collapse control that reduces into a visible topbar stub.

### C. Fewer Words, Better Structure

- Remove redundant labels:
  - `Quick Tools`
  - `Actions`
  - `Low-frequency`
- Replace them with stronger placement and grouping.
- Only retain labels that help the player make a decision or understand a state.

### D. One Typographic System Per Surface

- Each surface should use a restrained type stack:
  - display / section title
  - data / numeric
  - body / utility
- No small surface should mix 5-6 competing voices.

### E. Data Honesty

- If Star View keeps proxy combat values, rename them so they read as derived pressure values, not exact combat outcomes.
- If authoritative values are possible, compute and label those instead.

## Execution Phases

### Phase 1. Structural Corrections

Files:
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`

Objectives:
- Move the topbar into the master `game-layout`.
- Define explicit grid areas for topbar, canvas, controls, leaderboard stack, and quick-access icons.
- Replace hard open/close settings behavior with:
  - expanded controls column
  - collapsed topbar stub
  - clear toggle affordance
- Remove unrelated utility actions from the theme-adjacent header cluster.

Acceptance criteria:
- The whole game HUD can be reasoned about from one layout tree.
- Topbar alignment is stable at all desktop widths.
- There is one obvious settings collapse control and one obvious reopen control.

### Phase 2. Star View Rebuild

Files:
- `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte`
- `pax-fluxia/src/lib/stores/selectedStarStore.svelte.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/config/gameplay.config.ts`
- `common/src/config.ts`
- `common/src/combat.ts`

Objectives:
- Bind Star View to `selectedStarStore`.
- Make the selected star the primary star shown.
- Separate ownership state from selection state:
  - if selected star is owned, show owned-star actions and outgoing controls
  - if selected star is not owned, show its state honestly and disable owned-only controls
- Replace ambiguous labels:
  - `Attack force`
  - `Defense force`
  - `Outgoing`
  - `Incoming`
- Decide one of:
  - authoritative combat preview
  - clearly-labeled derived pressure preview
- Redesign the layout from scratch for readability and spacing, not by expanding the existing cramped shell.

Acceptance criteria:
- Clicking a star updates Star View immediately.
- Every displayed metric has a precise meaning that can be explained from code.
- The widget is readable without helper interpretation.

### Phase 3. Leaderboard Recovery

Files:
- `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte`

Objectives:
- Rebuild header, summary, and column rhythm with one coherent typographic hierarchy.
- Remove superimposed / overflowing title behavior.
- Replace `Active / Damaged` text labels with compact icon shorthand where appropriate.
- Make collapsed badge, expanded title, totals row, and row columns feel like one design system.

Acceptance criteria:
- No overlapping text.
- Typography reads as intentional and restrained.
- Narrow widths still preserve clarity.

### Phase 4. Theme / Utility / Quick-Access Cleanup

Files:
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`

Objectives:
- Remove `Load Map` from the theme-adjacent utility grouping.
- Keep theme selection and theme library concerns together.
- Rename the bottom icon row conceptually to quick-access icons, but prefer no visible redundant label unless it proves necessary.
- Replace weak glyph/emoji icons with controlled icon treatment.

Acceptance criteria:
- Theme controls are functionally coherent.
- Quick-access icons read as tools without extra prose.
- No corrupted glyphs or placeholder-feeling symbols remain.

### Phase 5. Surface-Level Design Polish

Files:
- all HUD-facing components touched in previous phases

Objectives:
- Normalize spacing, panel padding, border handling, legend treatment, hover/active states, and density.
- Remove accidental native fieldset aesthetics where they conflict with the intended design.
- Ensure each cluster has visual breathing room and clear internal rhythm.

Acceptance criteria:
- No accidental borders or browser-default-looking artifacts.
- The UI reads as designed, not assembled.

## Additional Initiative Mandate

Beyond the reported defects, every edit pass must also check:

1. Does this component match the visual language of adjacent components?
2. Does the information density suit the available width and height?
3. Are there labels that exist only to compensate for weak grouping?
4. Is the data semantics precise, or just plausible-sounding?
5. Does the selected / active / focused state show up immediately and clearly?
6. Is the surface still legible in its collapsed form?

## Verification Standard

No phase is done until all of the following are checked:

1. Browser runtime verification in the actual game view
2. Selection-state validation for click, toggle, and collapse behaviors
3. Overflow check on desktop widths that stress the layout
4. Typography and icon scan for mixed voices, corrupted glyphs, and accidental defaults
5. Neighbor-surface check so a local fix does not break overall balance

## Working Standard Going Forward

When changing a UI component in this worktree:

1. Start with shell ownership.
2. Confirm interaction semantics.
3. Confirm data semantics.
4. Then style the component.
5. Then browser-check the whole cluster around it.

That order is mandatory for this recovery pass.
