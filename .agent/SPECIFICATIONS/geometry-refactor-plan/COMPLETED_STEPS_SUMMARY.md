# Geometry Refactor — Completed Steps Summary

**Steps 1-3 completed 2026-03-24. Step 5a extraction completed 2026-03-25.**

---

## Step 1: Canonical Contract (DONE)
**File:** `GeometryContracts.ts` — Added `CanonicalGeometrySnapshot` with:
- `CanonicalFrontierPolyline` (frontierId, ownerA/B, ownerPairKey, confidence)
- `CanonicalShell` (outer boundary + holes, area, confidence)
- `CanonicalShellLoop` (classification: outer/hole/border/unknown)
- `GeometryProvenance`, `GeometryDiagnostics`
- `frontierTopology` made required
- `legacyGeometryBridge` removed
- Old `GeometrySnapshot` kept as deprecated alias (zero-breakage migration)

## Step 2: Unified Compiler (DONE)
**File:** `compiler_UnifiedVectorGeometry.ts` (~340L) — Single entry: `compileVectorGeometry()`
- Calls existing generator for base geometry
- `buildOwnerShells()` — shoelace + point-in-polygon (FG2 shell concepts absorbed)
- `buildCanonicalFrontierPolylines()`, `buildCanonicalRegions()`
- `buildProvenance()`, `buildDiagnostics()`
- Error fallback: typed empty snapshot, not fabricated geometry

## Step 3: Single Mode Enforcement (DONE)
- `UnifiedVectorGeometryMode.ts`: 111L → 21L delegator
- `registry.ts`: 4 modes → 1
- `TerritoryModeSelection.ts`: `GeometryModeId` = `'unified_vector'` only
- `TerritorySettingsBridge.ts`: all legacy strings → `'unified_vector'`
- `TerritoryModeCatalog.ts`: 3 legacy entries removed

## Step 5a: Extraction (DONE)
- `smoothSharpVertices()` → `geometryUtils.ts` (was already extracted)
- `applyDisconnectBuffer()` → `geometryUtils.ts` (130L, stateless, no PIXI dep)
- Territory UI simplified: 4 geometry mode buttons → 1
- `selectGeometryMode()` cleaned of legacy engine method routing

## Commits
| Hash | Description |
|------|-------------|
| `cc25275` | Step 1 — CanonicalGeometrySnapshot contract |
| `b899247` | Step 2 — compiler_UnifiedVectorGeometry.ts |
| `6886ae9` | Step 3 — single mode enforcement |
| `36032dd` | Step 4 — consumer cleanup |
| `c4a3076` | docs D-93/D-94 |
| `d9f30d0` | Step 5a — extract + UI simplification |
