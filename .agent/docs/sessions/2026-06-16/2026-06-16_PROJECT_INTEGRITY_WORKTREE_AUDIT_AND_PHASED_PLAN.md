---
date created: 2026-06-16
last updated: 2026-06-16
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-16/2026-06-16_STRANDED_GEOMETRY_WORK_INVESTIGATION.md
  - .agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_PIPELINE_MODEL_AND_FIX_PLAN.md
  - .agent/docs/sessions/2026-06-12/2026-06-12_worktree-consolidation-plan.md
superseding docs:
---

# Project Integrity — Multi-IDE Worktree/Branch/Docs Audit + Phased Plan

## Purpose (user's words)
"Ensure the project itself has integrity, by not leaving behind important work." Full worktree
audit across **Codex, Claude, Cursor, Opencode, Antigravity** path formats — including locations
**outside the project root** — covering **code AND docs**. Then a phased plan sequencing from the
audit through all outstanding work. Geometry work is ON HOLD until integrity is established.

## A. Audit method (where I searched — verified)
- `git worktree list`, `git remote -v`, `git branch -a` (45 local / 23 remote), per-branch
  ahead-of-master.
- Filesystem scan of every home dot-dir (`.codex .claude .cursor .opencode .antigravity .gemini
  .windsurf .aider` …), the IDE worktree roots, all `WebDev/` siblings, and `C:\wt*`, locating
  every `.git` (clone-dir vs worktree-file) to depth 2.
- Probed every **pax-named / PRISM-codename** sibling for: git identity, origin, shared-with-main,
  branches, recent commits, and presence of `.agent`/docs.

## B. Inventory & classification

### B1. Registered worktrees of THIS repo (24; commits all visible from master)
- **Main:** `Desktop/WebDev/pax-fluxia` @ master.
- **Codex** (`~/.codex/worktrees/<id>/pax-fluxia`, 19): 4b02, 4e67*, 4f3c, 5f72*, 703d, **736a**,
  9f22, abc9, acb1, baseline-186cbf03*, **bea2**, c6dd, db53, **dcc7**, ember-lattice, f76c,
  perimeter-field-metaball, rebuild-master-from-186cbf03 (*=detached).
- **Claude** (project `.claude/worktrees/`, 3): consolidation, gg-perf, goofy-raman.
- **Other registered:** `C:/wt27` (worktree-separation-remainder); `PRISM-ui-design`
  **[prunable — dir gone]**.

### B2. Git branches with unmerged commits (master lacks them) — triage status
- **Geometry/render (in-repo) — KEEP/triage:** `2026-05-06-phase-field-history-salvage` (736a —
  **Fresh PV geometry core**, de-novo engine), `phase-field-msr-boundary-fixes` (bea2 — **junction
  walk fix**), `render-infra/pvv4-transition-bets` (dcc7 — transition + **41 dropped docs**),
  `territory-rendering-checkpoint-2026-06-12` (db53 — render-bridge contracts), `metaball-grid-
  transition-edge-shaping`, `metaball-radical-opt-review`, `2026-04-30-phase-edges-catchup`,
  `antigravity/pvv3-fg2-integration` + `antigravity-pvv3-smoothing` (Antigravity pvv3/fg2 work),
  `render-infra/viewport-background-edge-fix`, `ember-lattice-reconcile`.
- **Already merged/superseded:** `continue-metaball-perimeter-mode`, `perimeter-field-metaball`
  (both fully on master), `rebuild-master-from-186cbf03` (replay/perf).
- **Non-geometry (separate triage):** `ui-main-menu` (6↑), `ui-settings/audience-facade` (2↑),
  `1455-custom-map-editor` (3↑), `territory-active` (1↑), `feat/star-data-prod` (5↑), `live` (9↑),
  `salvage-sinking-bug` (6↑), `background-mode-system`, `entire/checkpoints/v1`,
  `worktree-separation-architecture-*`.
- **Docs-only:** `perimeter-field-audit-20260414` (gap report / impl plan).
- ⚠️ **Per-branch DOC content triage NOT yet exhaustive** — only the geometry branches' docs were
  diffed. Phase 1 completes this for all unmerged branches (docs are first-class).

### B3. Separate clones OUTSIDE the project root (own git; commits NOT in main object DB)
- **`WebDev/fluxia`** — clone of `pax-fluxia.git`; branch `cursor` (purely local, **unpushed**) +
  `master` **4 commits ahead of origin (unpushed)**. Last commit **2025-05-25** ("new version in
  Windsurf from a spec doc"). **Stale (~13 mo), no `territory/` geometry.** Integrity: preserve the
  unpushed commits; likely historical. Has README/todo/screencapnotes only.
- **`WebDev/pax-fluxia-ui-design`** — the `feat/pax-fluxia-ui-design` worktree, **moved** off the
  prunable `PRISM-ui-design` registration (its `.git` pointer is now dangling). Full pax tree +
  **design docs** (`LESSONS_LEARNED.md`, `ONBOARDING.md`, `README.md`) + extra dirs
  (`under_development/`, `reference/`, `resources/`, `website_cursor_pencil/`, `docs/`, `.agent/`,
  `diff.txt`, `git_log.txt`). Branch code is recoverable via the in-repo branch; **untracked extras
  may be unique** → must be checked (Phase 2).
- **Predecessor games (separate repos, historical):** `paxgal` (paxgalaxia.git), `newpax2024`,
  `starflow-origins` (starflow.git). Likely superseded; scan only for unique design docs (Phase 2,
  low priority).
- **Ruled out (different products):** `PRISM` (prism-prototype-workspace), `PRISM-Atlas` (tiptap/
  skills), `antigravity-1` (metabrain-curatio — note: Antigravity's *pax* work is the in-repo
  `antigravity/*` branches, not this clone), `quintessential-td` (TD game; shares `.agent`
  harness + a leftover `pax-fluxia` pkg name only). `PRISM-Atlas-DART` not a git repo.
- **Other IDEs:** Cursor worktrees exist but for `tabsoutliner` (not pax); Opencode/Aider absent;
  Antigravity/Gemini/Windsurf dot-dirs present but hold no pax worktrees.

### B4. Dead references to clean up
- `clean-arch` git **remote** → `PRISM-territory-clean-arch` (**dir gone** → broken remote).
- `PRISM-ui-design` registered worktree is **prunable** (content moved to `pax-fluxia-ui-design`).

## C. Phased plan

> Principle (carried from the consolidation plan + agent protocol): **consolidation first,
> judgment second, deletion last**; nothing deleted without explicit user verification.

- **Phase 0 — Audit (THIS doc).** ✅ Locations enumerated across all IDE formats + clones. Gate:
  user agrees the inventory is complete (or names a location to add).
- **Phase 1 — Complete the branch/docs triage.** For EVERY unmerged branch in B2 (not just
  geometry): classify code + **docs** as keep / superseded / abandon, with merge-base isolation.
  Output: one census table (code + docs per branch). Gate: user marks the keep-set.
- **Phase 2 — Preserve stranded DOCS (low risk, do early).** Bring onto master: the **41 dropped
  dcc7 structural docs**; unique docs from `pax-fluxia-ui-design` extras (`under_development/`,
  `LESSONS_LEARNED`, `reference/`); any unique docs from predecessor clones. Additive only; commit+
  push. Gate: user confirms doc set.
- **Phase 3 — Preserve stranded CODE integrity.** Decide per item (keep-branch / cherry-pick /
  abandon): `fluxia` unpushed `cursor`+`master` commits (push to a clearly-named ref or archive);
  in-repo keep-set branches recorded so none are lost to pruning. No deletions yet.
- **Phase 4 — Geometry decision (the fork).** Assess the **736a Fresh PV core** completeness/
  correctness (is it functional, tested, contract-correct?) vs the surgical **bea2 junction-walk
  fix**. Decide **A) patch legacy 0319** vs **B) adopt/finish Fresh PV core**. Gate: user picks A/B.
- **Phase 5 — Execute geometry fix.** Implement the chosen path, test-gated (the failing junction
  test goes green), behavior/parity-verified, user visual sign-off across modes. Then region
  identity + the resolver second-walk alignment (the layered fixes).
- **Phase 6 — Resume render/perf/transition work.** Grid Gradient perf remainder (worker vstars
  payload, particle upload), the pre-existing settings-bridge + benchmark test failures, and the
  **vector-transition direction** (kinetic-Voronoi: interpolate sites/weights via the dual
  triangulation — converges PVV4 intent + the generator-animated proposal).
- **Phase 7 — Worktree cleanup (deletion LAST, per item, user-verified).** Prune the prunable
  `PRISM-ui-design`, fix/remove the dead `clean-arch` remote, retire merged worktrees
  (continue-metaball-perimeter, perimeter-field-metaball) and the subsumed `gg-perf`/`consolidation`
  once their work is confirmed on master. Only after Phases 1–3 confirm nothing is lost.

## D. Open decisions for the user
1. **Inventory completeness:** is B complete, or is there an IDE/location to add (e.g., a machine/
   drive I can't see, or a remote besides `origin`/`clean-arch`)?
2. **Phase order:** do Phase 2 (preserve docs) immediately (low-risk, high-integrity value), or run
   the full Phase 1 census first?
3. **`fluxia` (2025-05 stale clone):** preserve its unpushed commits (push to an archive branch) or
   leave as-is on disk?
