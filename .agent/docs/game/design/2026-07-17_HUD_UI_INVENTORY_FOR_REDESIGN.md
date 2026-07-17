# HUD / UI / Main-Menu Inventory — redesign handoff dossier

**Date:** 2026-07-17 · **Purpose:** hand a UI Design Master Agent a complete, itemized map of every
HUD/UI/menu file — LOC, live-vs-dead status, CSS, stores, and theme/data layers — for an essentially
complete rewrite/redesign. **Every figure is `wc -l` measured; every live/dead call is grep-verified
against the whole repo, not inferred.**

> **Headline:** the live HUD/UI surface (excluding the PixiJS render engine, the marketing site, the
> map editor, and dead code) is **~37,800 LOC**. Settings alone is **~16,500**. There are **THREE
> abandoned HUD rewrites still in the tree (~4,200 LOC)** and **TWO different HUD component families
> rendered simultaneously** by the live game. That combination — huge surface, coexisting families,
> and a graveyard of half-adopted redesigns — is almost certainly why past efforts "yielded little."

---

## 1. Live composition map (what actually renders)

```
/  (root route, +page.svelte 50)
└─ LandingPage         ← src/lib/components/landing-site  (marketing; SEPARATE concern — §K)
      └─ onPlay → GameContainer

GameContainer.svelte (2173)                         ← the in-game shell / orchestrator
├─ MainMenu                 (ui/main-menu)          ← §C
├─ GameCanvas (5141)        (PixiJS render engine — NOT UI markup; overlays only) ← §A note
├─ AudioSettings (694)      (ui/AudioSettings — modal, shared with MainMenu)
├─ from ui/hud  ▸  Leaderboard, ResultsModal, SpeedControls, StarInfoPanel,
│                  StarNav, StarsPanel, StatusBar, HudIcon      ← FAMILY 1  §A
├─ from game-hud ▸ HudTopbar, BottomCommandBar, GameSpeedPanel,
│                  PlayerStandingsPanel, QuickAccessDock, SelectedStarPanel,
│                  SettingsRibbon                                ← FAMILY 2  §A
└─ SettingsRibbon → GameSettingsPanel (1890) → 23 settings files ← §B
```

**CORRECTED FRAMING (2026-07-17, after reading the markup — supersedes an earlier oversimplification
in this doc's history):** the two families are NOT two competing designs rendered on top of each
other. They are a **responsive split of ONE composite HUD**:
- **`game-hud` = the desktop chrome** — HudTopbar, the right sidebar (PlayerStandingsPanel,
  GameSpeedPanel, SelectedStarPanel, QuickAccessDock), BottomCommandBar, SettingsRibbon.
- **`ui/hud` = the mobile + overlay pieces** — a mobile-only controls bar (SpeedControls + StarNav,
  `.area-controls-bar`), a mobile drawer (Leaderboard), the canvas StarInfoPanel overlay, the
  secondary StatusBar strip, and ResultsModal.
The overlapping roles (speed, standings, selected-star) each have a **desktop impl and a mobile impl**,
CSS-media-query gated, so on any one screen you see ONE of the pair — not both. This is two component
libraries built at different times, split by breakpoint, NOT "pick one and delete the other."
(Verified: `GameContainer.svelte:786-1180`; `.area-controls-bar` is commented MOBILE-ONLY at :868;
Leaderboard is inside `mobile-drawer` at :1161-1178.)

**The genuinely separate, complete alternative HUD DESIGNS are the DEAD ones (§I):** `aurelia-hud`
(a full HUD shell — `PaxHud.svelte` — driven by MOCK demo state, Tailwind-based, viewable today only
at `/dev/aurelia-hud`, NOT wired to the engine) and `_archived/GameHUD.svelte` (an older complete HUD).
These are the real "System B" candidates — see §5 Q1.

---

## 2. Totals by bucket

| Bucket | Files | LOC | Status |
|---|---:|---:|---|
| A. In-game HUD — family `ui/hud` | 8 | 3,859 | LIVE |
| A. In-game HUD — family `game-hud` | 13 svelte +3 ts | 1,963 | LIVE |
| A. Shell — GameContainer | 1 | 2,173 | LIVE |
| B. Settings shell + sections | 24 | 12,040 | LIVE |
| B. Settings data layer (.ts) | 10 | 3,644 | LIVE |
| B. AudioSettings + RangeDual | 2 | 814 | LIVE |
| C. Main Menu | 10 svelte +2 ts | 5,788 | LIVE |
| D. Design system | 18 comp +3 ts | 1,887 | LIVE |
| E. CSS (live) | 4 | 3,175 | LIVE |
| F. UI-facing stores | ~9 | ~1,240 | LIVE (mixed) |
| G. Theme/config data | 3 | 945 | LIVE |
| H. Icons | 2 | 218 | LIVE |
| **LIVE UI SUBTOTAL** | **~120** | **≈37,746** | (excl. GameCanvas engine) — clean tree, no dead code |
| I. DEAD / experimental HUD | 0 | 0 | **ALL REMOVED 2026-07-17** (was ~4,235 across 12 files) |
| J. Landing / marketing site | 15 +routes | 3,905 | SEPARATE concern |
| K. Map editor (separate tool) | 12 | 7,249 | OUT of scope |
| — GameCanvas (Pixi engine) | 1 | 5,141 | engine, not markup |

---

## 3. Itemized inventory

### A. In-game HUD

**Family 1 — `src/lib/components/ui/hud/` (LIVE via GameContainer):**

| File | LOC | Role |
|---|---:|---|
| ResultsModal.svelte | 1,285 | end-of-match results overlay |
| StarsPanel.svelte | 620 | owned-stars list panel |
| StarNav.svelte | 609 | star navigation / cycling |
| Leaderboard.svelte | 556 | standings |
| StarInfoPanel.svelte | 301 | selected-star detail |
| StatusBar.svelte | 283 | status strip |
| SpeedControls.svelte | 153 | tick speed |
| HudIcon.svelte | 52 | icon wrapper (shared) |
| `index.ts` | 8 | barrel |

*(TopBar.svelte, 261 LOC, was here — DELETED 2026-07-17, see §I.)*

**Family 2 — `src/lib/components/game-hud/` (LIVE via GameContainer):**

| File | LOC | Role |
|---|---:|---|
| TypographyTokenPanel.svelte | 487 | typography token editor (settings drawer) |
| HudThemePanel.svelte | 253 | theme controls |
| HudTopbar.svelte | 225 | **the live topbar** (competes with ui/hud/TopBar) |
| ThemeLibraryPanel.svelte | 208 | theme library |
| SelectedStarPanel.svelte | 141 | selected-star (competes with ui/hud/StarInfoPanel) |
| PlayerStandingsPanel.svelte | 138 | standings (competes with ui/hud/Leaderboard) |
| GameSpeedPanel.svelte | 66 | speed (competes with ui/hud/SpeedControls) |
| SettingsRibbon.svelte | 65 | mounts GameSettingsPanel |
| HudIconButton / HudPanel / HudRail / BottomCommandBar / QuickAccessDock | 166 | primitives + docks |
| viewModels.ts / types.ts / index.ts | 214 | view-model builders + types |

> **The overlap is RESPONSIVE, not redundant (corrected — see §1):** the desktop chrome (`game-hud`)
> and the mobile/overlay pieces (`ui/hud`) render the same roles at different breakpoints, media-query
> gated. A redesign should still unify to ONE component vocabulary, but the two are not two visible
> copies of the same panel — they are the desktop and mobile halves of one HUD.

**Shell:** `GameContainer.svelte` (2,173) — orchestration + inline HUD layout + a large `<style>`.
`GameCanvas.svelte` (5,141) is the **PixiJS render engine** (territory/ships/stars drawing), not UI
markup — treat as out of scope except for the canvas-overlay seams.

### B. Settings surface (the largest single area — ~16,500 LOC)

**Shell:** `ui/GameSettingsPanel.svelte` (1,890) — just refactored (audit phases 0-2,4; see
[[settings-are-data-not-dom]]). Data layer now extracted to `settingsStore`.

**Sections & widgets — `ui/settings/` (23 files, 10,150):** ControlsSection-Ships 1,286 · CellGridTuning
1,202 · ControlsSection-Territory 1,143 · ControlsSection-Diagnostics 1,077 · TerritorySurfaceStyleTuning
708 · GridGradientTuning 485 · ControlsSection-Visuals 477 · CategoryThemeBar 447 · ControlsSection-FrontierFx
439 · ControlsSection-Travel 356 · ControlsSection-Conquest 340 · ControlsSection-Audio 336 ·
ControlsSection-Surge 286 · ControlsSection-Players 273 · ControlsSection-Timing 269 · TerritorySlaWidget 180 ·
ConfigTransferPanel 164 · SettingsDumpDiagnosticsControls 145 · SaveLoadGamePanel 143 · ControlsSection-Economy
141 · ControlsSection-Logging 97 · ControlsSection-Battle 85 · ControlsSection-AI 71.

**Data layer — `.ts` (10 files, 3,661):** settingsDefs 739 · settingMetadata 687 · panelSync 644 ·
settingsStore.svelte 367 · settingsSearch 362 · settingsRegistry 280 · animLockMath 160 · settingsState 154 ·
configTransfer 147 · settingsTaxonomy 121. (This is the registry/persistence/search machinery; a UI
redesign consumes it but should mostly leave it — it was just rebuilt.)

**Shared:** `ui/AudioSettings.svelte` (694, modal used by both game + menu) · `ui/RangeDual.svelte` (120,
used by main-menu GameMapPanel).

### C. Main Menu — `src/lib/components/ui/main-menu/` (5,788)

| File | LOC | Role |
|---|---:|---|
| MainMenu.svelte | 1,731 | menu shell/orchestrator |
| GameMapPanel.svelte | 976 | map setup |
| MultiplayerPanel.svelte | 567 | MP lobby/setup |
| PlayersPanel.svelte | 480 | player roster |
| BackgroundSelectModal.svelte | 325 | bg picker |
| PlayerColorPopover.svelte | 230 | color picker |
| HueDial.svelte | 223 | hue wheel |
| MenuCommandBar.svelte | 216 | bottom bar |
| MenuUtilityTopbar.svelte | 207 | top utility bar |
| MenuThemeRail.svelte | 132 | theme rail |
| menuTheme.ts | 577 | menu theme data |
| menuDefs.ts | 120 | menu constants |
| index.ts | 4 | barrel |

### D. Design system — `src/lib/design-system/` (1,887)

18 components (`PaxHud*`, `PaxSettings*`): PaxSettingsPickerRow 272 · PaxSettingsDrawer 183 ·
PaxSettingsToggleRow 168 · PaxHudRange 149 · PaxHudSelect 131 · PaxColorSwatchButton 118 ·
PaxSettingsRangeRow 86 · PaxSettingsSegmentedRow 85 · PaxHudFileButton 78 · PaxHudButton 72 ·
PaxSettingsInfoRow 71 · PaxHudSegmentedControl 67 · PaxInfoHint 60 · PaxHudIconButton 55 · PaxHudPanel 52 ·
PaxHudRail 42 · PaxHudTextInput 39 · PaxHudTooltip 28. Plus `theme.ts` 87 · `themeState.svelte.ts` 40 ·
`index.ts` 4. **This is the intended shared vocabulary — the redesign's foundation layer.**

### E. CSS (live: 3,175; + dead/marketing below)

| File | LOC | Scope |
|---|---:|---|
| `src/lib/styles/hud.css` | 1,765 | in-game HUD monolith — the big one |
| `src/app.css` | 808 | global tokens + resets (173 `--pax-*` defs) |
| `src/lib/components/ui/settings/panel-shared.css` | 375 | settings section shared |
| `src/lib/design-system/pax-theme.css` | 227 | design-system tokens (163 `--pax-*` defs) |
| — `landing-site/site.css` | 301 | marketing (§J) |
| — `aurelia-hud/aurelia-hud-theme.css` | 233 | DEAD (§I) |

> **336 `--pax-*` tokens live across app.css (173) + pax-theme.css (163)** — two token roots. Reconcile.

### F. UI-facing stores — `src/lib/stores/` (~1,240 UI-relevant)

themeStore.svelte 312 · activeGameStore.svelte 609 (mixed engine/UI — the HUD's main read source) ·
territoryRenderStatusStore 70 · combatLogStore 70 · territoryTuningStatusStore 55 · animationStore.svelte 54 ·
mapTranspose.svelte 29 · gameHudStatsStore 27 · selectedStarStore.svelte 14. *(gameStore 2,168 &
multiplayerStore 897 are engine/netcode — UI reads them but they are not UI to redesign.)*

### G. Theme / config data (945)

`config/categoryThemes.ts` 763 (per-category theme presets — feeds CategoryThemeBar) · `config/themes.ts`
137 · `config/bgManifest.ts` 45. Plus the theme UIs in D/§C (HudThemePanel, ThemeLibraryPanel,
TypographyTokenPanel, menuTheme). **Theme logic is spread across ≥6 places — see §4.4.**

### H. Icons (218)

`icons/iconMap.ts` 185 · `icons/iconSetStore.svelte.ts` 33. Consumed via `HudIcon`.

---

## I. DEAD / EXPERIMENTAL — deletion candidates

**Grep-confirmed: zero production consumers.**

| Area | Files | LOC | Status |
|---|---:|---:|---|
| ~~`src/lib/aurelia-hud/` + `/dev/aurelia-hud` route + theme.css~~ | 26 | ~1,476 | **DELETED** (`984c22488`+) — user: "Remove the aurelia-hud demo" |
| ~~`src/lib/components/ui/_archived/`~~ | 5 | 2,044 | **DELETED** (`d594ae283`) — CombatLogPanel, MultiplayerLobby, GameHUD, TickOrb, TickMetronome |
| ~~`ui/hud-test/HudLayoutTestMockup.svelte`~~ | 1 | 427 | **DELETED** (`d594ae283`) — with its sole consumer route |
| ~~`routes/dev/ui-test/+page.svelte`~~ | 1 | 10 | **DELETED** (`d594ae283`) |
| ~~`ui/hud/TopBar.svelte`~~ + barrel line | 1 | 261 | **DELETED** (`d594ae283`+`3b1e57eda`) — legacy per GameContainer's own comment |
| ~~`panelSync.syncPanelFromConfig`~~ | — | 17 | **DELETED** (`3b1e57eda`) — found by a repo-wide orphan sweep beyond the original inventory; zero callers, superseded by `settingsState.syncPanelFromConfigPatch` |

> **ALL identified dead code is now removed (2026-07-17, user: "Clear all dead code possible").** ~4,235
> LOC across 12 files. A repo-wide orphan-file sweep (every `src/lib/**/*.ts`+`*.svelte` basename checked
> against the whole tree) found nothing further live-adjacent; two apparent orphans
> (`bench/browserBenchEntry.ts`, `bench/navigationStub.ts`) are real — wired via `vite.config.js`
> script-tag/alias, invisible to import-statement search. **The redesign starts from a clean tree.**

## J. Landing / marketing site — SEPARATE REDESIGN TRACK, but fully itemized here (user Q3)

The public website: its own visual identity and its own redesign effort (see [[marketing-site]]). NOT
part of the HUD/UI redesign, but inventoried in full here per the user's instruction. Total **3,905 LOC**.

**Components — `src/lib/components/landing-site/` (15 files, 2,202):**

| File | LOC | Role |
|---|---:|---|
| Hero.svelte | 269 | landing hero |
| SiteFooter.svelte | 245 | footer |
| SiteHeader.svelte | 230 | site nav header |
| HowItPlays.svelte | 221 | how-it-plays section |
| Pillars.svelte | 167 | feature pillars |
| StudioBand.svelte | 156 | studio band |
| Starfield.svelte | 148 | animated starfield bg |
| StarTypes.svelte | 146 | star-types showcase |
| DevlogTeaser.svelte | 133 | devlog teaser |
| Newsletter.svelte | 131 | signup |
| StoryBand.svelte | 95 | story band |
| FinalCta.svelte | 85 | final call-to-action |
| PageHero.svelte | 70 | inner-page hero |
| LandingPage.svelte | 55 | page composer / entry (root `/` renders this) |
| SiteMark.svelte | 51 | logo/wordmark |

**Marketing routes — `src/routes/(marketing)/` (1,352):** press/+page 410 · game/+page 311 · about/+page
265 · community/+page 218 · devlog/+page 125 · +layout 23. Plus root `src/routes/+page.svelte` (50) which
renders `LandingPage`.

**CSS:** `src/lib/components/landing-site/site.css` (301) — marketing-only tokens/styles, separate from
the HUD/app token roots.

## K. Map editor (OUT of scope) — `routes/map-editor` 1,363 + `components/map-editor/` 5,886 = 7,249. Separate tool.

---

## 4. Structural findings the redesign MUST address (why past efforts stalled)

1. **One composite HUD split across two component libraries by breakpoint** (`game-hud` desktop chrome
   + `ui/hud` mobile/overlay), so the codebase carries two vocabularies for the same roles. NOT two
   visible competing designs (corrected §1). The redesign should unify to ONE vocabulary and ONE
   responsive strategy. (The `aurelia-hud` alternative prototype was DELETED 2026-07-17 per §5 Q1;
   `_archived/GameHUD` remains as a dead older HUD.)
2. **A settings surface of ~16.5k LOC** (24 svelte + 10 ts) dominates the UI. Its DATA layer was just
   rebuilt (registry/store/search — phases 0-2,4); the **presentation** is the redesign target, and it is
   large enough to be its own sub-track. Don't re-touch the data layer.
3. **Three abandoned HUD rewrites in-tree (~4.2k LOC).** Delete before designing — they are noise and
   false precedent.
4. **Theme logic sprawled across ≥6 surfaces:** design-system `pax-theme.css` + `theme.ts`/`themeState`,
   `config/categoryThemes.ts` (763), `config/themes.ts`, main-menu `menuTheme.ts` (577), `themeStore`, and
   three theme UIs (HudThemePanel, ThemeLibraryPanel, TypographyTokenPanel). **Two token roots (app.css 173
   + pax-theme.css 163 = 336 `--pax-*`).** A redesign needs ONE theming model.
5. **CSS split across a 1,765-line `hud.css` monolith + 808 app.css + 375 panel-shared + 227 pax-theme.**
   Where a rule wins is non-obvious. (The settings panel itself is already tokenized and single-layer after
   the recent rewrite — use it as the pattern.)
6. **The shell mixes concerns:** `GameContainer` (2,173) holds orchestration + inline HUD layout + a big
   style block. A clean redesign wants a thin shell + composed panels.
7. **Design system exists but is under-adopted.** 18 `Pax*` primitives are the intended vocabulary; the two
   HUD families and menu bypass them in places. The redesign should route everything through the DS.

---

## 5. Decisions — numbered, with the user's answers (2026-07-17)

**Q1 — A/B toggle between HUD systems. RESOLVED (2026-07-17).** The framing correction WAS the
deliverable: there is only ONE live HUD (the responsive `game-hud`+`ui/hud` composite — §1); there was
no second *system* to toggle to, only a dead mock-data prototype. *User: "Your answer is all I needed.
Remove the aurelia-hud demo."* → **`aurelia-hud` DELETED** (dir + `/dev/aurelia-hud` route +
`aurelia-hud-theme.css` + the app.css `@source`/`@import` lines). No A/B toggle built. If an A/B is
wanted later it becomes current-vs-the-new-design, wired to live state from the start.

**Q2 — Is settings *presentation* in scope?** *User: "Yes presentation is in scope. ALL UI."*
**ANSWERED: YES — all UI, settings presentation included** (~16.5k LOC, §B). The settings DATA layer
(settingsStore / registry / search / persistence) was just rebuilt and is an INPUT, not a target.

**Q3 — Marketing/landing site in scope?** *User: "landing page is separate for redesign; but include it
fully in the audit."* **ANSWERED: SEPARATE redesign track; fully itemized in §J** (done).

**Q4 — Unify the theme model?** *User: "Yes unify, that was always my intent."* **ANSWERED: YES.**
Collapse the ≥6 theme surfaces (design-system `pax-theme.css`+`theme.ts`/`themeState`,
`config/categoryThemes.ts` 763, `config/themes.ts`, main-menu `menuTheme.ts` 577, `themeStore`, and the
three theme UIs) and the TWO token roots (app.css 173 + pax-theme.css 163 = 336 `--pax-*`) into one
theming model. The design agent specifies it.

**Standing inputs (not decisions):**
- **Deletion pre-clear: DONE.** All identified dead code removed 2026-07-17 (user: "Clear all dead code
  possible") — aurelia-hud, `_archived`, hud-test, `ui/hud/TopBar`, plus `panelSync.syncPanelFromConfig`
  found by a follow-up repo-wide orphan sweep. ~4,235 LOC / 12 files. The tree is clean; see §I.
- **Keep list (inputs, not targets):** design-system `Pax*` (foundation), the settings DATA layer,
  stores (§F), icons (§H).
- **Source of truth:** this file. Re-measure LOC before acting (code moves).

*All LOC `wc -l`; all live/dead status grep-verified 2026-07-17. GameCanvas (5,141) is the Pixi render
engine, not UI markup.*
