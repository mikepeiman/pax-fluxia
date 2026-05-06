# Semantic Audit Working Doc — 2026-05-06

## Purpose

Purge `canonical` from live Pax Fluxia code, active rules, and definitive documentation.

This document is the operating contract for:
- semantic audit scope
- naming and terminology policy
- communication/reporting requirements
- rename planning and implementation order

## Governing References

Live rules and references reviewed before starting:
- `.agent/AGENT.md`
- `.agent/rules/chat-first-response.md`
- `.agent/rules/plan-spec-status-first.md`
- `.agent/rules/hard-rules.md`
- `.agent/docs/engineering/NAMING_CONVENTIONS.md`
- `.agent/docs/game/design/TERMINOLOGY.md`
- `.agent/docs/game/design/GAME_SPECIFICATION.md`
- `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
- `.agent/MULTI_LANE_WORKTREE_GUIDE.md`

Historical guidance consulted for rule continuity, but not a direct rewrite target unless it still governs live behavior:
- `.agent/docs/agentic/archive-memory/semantic-naming.md`
- `.agent/docs/agentic/archive-rules/semantic-naming.md`

## Scope

### In Scope
- `pax-fluxia/` source, tests, debug tools, and active config surfaces
- `common/` shared source and active reference docs that function as current guidance
- `pax-server/` source, excluding generated build output
- active root docs and agent rules
- definitive architecture, design, terminology, and engineering references

### Out Of Scope For Direct Rewrite
- `.agent/docs/_archive/**`
- `.agent/docs/WIP Work-In-Progress/**`
- dated session docs under `.agent/docs/sessions/**`
- dated or historical branch snapshots such as `__codex-*`, `__detached-*`, and dated recovery files
- generated or vendored output such as `dist/`, build artifacts, and framework boilerplate

### Important Exception
- Archived rule docs may still inform current semantics and communication policy.
- They should guide classification, not trigger historical rewrites, unless a live rule explicitly depends on them.

## Audit Objective

`canonical` is currently overloaded across at least five meanings:
1. primary or definitive documentation
2. current approved implementation path
3. normalized or sorted data representation
4. geometry compiler output contracts
5. user-facing mode IDs and config values

The audit must remove that overload. Every live use must be rewritten to the specific meaning it actually carries.

## Naming Policy

### Hard Rule
- Do not replace `canonical` with another vague authority word by default.
- Replace it with the narrowest term that describes the actual job of the symbol, file, field, or paragraph.

### Preferred Replacement Vocabulary

| Current Meaning | Replacement Direction |
|---|---|
| definitive / primary reference | `reference`, `definitive`, `authoritative`, `current`, `live` |
| current approved path | `runtime`, `pipeline`, `primary`, `default`, `shipping`, `active` |
| normalized or sorted representation | `normalized`, `sorted`, `stable`, `deterministic` |
| geometry compiler output | `compiled`, `resolved`, `frontier`, `topology`, `geometry` |
| file or folder chosen for new work | `current`, `live`, `primary`, `owned`, `target` |

### Provisional Rename Targets

These are the default targets unless audit findings expose a better term in local context:

| Current | Preferred Direction |
|---|---|
| `CanonicalGeometrySnapshot` | `ResolvedGeometrySnapshot` |
| `CanonicalFrontierPolyline` | `ResolvedFrontierPolyline` |
| `CanonicalShell` | `ResolvedShell` |
| `CanonicalShellLoop` | `ResolvedShellLoop` |
| `CanonicalTerritoryData` | `ResolvedTerritoryData` |
| `canonicalTypes.ts` | `resolvedFrontierTypes.ts` or `frontierMapTypes.ts` |
| `createCanonicalTransitionPlan()` | `createResolvedTransitionPlan()` or `createFrontierTransitionPlan()` |
| style mode id `canonical` | `vector` or `vector_polygon` |
| geometry mode id `canonical_power_voronoi` | `resolved_power_voronoi` or `power_voronoi_runtime` |
| render mode id `territory_canonical` | `territory_runtime` or `layered_runtime` |

Final choices must follow local semantics, not this table blindly.

## Communication Rules For This Audit

- Report whether a change is planned or implemented.
- State which layer changed: rules, docs, config, contracts, runtime, tests, or compatibility.
- Call out where compatibility aliases or migration shims remain.
- Use exact file paths in reports.
- Treat user terminology as the specification.

## Audit Method

### Pass 1: Live Surface Inventory
- Enumerate active files containing `canonical`.
- Classify each hit as docs, comments, type names, function names, file names, mode IDs, config keys, tests, or compatibility text.

### Pass 2: Semantic Classification
- Decide what each `canonical` occurrence actually means.
- Mark whether it should become `reference`, `current`, `normalized`, `resolved`, `compiled`, `vector`, or another specific term.

### Pass 3: Rename Graph
- Separate safe prose edits from symbol renames and serialized-ID changes.
- Identify compatibility-sensitive surfaces:
  - saved settings
  - persisted config keys
  - UI mode IDs
  - diagnostics and snapshot artifacts
  - test fixtures and benchmarks

### Pass 4: Implementation
- Update live rules and definitive docs first.
- Rename code contracts and usage sites next.
- Add compatibility normalization where persisted identifiers would otherwise break existing user data.

### Pass 5: Validation
- Re-run targeted search for `canonical` on the live surface.
- Confirm remaining hits are either intentionally historical, generated, or external-reference material left unchanged by scope.

## Initial Hotspots

### Live Docs
- `.agent/AGENT.md`
- `.agent/MULTI_LANE_WORKTREE_GUIDE.md`
- `.agent/docs/game/design/TERMINOLOGY.md`
- `.agent/docs/game/design/GAME_SPECIFICATION.md`
- `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`

### Core Code
- `pax-fluxia/src/lib/territory/contracts/GeometryContracts.ts`
- `pax-fluxia/src/lib/territory/contracts/TerritoryModeSelection.ts`
- `pax-fluxia/src/lib/territory/contracts/TerritoryModeCatalog.ts`
- `pax-fluxia/src/lib/territory/compiler/canonicalTypes.ts`
- `pax-fluxia/src/lib/territory/transitions/createCanonicalTransitionPlan.ts`
- `pax-fluxia/src/lib/territory/pvCanonical/**`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `common/src/types.ts`
- `common/src/fixtureMaps.ts`
- `common/resources/settings-live/current-settings.json`

## Compatibility Notes

- Mode IDs and config values are runtime compatibility surfaces, not just internal names.
- Renaming them requires either:
  - migration on load, or
  - short-lived aliases with a single preferred write-back value.
- Historical docs, archived plans, and dated investigations will be left in place unless they still act as live operating rules.

## Deliverables

1. Working document
2. live-surface audit findings
3. rename/refactor plan
4. implementation
5. verification summary
6. residual excluded-reference list
