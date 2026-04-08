# CONTEXT_CONDENSED — Pax Fluxia (always-load)

**Source of truth:** [`.agent/AGENT.md`](../../../../../AGENT.md). If this file disagrees, **AGENT.md wins**.

**Date:** 2026-04-08 (P0)

---

## Project shape

- **Client:** SvelteKit 5 + PixiJS 8 + TypeScript → `pax-fluxia/`
- **Server:** Colyseus + Bun → `pax-server/`
- **Shared:** `@pax/common` → `common/`
- **Build / tooling:** **Bun only** (`bun install`, `bun run`, `bunx`). Not npm/npx/yarn.
- **Shell:** PowerShell on Windows — **do not chain with `&&`**; run commands separately.
- **Live config snapshot:** `common/resources/settings-live/current-settings.json` when you need current game values.

---

## Non-negotiable behaviors

- **User observations = ground truth** for the running app. Absence of feedback ≠ confirmation.
- **Trace before theorizing:** follow the real code path end-to-end before diagnosing.
- **Never claim “fixed”** without user verification; say “please verify.”
- **Rename/remove protocol:** find all importers (`code_references` / grep) and fix orphans before testing.
- **Logging:** use `$lib/utils/logger` (`log.sys`, `log.state`, …), not raw `console.log`.
- **Game time:** `gameNowMs` / FXClock in game code — not `performance.now()`.
- **Slider reactivity:** UI reads **panel** `$state` + `settingsDefs` / `panelSync`; **not** `GAME_CONFIG` in templates.
- **User controls:** never remove or hardcode over a `GAME_CONFIG` property that has UI without explicit instruction.
- **Git:** commit working state; **never push to `live`**. (Alias `git ac` may use `&&` — prefer explicit add/commit in PowerShell.)

---

## Architecture (current doc baseline)

- **Shared engine:** single `GameEngine` in `@pax/common`; client presents, server authorizes; `sessionId` = player key.
- **Territory (legacy doc):** 4-layer pipeline Ownership → Geometry → Transition → Presentation. **Unified plan:** this stack is **VectorPolygonFamily-internal**; other paradigms (distance field, metaball, contour) are separate **Render Families** — see `PLAN_CONDENSED.md`.
- **Purpose-first planning:** every plan opens with the user’s stated goal; do not substitute objectives.

---

## Debugging discipline (AGENT §3.0)

Restate problem → separate facts / assumptions / unknowns → model boundaries, dataflow, control flow, contracts, invariants → smallest high-confidence change → verification plan → open questions.

---

## Doc ontology (where things live)

| Need | Path |
|------|------|
| Feature status / bugs | `.agent/docs/project/features/FEATURE_STATUS.md` |
| Decisions | `.agent/docs/project/decisions/DECISIONS.md` |
| Territory specs | `.agent/docs/game/territory/` |
| Implementation plans | `.agent/docs/project/implementation-plans/<date>/` |
| Session notes | `.agent/docs/project/sessions/notes/SESSION_YYYY-MM-DD.md` |

---

## Atlas Harness MCP

Full tool reference: [`.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md`](../../../../agentic/AGENT-GUIDE_MCP_atlas-harness.md). Prefer `code_references` before refactors; respect harness shell/git guardrails.

---

## Tranche findings (process acceleration)

Gold-mining passes on design/docs: `.agent/docs/project/process/TRANCHE_{A,B,C,D}_FINDINGS.md` — use for **dedupe and atlas vs docs gaps**, not as code truth.
