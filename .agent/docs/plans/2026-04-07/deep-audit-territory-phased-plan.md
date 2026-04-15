# Deep audit — territory pipeline (phased plan)

**Purpose:** Structured, multi-pass review to judge **technical strength** and **feasibility** of meeting: correct ownership regions + constraints, smooth fitted frontiers, matching fill/border, smooth conquest morphs — under **ownership → geometry → transition → presentation** (see `TERRITORY_ARCHITECTURE.md`).

**Method:** Prefer **atlas-harness** MCP (`user-atlas-harness`): `code_outline`, `code_references`, `code_dependencies`, `file_read`+hash, `code_diff_semantic` across checkpoints. Supplement with repo search when harness scope is insufficient.

**Conflicts:** Treat planning docs as **historical** unless they agree with current code + `TERRITORY_ARCHITECTURE.md`.

---

## Phase 0 — Inventory (no judgments)

- [ ] Enumerate entry points: `GameCanvas.svelte` → `renderTerritoryEngine` / `GameCanvasBridge` / `renderPVV2DY4` / other modes.
- [ ] Map which **config keys** select which path (`TERRITORY_RENDER_MODE`, `TERRITORY_ARCHITECTURE_PATH`, geometry flags).
- [ ] List **all** `TransitionLayerCoordinator` + `PresentationLayerCoordinator` consumers.

**Exit:** One diagram-style bullet list in `territory-pipeline-onboarding-notes.md` (or here) — “who calls whom.”

---

## Phase 1 — Geometry contracts

- [ ] `Geometry_0319.ts` output type vs `compileVectorGeometry` / `CanonicalGeometrySnapshot` — field-by-field.
- [ ] `TerritoryWorker` + `UnifiedVectorGeometryMode`: when does it run vs PVV2 precompute?
- [ ] Chaikin / smoothing: single location per architecture rules.

**Exit:** Table: *artifact* → *producer* → *consumer* → *gaps*.

---

## Phase 2 — Unified transition (product mandate)

- [ ] Trace one conquest: single clock from event → sampled frame; confirm fill + frontier use **same** progress.
- [ ] Flag any independent fill/border timers; classify as **bug** or **experimental** (must not be default path).

**Exit:** Short verdict: “unified transition satisfied? where not?”

---

## Phase 3 — Presentation / PIXI

- [ ] `PixiFillPresenter` / `PixiBorderPresenter`: same vertex source per frame during morph?
- [ ] `PowerVoronoiRenderer_DY4.ts` vs clean bridge: which is closer to goals; what must port?

**Exit:** Risk list ranked P0–P2.

---

## Phase 4 — Feasibility synthesis

- [ ] **Strength:** what is already solid (tests, types, single compiler path, etc.).
- [ ] **Gaps:** minimum sequence to first “whole pipeline green” (milestones).
- [ ] **Recommendation:** one primary integration target for the next implementation sprint.

**Exit:** User-reviewable summary paragraph + optional checklist issue list.

---

*Update checkboxes as phases complete; do not delete superseded notes — strike through instead.*
