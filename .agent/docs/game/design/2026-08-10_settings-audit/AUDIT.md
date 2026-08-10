---
date created: 2026-08-10
last updated: 2026-08-10
last updated by: opus-settings-audit
relevant prior docs:
  - .agent/docs/game/design/2026-07-14_SETTINGS_HUD_AUDIT_DOSSIER.md
  - .agent/docs/MASTER_TASK_LIST.md (2026-07-22 wiring audit)
  - pax-fluxia/src/lib/components/ui/settings/settingsControlRegistry.ts
superseding docs:
---

# Settings integrity audit — 2026-08-10

**What this is.** A complete, re-runnable audit of every settings key: where its
control lives, whether the value persists, whether search can find it, who reads
it at runtime, which subsystem owns the effect, and what to do about it. The
evidence is generated from the code, not written by hand, so it can be re-run
after every cleanup batch and stays true.

**Ownership.** All six batches in §3 belong to this session. An earlier revision
deferred batches 1, 2 and 5 to an `opus-ui-cutover` lane; that claim had sat on
the coordination board since 2026-07-18 with no matching activity and there is no
concurrent agent. Active Claims are cleared and `components/ui/settings/**` is in
scope.

**Regenerate everything:**

```bash
cd pax-fluxia && bun run settings:ledger
```

Artifacts, all in this folder and all overwritten on each run:

| File | What it is |
| --- | --- |
| `ledger.json` | One row per key, full evidence chain. The machine-readable source. |
| `ledger.csv` | Same rows, spreadsheet-shaped, for sorting and triage. |
| `FINDINGS.md` | Generated action tables, grouped by status. |
| `AUDIT.md` | This file — the human read, the tool verdicts, and the execution plan. |

---

## 0. Status — all six batches landed

Executed 2026-08-10. The plan in §3 is history; this is where it ended up.

| Status | Before | After |
| --- | --- | --- |
| `live` | 213 | **334** |
| `unregistered-control` | 91 | **0** |
| `runtime-only` | 75 | 67 |
| `half-wired` | 27 | **4** |
| `orphan-config` | 11 | **0** |
| `startup-only` | 1 | **0** |
| `settings-machinery` | 1 | 1 |
| rows | 419 | 406 |

The 4 remaining `half-wired` are the audio family plus `BASE_TICK_MS`: single
owners, not races (§3 batch 3). The 67 `runtime-only` are the product decision
in §4, untouched on purpose.

**Two of the six batches turned out to be measurement bugs, not defects**, and
that is the most useful thing in this document:

- **Batch 1** — the 14 "unsearchable" controls were all findable. The ledger
  asked `getSearchableSettingRecords()` (the legacy hand map) instead of
  `searchSettings` (the union the search box queries). Same error this audit made
  about the utility drawers. Fixed by giving both callers one honest source,
  `searchableConfigKeys()`, which also emptied 16 of the 22 `KNOWN_UNWIRED`
  baseline entries.
- **Batch 4** — `ANIMATION_SPEED_MS` was never reload-only. `DEFAULT_SPEED_MS` is
  a deliberate fixed reference for the speed *ratio*; reading it live would pin
  the ratio at 1.0 and disable animation-speed scaling. The settings apply path
  already pushes the new speed into the store. Annotated and suppressed, not
  "fixed".

A third correction landed mid-batch: regenerating the control registry was
**destructive**. Extraction only sees controls that still have a Pax row, so a
section that had migrated to projection lost its entries — 19 live controls
would have vanished from the UI. The generator now merges.

Guards added, so none of this can reopen: registry totality
(`settingsControlRegistry.test.ts`), the ast-grep rule pack over both TypeScript
and Svelte markup (`settingsIntegrity.test.ts`), and an empty `KNOWN_UNWIRED`.

## 1. The numbers (as audited, before the batches ran)

Kept as the starting picture; §0 has the outcome.

409 GAME_CONFIG keys. **333 were reachable in the UI; 76 were not.**

| Status | Count | Meaning |
| --- | --- | --- |
| `live` | 213 | Registry control, persisted, searchable, read by real consuming code. Nothing to do. |
| `unregistered-control` | 91 | The user can move it, but `settingsControlRegistry` has never heard of it. |
| `runtime-only` | 75 | Read by code, no control. **Candidates, not defects** — exposing them is a product call. |
| `half-wired` | 27 | A live control missing one wiring leg (search, persistence, a sane range, or a second writer racing it). |
| `orphan-config` | 11 | Declared, unread, unexposed. Dead weight. |
| `startup-only` | 1 | The control writes; the reader froze the value at import. Needs a reload to take effect. |
| `settings-machinery` | 1 | Reaches its effect only through the panel mirror inside the settings layer. |
| `dead-ui` / `disconnected` / `duplicate` | 0 | Clean. The 2026-07-22 wiring pass held. |

> These numbers are the SECOND pass. The first pass read the markup with a tag
> scan and reported 291 exposed / 49 unregistered / 117 runtime-only. Once the
> Svelte→TSX bridge (§2) let ast-grep read the markup structurally, 42 audio
> controls turned out to be exposed through computed keys, one control keyed
> `local.playerPalette.nudges[selected]` turned out to be invisible to the tag
> scan's character class, and 13 more second-writer sites surfaced in MainMenu.
> The direction of every correction was the same: the cruder tool under-reported
> what the user can actually reach.

Two facts worth stating plainly:

- **Every existing settings guard test is green** (61 tests). All of the above is
  invisible to them, because they check the settings layer against *itself*. The
  new findings live in the boundary between the settings layer and the consuming
  code — which is exactly where the recurring "it doesn't do anything" and "it
  doesn't save" bugs come from.
- **The registry covers 242 of the 291 exposed keys (83%).** The remaining 49 are
  four files' worth of hand-rendered territory tuning. That gap is the single
  biggest structural risk in the settings surface, and it is one mechanical
  batch of work.

---

## 2. Toolchain — what was installed, and what each one is actually worth here

| Tool | State | Verdict |
| --- | --- | --- |
| **ast-grep** `0.45.1` | Installed as a dev dependency; `sgconfig.yml` + `sgconfig.svelte.yml`, rules in `tools/ast-grep/rules{,-svelte}/`, Svelte bridge at `pax-fluxia/tools/svelte-tsx/`, CI gate at `pax-fluxia/tools/settingsIntegrity.test.ts` | **Keep — by a wide margin the most valuable of the four.** Found three defect classes nothing else did. Its one real limit (no Svelte grammar) is removed by the TSX bridge below, which took it from 2-of-75 to 219-of-219 on the markup. |
| **Serena** `1.7.1` | Installed via `uv tool install`; project indexed (520 TypeScript files); registered in `.mcp.json` | **Keep.** Real LSP-grade definitions/references/renames — the right tool for executing the fixes below. Not an auditor. |
| **Graphify** `1.0.0` | Already present; graph rebuilt — 25,530 nodes, 31,381 edges, 2,247 communities | **Keep for orientation only.** Answers "what is near this module" well. It has no notion of a config key, so it cannot answer a single question in this audit. |
| **codebase-memory-mcp** `0.10.0` | Installed (npm + binary), **cannot run on this machine** | **Blocked upstream.** See below. |
| **Optave Codegraph** | Not installed | **Skipped deliberately.** It is a deeper version of the tool that is already the weakest fit. The gap here was never graph depth. |
| **Superpowers** | Not installed | Requires an interactive plugin install from the Claude Code CLI (`/plugin marketplace add obra/superpowers`). It is a process/workflow pack, not an analysis tool — nothing in this audit depended on it. Install it yourself if you want the debugging/TDD workflows. |

### ast-grep: what it caught

Rules encoding failure modes this project has actually shipped:

- **`settings-write-outside-store`** — a second writer of a user-facing key,
  bypassing persistence and invalidation. **15 sites in TypeScript, plus 21 more
  in `.svelte` files** once the bridge existed. This is the mechanism behind "the
  value doesn't save" and "it reverts on reload".
- **`settings-frozen-at-import`** — a config value captured into a module-scope
  `const`, so the setting silently becomes reload-only. **1 site**, and it is the
  Animation Speed control.
- **`settings-control-dynamic-key`** — a control whose key is computed, and so is
  exempt from every existing wiring guard. **16 sites.**

All are enforced. `pax-fluxia/tools/settingsIntegrity.test.ts` runs both rule
packs, baselines the known sites with a reason each, and fails on anything new.
The baseline is meant to shrink; a fourth test fails if you fix something and
forget to delete its baseline entry.

```bash
cd pax-fluxia && bun run settings:lint     # TypeScript violations
cd pax-fluxia && bun run svelte:lint       # Svelte markup violations
```

### ast-grep and Svelte — the limit, and the bridge that removes it

ast-grep has no Svelte grammar. Parsing `.svelte` as HTML degrades at the first
Svelte-only construct (`{#if}`, `{expr}`) and silently drops everything after it.
Measured on `ControlsSection-Ships.svelte`: **2 of 75 controls recovered.** A rule
built on that would have reported 73 controls as nonexistent.

`pax-fluxia/tools/svelte-tsx/` fixes this instead of working around it. Rather
than approximate the grammar, it parses each file with **Svelte's own compiler**
— the one that builds the app, so it is right by construction — and re-emits the
markup as TSX, which ast-grep parses natively and exactly. The parts that look
hostile turn out not to be: `on:click`, `bind:value` and `<svelte:window>` are
all valid JSX *namespaced* names, so directives survive verbatim and rules match
them exactly as written in the `.svelte` file.

The generated mirror keeps **the same number of lines as the source, with every
construct on its original line**, so a hit at mirror line N is a hit at `.svelte`
line N — no source map. `sg-svelte.ts` maps paths back and prints the original
source line as evidence (columns do not map, and it does not pretend they do).

```bash
cd pax-fluxia && bun run svelte:lint          # rules over Svelte markup
cd pax-fluxia && bun run svelte:tsx           # just rebuild the mirror
```

**Result: 219 of 219 controls, versus 2 of 75.** Asserted, not asserted-about —
`tools/svelte-tsx/convert.test.ts` checks line-count preservation across all 121
files and compares ast-grep's recall against an independent text scan, so a
regression in the bridge fails CI rather than quietly shrinking the audit.

Three markup rules now run that were previously impossible:

- **`settings-control-key`** — the control inventory the ledger runs on.
- **`settings-control-dynamic-key`** — controls keyed by a computed name
  (`` settingConfigKey={`AUDIO_VOL_${type}`} ``). 16 sites. These are invisible to
  `settingsWiringInvariant.test.ts`, whose regex only collects *quoted literals*,
  so they have never been checked for searchability or persistence.
- **`settings-write-outside-store-markup`** — second writers inside `.svelte`
  files. 21 sites the TypeScript rule could not see because its globs are `*.ts`.

The one thing the bridge does not recover is a key that is not derivable at all:
`settingConfigKey={v.key}`. Template literals resolve by prefix; a bare variable
cannot. Those five sites are reported so they can be made declarative.

### codebase-memory-mcp — blocked, not skipped

It installs and reports its version, but every command that needs its runtime —
`index_repository`, `list_projects`, even `config list` — fails:

```
codebase-memory-mcp: secure daemon endpoint could not be created
```

Diagnosed rather than guessed. `C:\Users\mikep\AppData\Local` carries an inherited
AppContainer capability ACE (`S-1-15-3-3557520199-…`, FullControl) — the sandbox
grant that agent tooling puts there. CBM's permission validation rejects the
directory and refuses to create its runtime endpoint. This is upstream open PR
**#1447** ("fix(windows): accept AppContainer capability grants on runtime
ancestors"), which describes exactly this setup and states the only current
remedies are removing ACEs the sandbox depends on, or not running CBM.

Named pipes, security-descriptor pipes, `Global\` objects and TCP listeners all
create fine on this machine, so it is CBM's validation and not a machine
restriction. Nothing about the audit was lost — the ledger derives its graph from
the real modules and the real reader scan. **Recheck after 0.10.x ships #1447.**

Note also that `codebase-memory-mcp install` without `--skip-config` writes MCP
config, `AGENTS.md` instructions, skills, agents and hooks into ~43 separate
agent-tool config directories across the machine, and edits the user PATH. It was
run with `--skip-config` only; the MCP registration is scoped to this repo's
`.mcp.json`.

### MCP registration

`.mcp.json` now registers **serena** (with `--project` pinned to this repo) and
keeps the existing **atlas-harness**. MCP servers load at session start, so they
become available in your *next* session, not this one.

---

## 3. Execution plan

Ordered by ratio of user-visible correctness to effort. Each batch is
independently shippable; re-run `bun run settings:ledger` after each one and the
status counts should move in the stated direction.

### Batch 1 — Search gaps (14 keys, ~1 hour, zero risk)

Fourteen live, working, persisted controls are absent from the search index. The
user cannot find them by typing their name; they only exist for someone who
already knows which panel to open.

```
CELL_GRID_BOUNDARY_FILL_FLUSH   CONQUEST_SURGE_RADIUS
DAMAGED_ORBIT_EVADE             DAMAGED_ORBIT_RADIUS
GRID_GRADIENT_POSITION_JITTER   STAR_GLOW_INTENSITY
STAR_GLOW_RADIUS_MULT           STAR_POWER_EDGE_BAND_STRENGTH
STAR_POWER_EDGE_BAND_WIDTH      STAR_POWER_LAYER_CURVE
SURGE_PULSE_BIND_TO_TICK        TERRITORY_SURFACE_ALPHA
TERRITORY_SURFACE_LIGHTNESS     TERRITORY_SURFACE_SATURATION
```

Ten of these are already the `KNOWN_UNWIRED` baseline in
`settingsWiringInvariant.test.ts`, where the note says the entries "are deleted
for free when the search index becomes a DERIVATION of the rendered controls".
That derivation exists now: `deriveRegistrySearchRecords()`. Wire the search index
to it and delete the baseline entries — do not hand-add fourteen rows.

Note that the **utility drawers are fine** — all eight resolve on their own label
through `searchSettings`. An earlier version of the ledger reported them as
unfindable because it asked the wrong index: settings and panels live in two
separate indexes (`settingMetadata` and `settingsSearch`), and the 2026-08-08
drawer fix put the panels in the latter. Worth remembering before trusting any
"not searchable" claim about a panel.

### Batch 2 — Persistence and range defects (5 keys, ~30 minutes)

Three controls write a value that is never saved — `WOBBLE_FREQ`,
`WOBBLE_FREQ_SPREAD`, `WOBBLE_PHASE_SPREAD` are missing from `PANEL_CONFIG_MAP`.
They were added in the 2026-07-22 wiring pass and the persistence leg was missed.
Tune the orb judder, reload, it is gone.

Two sliders cannot reach their own default:

| Key | Default | Slider range |
| --- | --- | --- |
| `ORB_BASE_RADIUS` | 1.5 | 2 – 30 |
| `ORB_CORE_SCALE` | 0.4 | 0.5 – 3 |

The value shown on first open is not the value in effect, and there is no way
back to the default once the user touches it. Either widen the range or change
the default — both are one-line fixes, but they must agree.

### Batch 3 — Second writers (36 sites, ~3 hours, needs judgement)

Both rule packs list every site with file and line; the test baselines them all.

- **`audioManager.svelte.ts` — 11 sites** across `AUDIO_MASTER_VOLUME`,
  `AUDIO_MUTED`, `AUDIO_SEPARATE_CONQUEST`. The manager keeps its own state and
  mirrors it into `GAME_CONFIG` from load, from setters, from reset and from
  theme apply. The settings panel writes the same keys through the store. Two
  owners, no arbitration — the most likely cause of any audio setting that
  "won't stick".
- **`MainMenu.svelte` — 19 sites, 13 keys** (`MODIFIED_VORONOI_STAR_MARGIN`,
  `MAPGEN_LANE_*`, `STARS_PER_PLAYER`, `STARTING_SHIPS`, `MIN/MAX_LINKS_PER_STAR`,
  `RETAIN_ORDER_ON_CONQUEST`, `ALLOW_OPPOSING_ORDERS`, `CONQUEST_SLOWMO_ENABLED`).
  New-game setup writing generation config straight into `GAME_CONFIG`, three
  times over in some cases. **Nothing had ever flagged this** — it only became
  visible through the Svelte bridge. The user's map settings and the settings
  panel's map settings are two writers of one set of keys.
- **`GameCanvas.svelte:1008/1530` — `TERRITORY_RENDER_MODE`, `BG_IMAGE_URL`.** The
  PixiJS host writing back its own resolved values.
- **`activeGameStore.svelte.ts:602` — `BASE_TICK_MS`.** Server-authoritative tick
  written straight into config. Probably correct; make it explicit.
- **`gameStore.svelte.ts:2056/2060` — `RETAIN_ORDER_ON_CONQUEST`,
  `ALLOW_OPPOSING_ORDERS`.** Scenario load overriding user settings, silently —
  and MainMenu writes the same two keys, so that pair has *three* writers.
- **`benchmarkBridge.ts:702` — `TERRITORY_RENDER_MODE`.** Bench harness; fine,
  keep it baselined.

Decide per site: route through the store, or declare the key
server/scenario/menu-owned and stop offering it as a user setting. Do not leave
two writers with no rule.

### Batch 4 — Startup-only (1 site, ~15 minutes)

`animationStore.svelte.ts:36` — `const DEFAULT_SPEED_MS = GAME_CONFIG.ANIMATION_SPEED_MS`
is evaluated once at import. Move the read inside the function that uses it.
Until then, the Animation Speed control needs a page reload to take effect, and
nothing in the UI says so.

### Batch 5 — Registry migration (91 keys, ~a day, the structural one)

Ninety-one rendered controls are outside the registry:

| File | Keys | Shape |
| --- | --- | --- |
| `CellGridTuning.svelte` | 24 | literal keys |
| `TerritorySurfaceStyleTuning.svelte` | 13 | literal keys |
| `GridGradientTuning.svelte` | 11 | literal keys |
| `ControlsSection-Territory.svelte` | 1 | literal keys |
| `ControlsSection-Audio.svelte` | 42 | **computed keys** — `AUDIO_VOL_*`, `AUDIO_FILE_*`, `AUDIO_OFFSET_*`, three per sound type |

The audio 42 are a different job from the other 49. They are rendered by looping
sound types and building the key with a template literal, so no static tool —
including this repo's own `settingsWiringInvariant.test.ts` — has ever verified
them. Give the loop an explicit key list (the pattern the registry sections
already use) and they become ordinary registry entries.

Each one maintains its label in the markup, its search text in `settingMetadata`,
and its persisted key in `settingsDefs` — three hand-kept lists that drift
independently. That is the exact mechanism behind every "searchable but
unreachable" and "reachable but not searchable" bug in this project's history.

All 49 are persisted and searchable today, so **this is not a user-visible bug —
it is the removal of an entire bug class.** Extend `tools/gen-settings-registry.mjs`
to cover these four files, then flip them to `SettingsControlRenderer` the way
Travel and Battle already are.

Finish by tightening `settingsControlRegistry.test.ts` to assert what its own
header promises: every exposed key appears in the registry exactly once. Then the
gap cannot reopen.

### Batch 6 — Removals (11 keys, ~30 minutes)

Declared, unread by any code, exposed by no control. Verified individually by
whole-repo grep, not just by the tool:

```
CONNECTION_MAX_DISTANCE   CONQUEST_LERP_DELAY_MS    CONQUEST_TRAVEL_SPEED
LANE_CONVERGENCE_POINT    OVERWHELM_THRESHOLD       SHOW_CONNECTIONS
STAR_GLOW_LAYERS          STAR_LABEL_OFFSET_X       STAR_LABEL_OFFSET_Y
STAR_RING_OFFSET          TRANSFER_ANIMATION_MS
```

`CONQUEST_TRAVEL_SPEED`, `CONQUEST_LERP_DELAY_MS` and `LANE_CONVERGENCE_POINT`
are already in the registry's `REMOVED_KEYS` — their controls are gone but the
config keys, the defaults and the theme entries remain. Delete the keys, their
`PANEL_CONFIG_MAP` rows, their `CATEGORY_KEYS` entries and their occurrences in
`config/builtin-themes/*.json`.

`OVERWHELM_THRESHOLD` appears only in `configTransfer.ts`'s key list — that is
import/export plumbing, not a reader.

---

## 4. What the audit will not decide for you

**75 runtime-only keys.** Code reads them; no control exists. Whether any of them
*should* be a setting is a product question, and static analysis has no opinion.
Most are `pixi-render`-owned territory internals, and most are already in
`PANEL_CONFIG_MAP` — registered to be saved and restored, but never shown. That
is either a deliberate hidden-tunable pattern or leftover from controls that were
removed without cleaning up. Worth one ruling for the set rather than 75
individual ones.

I had this wrong in the first pass and it is worth stating plainly: I reported
117 runtime-only keys and wrote that the `AUDIO_FILE_*` family "should almost
certainly stay out of the settings UI". They are already **in** it — every sound
type gets volume, file and offset controls in the Audio section, keyed by
template literal. The tag scan could not see a computed key, so 42 live controls
read as unreachable. The lesson is not about audio: **a settings surface with
computed keys cannot be audited by any tool that only reads literals**, which is
most of them, including this repo's own guard.

The strongest exposure candidates by reader count are in `FINDINGS.md` §8, led by
`TERRITORY_RENDER_MODE` (30 reads), `PERIMETER_FIELD_GEOMETRY_SOURCE` (20) and the
`CELL_GRID_*` family (10–13 each).

**Two duplicate labels** inside `fleet_star_visuals` — "Glow Intensity"
(`SHIP_GLOW_INTENSITY` / `STAR_GLOW_INTENSITY`) and "Glow Radius"
(`SHIP_GLOW_RADIUS` / `STAR_GLOW_RADIUS_MULT`). Both pairs are real and distinct
(ship vs star); the labels just do not say so. A naming fix, not a merge.

---

## 5. What this audit does not cover

Static evidence only. There was no runtime instrumentation pass and no PixiJS
effect verification — the two remaining passes in the model this audit follows.
Concretely, a key can be `live` here and still not move a pixel if its reader is
behind a branch that never runs. The classes that *are* proven: registration,
persistence, searchability, category coverage, type/range agreement, second
writers, import-time freezing, and the existence of at least one real reader with
file and line.

Adding a runtime pass would mean instrumenting the settings store to log reads,
writes and subscriber invocations while scripted scenarios visit each view, then
asserting renderer state. That is the natural next step once these six batches
land — and it is the only way to close the gap between "something reads this" and
"this changes what you see".

---

## 6. Recommended durable shape

Everything above converges on one change already half-built in this repo:

**One typed registry; every other layer a projection of it.**

`settingsControlRegistry` is that registry, and `SettingsControlRenderer`,
`deriveRegistrySearchRecords()` and `PANEL_CONFIG_MAP` are the projections. The
recurring bugs come from the three places where projection has not replaced a
hand-kept parallel list. Batch 5 closes the last big one. After that the registry
should carry two more fields the audit had to infer:

- **effect owner** — which subsystem consumes the key. The ledger derives it today
  from reader paths; declaring it makes "a setting with no owner" a CI failure.
- **apply semantics** — immediate / reload / restart. `ANIMATION_SPEED_MS` is
  reload-only right now and the UI does not say so.

CI checks worth adding once those fields exist, on top of the three already
enforced by `settingsIntegrity.test.ts`: unknown or duplicate keys, controls
without registry entries, type/default/range disagreement, and any `live` setting
with no subscriber or apply handler.
