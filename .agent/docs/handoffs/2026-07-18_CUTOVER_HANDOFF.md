---
date created: 2026-07-18
last updated: 2026-07-18
last updated by: gpt-ui-cutover
relevant prior docs:
  - C:\Users\mikep\.windsurf\plans\hud-ui-menu-settings-production-cutover-53c1f1.md
  - .agent/docs/game/design/2026-07-17_HUD_UI_INVENTORY_FOR_REDESIGN.md
  - .agent/docs/game/design/2026-07-18_CUTOVER_PHASE0_INVENTORY.md
  - .agent/docs/engineering/DESIGN_SYSTEM_TOKENS.md
  - .agent/docs/game/design/2026-07-15_SETTINGS_PANEL_CODE_AUDIT.md
superseding docs:
---

# Handoff — HUD/UI/Menu Production Cutover (2026-07-18)

**For:** the Design Master Agent picking up the approved production cutover.
**Read first:** the approved megaplan at
`C:\Users\mikep\.windsurf\plans\hud-ui-menu-settings-production-cutover-53c1f1.md`
(implementation-ready, source-audited). This handoff is a delta on that plan:
what's done, what's in the working tree, and the exact resume point.

---

## 1. What's already done (committed, on origin/master)

| Commit | Phase | What |
|---|---|---|
| `69ad7d3d7` | P0 critical | Fixed destructive "Reset All Settings": was wiping `pax_savedMaps`, `pax_savedGames`, all gameplay preset payloads, and map-editor storage. Replaced with `clearResettableSettingsStorage` (allowlisted protected content) + byte-preservation tests in `configTransfer.test.ts`. |
| `b9313b81a` | P0 | Phase 0 inventory doc: capability ledger seed, protected vs resettable persistence ownership, full `pax-*` event producer/consumer map with dispositions, per-file WIP disposition, graphify rebuild note. |
| `32868386d` | Setup | Devin project MCP config (`.devin/config.json`: Context7, GitHub read-only, Playwright stdio), `AGENTS.md` rewrite, `REVIEW.md` subsystem invariants. No app code changed. |
| `d6281b798` | P0 | Deleted orphan `pax-fluxia/pax-fluxia-hud/` demo package (-2147 lines, 33 files, zero importers, user-confirmed). |
| `b0aa41b1e` | **Phase 1** | Consolidated to single CSS token root: 77 Tier-2 `--pax-ui-*` definitions moved `app.css` → `pax-theme.css`. Added `design-system/tokenManifest.test.ts` (4 tests). Updated `DESIGN_SYSTEM_TOKENS.md`. svelte-check 0/0; 17 tests pass. |
| `ee420dfca` | docs | Session queue update. |

**Phase 1 gate: PASSED.** The token contract is settled. Both skins (`aurelia-drift`, `cyber-flux`) are `[data-pax-theme]` blocks in one file; `app.css` only consumes `--pax-ui-*` via `var()`; manifest test guards against drift back to two-token-root.

---

## 2. Current working tree (uncommitted WIP — INTENTIONALLY LEFT)

These files are staged/modified but NOT committed. They are the interrupted HUD slice from before this session. **Do not assume they are approved.** The plan's Phase 0 disposition (in `2026-07-18_CUTOVER_PHASE0_INVENTORY.md`) applies:

```
 M pax-fluxia/src/lib/components/game/GameContainer.svelte          # mounts the 3 PaxHud* replacements
A  pax-fluxia/src/lib/components/hud/PaxHudSpeedPanel.svelte        # clean, delegates to DS primitives
A  pax-fluxia/src/lib/components/hud/PaxHudStandingsPanel.svelte    # uses localStorage pax-leaderboard-ship-focus (→ uiPreferences in Phase 2)
A  pax-fluxia/src/lib/components/hud/PaxHudTopbar.svelte            # PROBLEMS: direct GAME_CONFIG mutation + public SNAPFIX chip + Tier-1 token refs
A  pax-fluxia/src/lib/components/hud/index.ts                       # barrel
A  pax-fluxia/src/lib/design-system/components/PaxHudLayout.svelte  # UNMOUNTED; relocate to PaxHudShell in Phase 3 after parity proof
 M pax-fluxia/src/lib/design-system/components/PaxSettingsDrawer.svelte  # unused headerClass/subnavClass props
 M pax-fluxia/src/lib/design-system/components/index.ts             # exports PaxHudLayout
A  pax-fluxia/src/routes/dev/settings-slice/+page.svelte            # dev harness — KEEP as committed
```

**Note:** the token move (`app.css` + `pax-theme.css`) was already committed in Phase 1 (`b0aa41b1e`) and is no longer in the working tree — only the HUD slice above remains uncommitted.

### WIP disposition (from Phase 0 inventory, still applies)

- **PaxHudSpeedPanel:** PRESERVE — clean, no issues.
- **PaxHudStandingsPanel:** PRESERVE — but `pax-leaderboard-ship-focus` localStorage belongs in `uiPreferences` (Phase 2).
- **PaxHudTopbar:** REWRITE before accepting — remove (a) direct `GAME_CONFIG.TERRITORY_END_SNAP_FIX` mutation + public SNAPFIX evaluation chip (move to Developer/Diagnostics), (b) Tier-1 token refs (`--pax-color-void`, `--pax-type-2xs`) → Tier-2. Still imports `game-hud` types/viewModels — finish the slice then delete `game-hud/HudTopbar.svelte`.
- **PaxHudLayout:** RELOCATE to `components/hud/PaxHudShell.svelte` in Phase 3 after proving resize/dock/collapse/mobile parity. Not a generic design-system primitive.
- **PaxSettingsDrawer:** FIX unused `headerClass`/`subnavClass` props (apply or remove).
- **dev/settings-slice:** KEEP as a committed harness.

---

## 3. Resume point — exact next steps

### Step A (next): Phase 2 — `uiPreferences.svelte.ts`

This is the highest-value unblocker. Pure store/test work, no browser verification needed, quota-efficient. Unblocks Phase 3 (HUD slices) and Phase 6 (menu).

1. Create `pax-fluxia/src/lib/stores/uiPreferences.svelte.ts`:
   - Versioned schema, defaults, runtime validation, **one** storage namespace (`pax-ui-prefs-v1` or similar), targeted reset.
   - Hydration idempotent + browser-guarded (`typeof localStorage`).
2. Migrate `GameContainer.svelte`'s 14+ direct `localStorage` calls into it. The exact keys (from Phase 0 inventory):
   - `pax-fluxia-menuTheme`, `pax-show-star-info`, `pax-settings-open`, `pax-sidebar-side`, `pax-controls-side`, `pax-leaderboard-collapsed`, `pax-settings-ribbon-expanded`, `pax-pause-on-settings`, `pax-sidebar-width`, `pax-settings-panel-width`, `pax-leaderboard-ship-focus`, `pax-icon-set`, `pax-hud-typography-tokens-v1`, `pax-ui-theme-id`.
3. Replace the `pax-*` state-sync event bus (producer/consumer map in Phase 0 inventory):
   - `pax-settings-config-sync-requested` → `settingsStore.syncFromConfig` command.
   - `pax-tick-interval-changed` → typed effect/derived.
   - `pax-bg-change` / `pax-bg-alpha-change` → typed settings effect adapter consumed by `GameCanvas`.
   - `pax-star-info-toggle` → `uiPreferences.showStarInfo`.
   - `pax-theme-applied` → **delete** (no consumer).
   - **KEEP** `pax-game-container-mounted`/`-unmounted` — documented `/play` lifecycle contract, not settings sync.
   - **FIX** `star-info-toggle` (no `pax` prefix, dispatched by `GameCanvas:4356`) — align with `pax-star-info-toggle` or route through `uiPreferences`.
4. Add protected-persistence sentinel test: populate `pax_savedMaps`, `pax_savedGames`, `pax-game-themes`, `pax_composedThemes`, `pax_categoryThemes_*`, `pax_starredThemes_*`, `pax-map-editor-*` with sentinel values; call `uiPreferences.reset()`; assert all protected keys byte-identical; assert only the UI namespace cleared.
5. Gate: persistence round-trip, invalid-payload fallback, reset protection, listener cleanup, focus/Escape/backdrop (if overlay primitives added), reduced-motion, Tauri-safe guards.

### Step B: Phase 0 tail — Playwright + axe dev deps + viewport matrix

The repo's own automated browser/a11y suite (distinct from the Playwright MCP in `.devin/config.json` which is for ad-hoc Devin use). Needed before any Phase 3 slice gate.

- Add `@playwright/test` + `@axe-core/playwright` as dev deps (vetted versions, ≥7 days old).
- Add `test`/`test:ci` scripts to `pax-fluxia/package.json` (currently none — tests run via `bun test --cwd pax-fluxia <path>`).
- Playwright config with viewport matrix: 1440×900, 1024×768, 768×1024, 390×844, 844×390 + safe-area.
- Baseline smoke tests for menu, `/play`, settings routes.
- Capture current svelte-check a11y diagnostics as debt (not accepted compliance).

### Step C: Phase 3 — HUD vertical slices

Migrate by complete behavior slices using the new `uiPreferences` + the settled token contract. The parity ledger is seeded in `2026-07-18_CUTOVER_PHASE0_INVENTORY.md` § "Capability ledger." For each slice: add/update parity proof → switch one production renderer → test → user visual approval → delete replaced component + barrel + `hud.css` selectors **in the same slice**. Do not accumulate dead paths.

Slice order (from the plan):
1. **Shell** — prove `PaxHudLayout`→`PaxHudShell` parity (resize, dock, collapse, mobile) in an isolated harness, then mount in `GameContainer`. Keep `GameCanvas` lifecycle/resize stable.
2. **Top/status** — finish `PaxHudTopbar` (fix the 3 problems above), delete `game-hud/HudTopbar.svelte`.
3. **Tactical** — one standings component, desktop rail + mobile sheet variants.
4. **Tempo/navigation** — one speed/tick model + one star nav/inspection family across breakpoints.
5. **Commands/overlays** — command bar, quick actions, room badge, selected-star overlay, results, confirmations.
6. **Settings integration** — mount existing `GameSettingsPanel` via narrow ribbon/sheet adapter; replace with Phase 4/5 shell when ready.
7. **Final HUD deletion** — remove `components/game-hud/` and `components/ui/hud/` (except relocated generic icon/result code); remove old barrels/global classes.

### Steps D–G: Phases 4–8 (per the approved plan)

- **Phase 4:** settings ownership completion (preserve `settingsStore`; split `panelSync`; `settingsNav.svelte.ts`; shrink `KNOWN_UNWIRED` 22→0).
- **Phase 5:** settings presentation redesign.
- **Phase 6:** main-menu `menuSetupStore` + responsive cutover; delete `menuTheme.ts`/`MenuThemeRail`/`--pf-*`.
- **Phase 7:** theme→preset rename (behavior-preserving; preserve `pax-game-themes` etc.).
- **Phase 8:** CSS deletion + hard cutover + final gates.

---

## 4. Decisions already made (do not re-litigate)

- **Hard cutover, not A/B.** Reach parity, then delete superseded code. Git history is the rollback mechanism.
- **UI prefs may reset at cutover; protected content never does.** Protected = `pax_savedMaps`, `pax_savedGames`, `pax-game-themes`, `pax_composedThemes`, `pax_categoryThemes_*`, `pax_starredThemes_*`, `pax_themePresets` (legacy), `pax-map-editor-*`, `pax_defaultMap`.
- **settingsStore's `panelKey↔configKey` bijection is verified** — don't rekey (pure churn). Redesign presentation, not the data layer.
- **Single CSS token root:** `pax-theme.css` owns Tier 1 + Tier 2; `app.css` only consumes. Guarded by `tokenManifest.test.ts`.
- **No `console.log`** — use `log.sys/state/...` from `$lib/utils/logger`.
- **Sliders read `panel.xxx`**, never `GAME_CONFIG` in templates.
- **Bun only; PowerShell (no `&&` chaining).** `bun run --cwd <dir> <script>` (not `bun --cwd <dir> run`). Tests: `bun test --cwd pax-fluxia <path>` (no `test` script yet).
- **Commit by explicit pathspec** (shared index); push to `origin/master` after each commit. Never push to `live`.
- **One agent per working tree.** Claim on `.agent/intra-agent-coordination.md` before editing; release when done.

---

## 5. Things requiring user confirmation

- **Any destructive directory/file removal** (the orphan package deletion was the last one and is done). Default to asking.
- **Major desktop/tablet/portrait/landscape compositions** need explicit user visual approval before the final old-UI deletion in each Phase 3 slice — automated success alone does not authorize deletion.
- **Removing any user-facing control** tied to `GAME_CONFIG` — never without explicit instruction.

---

## 6. Verification commands (Bun 1.3.5, Windows/PowerShell)

```powershell
bun run --cwd pax-fluxia check                 # svelte-check — expect 0 errors/0 warnings
bun test --cwd pax-fluxia <path>               # targeted Vitest
bun test --cwd pax-fluxia                      # full Vitest (before cutover)
bun run --cwd pax-fluxia build                 # vite production build (adapter-static)
bun run --cwd pax-fluxia tauri dev             # Tauri dev smoke
bun run --cwd pax-fluxia tauri build           # Tauri release build
bun run agentic:graphify:build                 # rebuild code graph after structural changes
graphify query "<question>"                    # structural discovery (consult BEFORE broad grep)
graphify path "<A>" "<B>"                      # relationship between two files
graphify explain "<concept>"                   # focused concept subgraph
```

**Caveat:** `bun --cwd <dir> run <script>` is INVALID in 1.3.5 — `--cwd` must follow `run`. A passing unit suite does not prove browser layout; a screenshot does not prove keyboard/persistence/multiplayer/Tauri behavior.

---

## 7. Tooling & MCPs configured

- **Graphify 0.8.38** — installed, graph rebuilt (4628 nodes, `graphify-out/graph.json`). Consult before broad grep/file-reading.
- **Atlas Harness MCP** — guardrailed file/git/exec; see `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md`.
- **`.devin/config.json`** (project-scoped, committed): Context7 (HTTP), GitHub read-only (HTTP, needs `devin mcp login github`), Playwright (stdio).
- **`.devin/config.local.json`** (gitignored): for personal `CONTEXT7_API_KEY` / tokens. See `.devin/config.local.json.example`.
- **No Serena** — Graphify covers structural nav.
- **No Sentry/SonarQube MCP** — repo doesn't use them.

---

## 8. Key files to read first

1. `C:\Users\mikep\.windsurf\plans\hud-ui-menu-settings-production-cutover-53c1f1.md` — the approved plan (all phases, gates, acceptance criteria, rollback).
2. `.agent/docs/game/design/2026-07-18_CUTOVER_PHASE0_INVENTORY.md` — capability ledger, persistence/event ownership, WIP disposition.
3. `.agent/docs/game/design/2026-07-17_HUD_UI_INVENTORY_FOR_REDESIGN.md` — the full itemized UI inventory (LOC, file roles, structural findings).
4. `.agent/docs/engineering/DESIGN_SYSTEM_TOKENS.md` — the token contract (now consolidated).
5. `.agent/docs/game/design/2026-07-15_SETTINGS_PANEL_CODE_AUDIT.md` — settings audit (phases 0-2,4 done; 3 reassessed).
6. `AGENTS.md` — architecture boundaries, commands, invariants, verification protocol.
7. `REVIEW.md` — subsystem review invariants.
8. `.agent/AGENT.md` — master context (RULE 0: search first; design protocol; etc.).

---

## 9. Coordination

- **Handle:** `gpt-ui-cutover` is claimed on `.agent/intra-agent-coordination.md` for the cutover surfaces. If you're taking over, update the claim with your handle.
- **Master task list:** `.agent/docs/MASTER_TASK_LIST.md` has the cutover task under `## 2026-07-18`.
- **Session docs:** `.agent/docs/sessions/2026-07-18/` (Chat, Queue, Session, Takeaways).

---

**TL;DR for the next agent:** Phase 1 (token contract) is done and gated. Start at Phase 2 (`uiPreferences.svelte.ts`) using the exact key/event lists in `2026-07-18_CUTOVER_PHASE0_INVENTORY.md`. The uncommitted HUD slice in the working tree is interrupted WIP — disposition it per Phase 3, don't assume it's approved. Protected persistence is sacred. Run `check` + targeted tests after every change. Commit by pathspec, push to origin.
