# Territory Liveness and Settings Recovery Plan

## 1. Problem Statement

The current territory system is not trustworthy in live operation:

- the simulation advances but territory visuals can remain stale,
- territory settings do not reliably update the live render,
- theme and sub-theme synchronization is not guaranteed to keep panel state and runtime state aligned,
- the settings architecture is partially migrated, with both canonical and legacy sync paths active.

## 2. Current Diagnosis

The settings system is mixed:

- canonical mutation helpers exist in `settingsState.ts`:
  - `setSetting`
  - `setManySettings`
- legacy broad replay and sync helpers still exist and are still used:
  - `applyPanelToConfig`
  - `syncPanelFromConfig`
  - large manual `syncAllFromConfig` in `GameSettingsPanel.svelte`

The renderer already attempts:

- geometry, topology, and visual invalidation classification,
- ownership texture ping-pong,
- fill morph blending,
- border-path rebuild throttling.

But the end-to-end chain is not reliable because the state architecture is not singular.

## 3. Canonical State Contract

The only valid mutation path from UI and theme application is:

- `setSetting(key, value)`
- `setManySettings(patch)`

Rules:

- UI templates read from `panel.*`, never from `GAME_CONFIG`.
- UI events write through `setSetting` only.
- Theme and sub-theme apply write through `setManySettings` only.
- No territory control may directly call `applyPanelToConfig`.
- No territory theme sync may depend on a manual territory-specific object copy inside `syncAllFromConfig`.
- `GAME_CONFIG` remains the runtime compatibility read target during the bridge, but it is not the source of reactive UI truth.

## 4. Recovery Work

### 4.1 Instrument the Full Liveness Chain

Add telemetry for:

- panel input value,
- `setSetting` and `setManySettings` application,
- `GAME_CONFIG` applied value,
- renderer `geometry`, `topology`, and `visual` classification,
- ownership RT rebuild,
- ownership RT reuse,
- border geometry rebuild,
- uniform-only style update,
- morph state transition.

### 4.2 Remove Mixed Territory-State Paths

- territory controls stop using broad replay sync,
- territory theme sync becomes schema-driven through `PANEL_CONFIG_MAP` and `setManySettings`,
- territory reset and default flows use the same canonical path.

### 4.3 Reduce Theme and Sync Drift

- replace manual territory field copies inside `syncAllFromConfig`,
- use schema-driven sync for all territory keys,
- ensure new territory keys cannot be added without schema coverage.

### 4.4 Add Development Guards

- warn when a territory UI control writes `GAME_CONFIG` outside the canonical setting API,
- warn when a territory key exists in schema but is missing from panel sync coverage.

## 5. Acceptance Criteria

- Changing any territory slider or toggle updates the territory visuals immediately.
- Territory visuals update when conquest or tick changes occur, without requiring a slider interaction.
- Theme and sub-theme apply update both panel and runtime territory state atomically.
- No territory control depends on manual direct `GAME_CONFIG` writes from the component layer.
- Telemetry can distinguish:
  - topology rebuild,
  - geometry rebuild,
  - visual-only uniform update,
  - stale or no-op frame.

## 6. Failure Analysis and Guardrails

This failure was caused by a half-migrated settings architecture.

Guardrails:

- No mixed canonical and legacy mutation path in production territory controls.
- No large manual sync object for territory keys.
- No new territory control ships without schema mapping and canonical mutation coverage.
- No render bug may be diagnosed until the state path is provably singular.