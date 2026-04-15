# Claims registry — Doc C (final additions)

**Extends:** [artifacts_doc_a/CLAIMS_REGISTRY.md](../artifacts_doc_a/CLAIMS_REGISTRY.md), [artifacts_doc_b/CLAIMS_REGISTRY.md](../artifacts_doc_b/CLAIMS_REGISTRY.md).

| ID | Claim | Source | Str | Verify |
|----|--------|--------|-----|--------|
| C-C-INV-01 | `TERRITORY_TRANSITION_INVENTORY.md` lists the canonical **new** transition path: `TerritoryEngineController` → `createCanonicalTransitionPlan` → `sampleTransitionFrame` → `drawTerritoryFrame`, plus legacy PVV2-internal OT. | `TERRITORY_TRANSITION_INVENTORY.md` | H | Grep symbols; diff if inventory date < code churn. |
| C-C-INV-02 | Ownership is CPU-only (no RT); virtual stars + conquest events are the bridge to transition planning. | Same | H | `OwnershipContracts.ts` + inventory §2. |
| C-C-INV-03 | `VirtualStarOwnershipMode.ts` was placeholder at inventory time — PVV / weight ideas (I-019) may require implementation here. | Same | M | Read current file. |
| C-C-SESS-01 | **Territory alpha overlay** called out as not implemented (early 2026-02). | `SESSION_2026-02-17.md` | L | Product priority. |
| C-C-SESS-02 | Settings default values **derived from GAME_CONFIG** reduces slider/schema drift — relevant to per-family `tunableKeys`. | `SESSION_2026-03-01.md` | M | `settingsDefs` / `game.config` parity tests. |
