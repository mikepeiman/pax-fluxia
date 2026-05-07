# Diagnostic Export Permission Fix v1

- Date: `2026-05-07`
- Branch: `codex/render-infra/pvv4-transition-bets`

## Problem

- Diagnostic package export started failing consistently with:
  - `Failed to execute 'requestPermission' on 'FileSystemHandle': User activation is required to request permissions.`
- The failure path was not the folder-picker button itself.
- The serializer was still calling `requestPermission()`:
  - during persisted export-target load
  - during later save/write flows
- Both of those paths can run outside a live user activation boundary.

## Change

- `TransitionBundleSerializer.ts`
  - split permission handling into:
    - query-only path for load/save
    - explicit request path for user-initiated reconnect/choose
  - background load now preserves the persisted folder handle and only records permission state
  - save now writes to the folder only when permission is already granted
  - otherwise it falls back to browser download without throwing the activation error
  - added `prepareDiagnosticExportDirectoryForWrite()` for explicit click-time pre-authorization

- `ControlsSection-Diagnostics.svelte`
  - export buttons now pre-authorize the saved folder at click time before heavy async package work starts
  - export-target UI now distinguishes:
    - writable folder
    - saved-but-not-currently-writable folder
  - button text changes to `Reconnect Export Folder` when permission is not currently active

## Validation

- `bun vitest run src/lib/territory/devtools/TransitionBundleSerializer.test.ts`
- `bun run build`

## Intended Result

- No background `requestPermission()` call on reload.
- No `User activation is required` failure during package export.
- If the saved folder is no longer writable, the UI should say so directly and allow reconnecting it deliberately.
