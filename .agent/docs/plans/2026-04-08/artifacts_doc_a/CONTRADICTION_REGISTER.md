# Contradiction register — Doc A (v1)

**Schema:** `topic | source A | source B | resolution / open`

| Topic | A | B | Resolution |
|-------|---|---|--------------|
| Universality of 4-layer pipeline | Older docs present stack as universal substrate | Unified plan (2026-04-08): stack = **VectorPolygonFamily-internal** | **Resolved:** adopt Render Family target; keep 4-layer as VP implementation detail. |
| “What works” for transitions | Agent-authored FEATURE_STATUS / chats sometimes claim green | User observation + jumpstart warnings | **Open:** treat status docs as suspect until runtime verified; prefer recorder + human. |
| PVV2 vs Territory Engine routes | Ref commit documents Legacy PVV2 vs Engine Hybrid/Dynamic | Current repo uses `territory/` + settings bridge | **Open:** map current UI keys to historical route names; avoid talking past each other in handoffs. |
| Atlas vs `.agent` mechanics | Tranche A: atlas-only sections | Canonical game docs under `.agent/docs/game/` | **Open:** sync or explicitly fork; log in Doc B which file is authoritative per topic. |

**Not contradictions (clarifications):** “Unified vector” geometry mode in code vs historical geometry enum names — normalization policy in `TerritorySettingsBridge`.
