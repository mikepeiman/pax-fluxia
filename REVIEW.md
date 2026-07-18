---
date created: 2026-07-18
last updated: 2026-07-18
last updated by: Devin setup
relevant prior docs:
  - AGENTS.md
  - .agent/AGENT.md
  - .agent/docs/engineering/DESIGN_SYSTEM_TOKENS.md
  - .agent/rules/design-agent.md
superseding docs:
---

# REVIEW.md — subsystem-specific review invariants

Focused review rules for high-risk subsystems. Apply these when reviewing agent-generated changes that touch the named areas. Keep this file short; deep rules live in `.agent/`.

## Rendering vs. state separation

- PixiJS/WebGL render code (`lib/renderers`, `lib/territory`, `lib/fx`, `GameCanvas.svelte`) must not read from or write to UI preference stores. It reads `GAME_CONFIG` and engine state (`activeGameStore`, `gameStore`).
- UI/Svelte code must not mutate `GAME_CONFIG` directly except through `settingsStore.set`/`applyPatch` (or `panelSync` legacy paths). Exceptions must be documented inline and are debt.
- Canvas resize behavior preserves definite layout tracks, mount order, viewport refit, and settled heavy resize. Any shell change must prove no black-strip/distortion regression.

## Persistence

- Protected content is never cleared by any reset path: `pax_savedMaps`, `pax_savedGames`, `pax-game-themes`, `pax_composedThemes`, `pax_categoryThemes_*`, `pax_starredThemes_*`, `pax_themePresets` (legacy), `pax-map-editor-*`, `pax_defaultMap`.
- Reset routines must use `clearResettableSettingsStorage` (or an equivalent allowlisted approach) with byte-preservation tests.
- Boot precedence (defaults → persisted panel → accepted migration → external patch → runtime effects) must be characterized by tests before any hydration change.
- UI-preference reset authority does NOT extend to user-created gameplay presets or saved content.

## Deterministic territory simulation

- Territory geometry (`lib/territory/geometry`, `powerCore`) is deterministic and fixture-tested. Changes require updating `powerCoreFixture`/parity tests, not disabling them.
- Animation-lock math has ONE pure implementation (`animLockMath.ts`). Do not reintroduce a duplicate in `panelSync` or components.
- Invalidation is registry data (`invalidates` tags), not a key-prefix ladder. `settingsInvalidation.test.ts` proves totality over territory-visual keys — keep it green.

## Settings wiring

- Every rendered setting must be searchable, persistable, and reachable. `settingsWiringInvariant.test.ts` carries a `KNOWN_UNWIRED` debt list that must only shrink; new un-wired settings fail the test.
- The `panelKey ↔ configKey` bijection is verified; rekeying is pure churn with no behavioral gain — don't do it without explicit instruction.

## Netcode

- `multiplayerStore` is for lobby/network actions only; `activeGameStore` is the unified facade for in-game UI (delegates to `gameStore` for SP, `multiplayerStore` for MP). Don't abstract away host/client/takeover transitions.

## Performance-critical loops

- Per-frame render paths must not reconstruct UI objects. Resize: cheap per-frame refit + debounced heavy refresh (settled behavior). No `console.log` in hot paths — use the gated logger.
