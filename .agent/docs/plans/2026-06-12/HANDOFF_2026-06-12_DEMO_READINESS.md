---
date created: 2026-06-12
last updated: 2026-06-12
owner: Mike
purpose: Single hand-off spec to take Pax Fluxia to a publishable playtest demo (itch.io) with stable promo media. Built to be executed by any agent without drift.
ground truth:
  - This document
  - The primary HUD mockup (attached by Mike; treat as pixel-level reference)
  - The design-token file produced in Phase 1 (single source of truth for visuals)
scope: In-game HUD/UI completion, territory rendering completion + one transition animation, Graphify install/use, provider prompt-cache activation.
explicitly out of scope (FROZEN â€” do not touch): renderer-infrastructure refactor (GameCanvas split), worktree-separation architecture audit, docs reorganization, multiplayer/Colyseus, Tauri, PRISM (separate product).
---

# Pax Fluxia â€” Demo Readiness Hand-off (2026-06-12)

## 0. Read this first (operating contract â€” non-negotiable)

The recurring failure on this project is **agents deviating from spec and declaring false completion** â€” work that *renders* but does not *match the reference*, plus parallel divergent implementations. This contract exists to stop that. Any agent picking up this work MUST obey it. Violating it is a failed session regardless of code produced.

**Rules of engagement**

1. **One source of truth.** This document + the mockup + the Phase-1 token file. Do **not** invent new structure, new theme files, new renderer variants, or new HUD copies. We are *consolidating*, not adding.
2. **No new parallel implementations.** There are already three HUD codebases and ~17 territory renderers (see Appendix A). You may not create a fourth/eighteenth. You delete or quarantine; you do not multiply.
3. **Surface-by-surface, never "the whole HUD at once."** Pick one surface (e.g. Player Standings), build it to match the mockup, pass its visual gate, commit, move on. "One polished area does not make the HUD coherent" â€” so each surface is gated independently.
4. **Definition of Done is visual + verified, not "it renders."** A surface is done only when ALL hold:
   - Side-by-side screenshot vs the mockup region is approved (padding rhythm, shared border grammar, semantic icons, type scale, faction colors, glow).
   - `bun run build` (or the client typecheck/build) passes with no new errors.
   - No new `TODO`/`FIXME`/`legacy`/`@deprecated` introduced on the touched path.
   - You wrote a session entry (see Rule 7) listing files touched + gate results.
5. **Forbidden actions:** creating branches/worktrees beyond your assigned one; adding a new renderer or theme; "temporary" duplicate components; marking a task done without the screenshot gate; editing any FROZEN area in the front-matter.
6. **Mandatory work loop per change:** Graphify/`rg` discovery â†’ read the actual source â†’ smallest possible diff â†’ screenshot gate â†’ report. If Graphify and source search disagree, trust source and note it.
7. **Reporting:** append every session to `.agent/docs/handoffs/` with: branch, surfaces touched, exact files, gate pass/fail screenshots, and any deviation from this spec (with justification). No silent scope changes.
8. **If blocked or the spec is ambiguous, stop and ask â€” do not guess.** A wrong guess that looks finished is the most expensive outcome here.

---

## 1. Phase 0 â€” Cut token cost NOW (do this before any code; ~15 min)

Usage is too high because the **already-built** provider prompt cache is not being injected into sessions, and model routing is unassigned. Fix both immediately.

### 1a. Activate the lean provider prompt cache (it already exists)

The cache layer is implemented and `providerCaching` is `true` in `.agent/agentic/config.json`. The previous ~34,240-token default prefix was audited and rejected as too large for routine agent sessions. The current default is a lean artifact-index prefix of about 1,086 estimated tokens (hash `324bed3d...`), with the full stable artifacts loaded only on demand after the cache breakpoint.

```bash
# Rebuild the stable prefix (regenerates only if sources changed)
bun run agentic:context:build
# Confirm readiness
bun run agentic:context:benchmark
# Confirm prefix size/budget
bun run agentic:context:audit
# The prefix to inject lives here:
#   .agent-harness/context-cache/provider-cache-prefix.md
#   .agent-harness/context-cache/provider-cache-strategy.md
```

**Then enforce the request contract in every agent session** (per `provider-cache-strategy.md`):

- Place the contents of `provider-cache-prefix.md` **first**, byte-identical, every time.
- **Anthropic** (Claude Code / Claude API): send the prefix as a `system` text block with `cache_control: { "type": "ephemeral" }` only when the selected model minimum is met. Verify `usage.cache_read_input_tokens > 0` after the first call.
- **OpenAI / Codex**: keep the prefix byte-identical at the start; set `prompt_cache_key: "pax-fluxia-agentic-stable-v2"`. Verify `usage.prompt_tokens_details.cached_tokens > 0` after warm-up.
- **Put ALL volatile content (task brief, diffs, fresh logs, timestamps) AFTER the prefix.** Anything volatile before the breakpoint destroys the cache hit.
- Do **not** inject the full stable artifact bundle by default. Use `/pax-context:inject <artifact-id>` only when a task needs that specific context.

**Acceptance:** `bun run agentic:context:audit` passes, and a second consecutive call on the same prefix reports nonzero cached/read tokens for providers/models whose minimum cacheable length is met. If it does not, the prefix is not byte-identical, volatile data leaked in front of it, or the selected model has a higher minimum cacheable length.

### 1b. Assign model routing (stop paying premium for bookkeeping)

`.agent/agentic/models.json` has every class `unassigned`. Populate them so cheap work uses cheap models:

- `cheap` â†’ inventories, file listings, summaries, doc bookkeeping.
- `balanced` â†’ default implementation / medium edits (most HUD + render work).
- `premium` â†’ architecture review, this-doc-level synthesis only.

Route by task class. Bookkeeping must never hit a premium model.

---

## 2. Phase 1 â€” Install + adopt Graphify (structural discovery)

Purpose (your stated rationale): give every agent fast, structural answers about a large multi-root codebase ("which modules own territory geometry?", "what wires slider state to render behavior?") instead of repeated broad scans â€” which also cuts tokens. Follow the integration plan already drafted in `.agent/docs/sessions/2026-06-11/2026-06-11_graphify-and-provider-cache-plan.md`; this is the condensed execution version.

```bash
# Install (per Graphify docs: https://github.com/safishamsi/graphify)
uv tool install graphifyy

# Smoke test â€” CODE-ONLY, narrow targets first. Do NOT graph the whole repo.
graphify install
/graphify .
```

**Targets for first graph:** `common/`, `pax-fluxia/src/`, `pax-server/src/`, `tools/`, `.agent/docs/project/`, `.agent/docs/game/`, `.atlas/`.
**Exclude:** `node_modules`, `dist`, `.agent-harness`, `resources/audio`, `pencil`, `website_cursor_pencil`, all screenshots, lockfiles, `pax-fluxia/src-tauri/gen` and other generated Tauri mobile folders.

**Privacy guardrails (private code):** start code-only/offline extraction (tree-sitter is local). Do **not** send docs/PDFs/images for semantic extraction on the first pass. **Disable query logging** or redirect it.

**Output handling:** write `graph.json` / `graph.html` / `GRAPH_REPORT.md` to `.agent-harness/graphify/` and keep them git-ignored until value is proven. Add `graphify watch` to the dev loop so the graph stays fresh; a stale graph is worse than none.

**Project install (after smoke test passes):** `graphify install --project --platform codex`. Add Pi path only once Codex works.

**Usage rule (add to agent rules):** Graphify first for architecture/impact discovery â†’ `rg` for exact symbols/keys/text â†’ source reads before any edit. Record any case where Graphify disagrees with source.

**Benchmark gate (prove it before relying on it):** run 5 recurring tasks (territory-pipeline trace, sliderâ†’config trace, lane-geometry impact, server/shared protocol impact, docâ†”code consistency) Graphify-assisted vs `rg`+reads; track files read, est. tokens, time, missed refs, corrections. Keep Graphify only if it reduces reads/missed refs without hiding source verification.

---

## 3. Phase 2 â€” HUD/UI: consolidate to ONE system and match the mockup

### 3.1 The real problem (so it isn't repeated)

You have **three** in-game HUD codebases, each with its **own** theme file and primitives â€” i.e. no shared token authority â€” which is mathematically why nothing reads as coherent:

| Codebase | Location | Notes |
|---|---|---|
| Standalone package (newest) | `pax-fluxia/pax-fluxia-hud/` | clean, isolated, own `hud-theme.css`; incomplete |
| In-app HUD package | `src/lib/components/ui/HUD-package/` | most complete (~1,900 LOC), integrated, has `MapStageMock` |
| Aurelia HUD | `aurelia-hud/` on branch `codex/ui-hud-development` (4b02) | refinement-driven, own `aurelia-hud-theme.css`; "at least equal merit" |
| Legacy | `src/lib/components/ui/GameHud*`, `_archived/GameHUD.svelte` | retire |

**Consolidation mandate:** exactly **one** host shell + **one** token file survive. The other two become harvest sources, then are deleted/quarantined.

### 3.2 Host-shell decision (confirm or override before building)

**Recommended default:** perfect the **standalone `pax-fluxia/pax-fluxia-hud/`** as a clean-room *presentation + token* source of truth against the mockup (no game-state coupling to fight), harvesting the best-realized surfaces from `aurelia-hud` (4b02) and `HUD-package`; then wire live game state and replace the in-app `HUD-package`. This separates "match the mockup" from "wire the data" â€” the two concerns that have been tangling.
**Decision owner: Mike.** Confirm this default or name the host shell to keep. An agent must not start Â§3.4 until this one line is confirmed.

### 3.3 Design tokens â€” the single source of truth (build this first)

Create one token file (CSS custom properties + a TS export) under the chosen host, e.g. `hud-tokens.css` / `hud-tokens.ts`. **Sample exact values from the mockup pixels â€” the hexes below are approximate starting points, not gospel.** Every component consumes tokens; no component defines local colors, spacing, borders, or icons.

| Token group | Definition (calibrate to mockup) |
|---|---|
| Surface | `--bg-void` deep navy-black `#0A1018`; panel fill `rgba(11,20,30,0.72)` + backdrop blur; nebula washes behind map only |
| Primary (gold) | base `#D9A441`, bright `#F2C75C`, dim `#8A6E33` |
| Secondary (cyan) | base `#5FD2E0`, dim `#3A8FA0` |
| Faction colors | You/gold `#F2C75C`, AI3 purple `#A86CF0`, AI1 blue `#4F9CF0`, AI2 red `#F0567A`, AI4 green `#5FD08A`, AI5 teal `#4FD0C4` |
| Borders | 1px hairline; gold `rgba(217,164,65,0.35)`, cyan `rgba(95,210,224,0.25)`; **one** border recipe shared by panel shell AND inner rows (the Overlay Legend regression came from rows not sharing the shell's border grammar) |
| Radius | panel 10px, control 6px; angular "tech-cut" corners via `clip-path` on hero frames only (top-center Tick frame, bottom dock) |
| Spacing scale | 4 / 8 / 12 / 16 / 24 (no off-scale padding) |
| Type | UI: Inter (or Geist). Numeric/technical readouts (tick, time, ship counts, production): JetBrains Mono. Micro-labels UPPERCASE, letter-spacing ~0.08em. Define a 5-step type scale. |
| Icons | ONE semantic icon registry (line icons ~1.5px stroke). No mixed glyph names/emoji. Every call site uses a registry key. |
| Glow | owned/active elements: soft outer glow `0 0 16px <faction>` at low alpha; do not over-bloom |

### 3.4 Component inventory + surface-by-surface acceptance

Build each surface to the mockup, gate it, commit, next. Each is "done" only against the Â§0.4 definition.

1. **Top bar** â€” left: faction sigil (hex emblem) + `YOU`; stat cluster `ACTIVE SHIPS / TOTAL SHIPS / STARS â˜… / PRODUCED â—†` (mono numerals); center: angular hero frame `TICK 67 / MATCH TIME 28:47` with corner ticks + diamond flourishes; right: 3-row timestamped event ticker + chat button.
2. **Left tool rail** â€” collapse chevron `Â«` + icon-only column: overlays (active/gold state), favorite, players, stats, alerts, help. Active item shows gold frame + glow.
3. **Overlays panel** â€” titled `OVERLAYS` + close `X`; 5 rows (checkbox + teal toggle switch): Territories, Borders, Labels, Star Types, Legend.
4. **Event/chat feed (bottom-left)** â€” tabs `ALL / CHAT / ACTIVITY` + filter icon; timestamped rows with faction-colored tags (`[SYSTEM] [You] [AI 3] â€¦`); message input + send button.
5. **Zoom controls (bottom-left corner)** â€” `âˆ’ 100% +` pill + recenter/target button.
6. **Player standings (right, top)** â€” header + `â— LIVE` + expand; faction filter tabs (ALL + 6 sigils); ranked table `PLAYER / ACTIVE / TOTAL SHIPS / STARS / PRODUCTION`; row 1 (You) gold-highlighted; each row faction-colored left border + sigil.
7. **Game speed** â€” segmented `â¸ / 1x / 2x / 4x`; active = gold fill.
8. **Star control** â€” `â€¹ â—‰ â€º` nav; star name + type badge (`PRODUCTION`); stat rows `Owner / Type / Active Ships / Total Ships / Production +24/turn`.
9. **Bottom dock** â€” `MAP / PLAYERS / OVERLAYS / HISTORY / SETTINGS / VIEW`, icon+label, angular frame, active tab marked; centered.

**Visual gate per surface:** screenshot at **1600Ã—900 and 1920Ã—1080**, place beside the mockup region, confirm: shared border grammar, on-scale padding, semantic icons (no stray glyphs), correct type scale, correct faction colors, appropriate glow. Capture both screenshots into the session handoff.

### 3.5 Promo-media anchor

Decide the 2â€“3 hero screenshots / trailer beats up front and treat those exact framings/zoom levels as priority surfaces, so promo capture is stable the moment the HUD passes its gates.

---

## 4. Phase 3 â€” Rendering: pick ONE canonical territory mode and finish it

### 4.1 Select the canonical mode (one-time bake-off, then freeze the rest)

The mockup target is: **soft filled nebula territories with luminous perimeter borders, dashed lanes, and glowing star glyphs with ownership pips.** That look belongs to the metaball / perimeter-field family.

- Run the existing comparison screenshots (`.agent-harness/metrics/browser-screenshots/â€¦`) and a fresh capture of the leading candidates against the mockup.
- **Pick exactly one** mode that best matches the mockup AND holds the perf budget (Â§4.2). Recommended starting candidate: the **perimeter-field / metaball** line (closest to the mockup; most recent active work).
- **Freeze every other renderer:** move the losers to `_archive/` or behind a clearly-off dev flag. Update `renderers/index.ts` so only the canonical mode is reachable in the demo build. Do not delete yet (Phase 5), but they must be unreachable.

### 4.2 Performance budget (hard gate)

- **60 fps / 16.6 ms frame** at the demo's target map size on mid-range hardware (define the spec machine = your capture machine).
- Territory field computation stays **off the main thread** (workers already exist: `metaballGrid.worker`, `pixelTerritory.worker`, etc.). No per-frame heap allocations in the hot path.
- Add a single always-available FPS/frame-time readout (reuse `perf/perfProbe`) for capture-machine verification. No new diagnostic subsystems.

### 4.3 One transition animation (not several)

- Implement **one** buttery, tunable transition for ownership/territory change (e.g. conquest = border morph + fill bloom toward the new faction color).
- Tunable params (duration, easing, bloom intensity) exposed in tuning UI; sensible defaults locked for the demo.
- **Acceptance:** smooth in a 30-second capture on the spec machine, zero stutter, holds the Â§4.2 budget. **Multi-mode transitions are explicitly deferred to post-demo.**

---

## 5. Phase 4 â€” Targeted dead-code cleanup (only after Phases 2â€“3 land)

Now safe because the canonical HUD + renderer are settled. Scope strictly:

- Delete the two non-host HUD codebases and legacy `GameHud*` / `_archived/GameHUD.svelte`.
- Delete the frozen/archived renderer variants that lost the Â§4.1 bake-off (~25 files carry `@deprecated`).
- Remove unused/dead diagnostics and instrumentation on touched paths (no grand "cleanup project" â€” prune as you go).
- Each deletion: confirm zero live references via Graphify + `rg` before removing; build must stay green.

Do **not** start the GameCanvas-split refactor or worktree-separation audit â€” still FROZEN.

---

## 6. Repo hygiene (safe, optional, high-relief)

Independent of the above and needs no mockups: there are 22 prunable worktrees, ~40 branches, 12 stashes. `git worktree prune` clears dead worktree metadata safely. Triage branches into keep/archive/delete and triage stashes; preserve commits, delete refs only with Mike's approval. This reduces cognitive clutter but is not on the demo critical path.

---

## 7. Execution order (summary)

0. **Phase 0** â€” activate prompt cache + assign model classes (cost relief, today).
1. **Phase 1** â€” Graphify install + smoke test + benchmark gate.
2. **Confirm host-shell decision (Â§3.2).**
3. **Phase 2** â€” token file â†’ HUD surfaces 1â€“9, each through its visual gate.
4. **Phase 3** â€” canonical renderer selection â†’ perf budget â†’ one transition animation.
5. **Phase 4** â€” targeted dead-code removal.
6. **Phase 6** â€” repo hygiene (any time, low priority).

**Demo-ship definition of done:** all 9 HUD surfaces pass their visual gates at both resolutions; canonical renderer holds 60 fps with one smooth transition; promo hero shots captured; build green; no FROZEN area touched.

---

## Appendix A â€” Inventory references

- HUD codebases: `pax-fluxia/pax-fluxia-hud/`, `src/lib/components/ui/HUD-package/`, `aurelia-hud/` (branch `codex/ui-hud-development`), legacy `GameHud*`.
- Renderers (~17 variants) under `pax-fluxia/src/lib/renderers/` â€” incl. Metaball, MetaballGrid, Contour, DistanceField, Graph, Lane, ModifiedVoronoi, PowerVoronoi(+DY4), PVV3, RefactoredPVV2, Pixel.
- Caching: `.agent/agentic/config.json` (`providerCaching: true`), `.agent-harness/context-cache/provider-cache-prefix.md` (~1,086 est. tokens, hash `324bed3d...`), `provider-cache-strategy.md`, and `bun run agentic:context:audit`.
- Graphify plan of record: `.agent/docs/sessions/2026-06-11/2026-06-11_graphify-and-provider-cache-plan.md`.
- Relevant prior post-mortems (read before HUD work): `2026-05-23_live-hud-redesign-false-completion.md`, `2026-05-27_hud-refinement-quality-gap.md` (branch 4b02).
