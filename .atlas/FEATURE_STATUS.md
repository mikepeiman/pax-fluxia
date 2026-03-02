# Pax Fluxia — Feature Status & Bug Tracker

## Known Bugs

| ID | Description | Status | Date |
|----|-------------|--------|------|
| B-22 | Touch targets not located correctly on mobile after transpose — input hit testing uses non-transposed star coordinates while rendering uses transposed. Impossible to play. | ✅ Fixed | 2026-03-01 |
| B-23 | Full-map view (recenter button) doesn't account for bottom UI — map is obscured by speed controls | ✅ Fixed | 2026-03-01 |
| B-24 | Territory lag on mobile — conquering stars takes 1-4 ticks before territory visually updates | 🔴 Open | 2026-03-01 |
| B-25 | Damaged ship orbit rings still lerp/ease on orientation shift — fxOrchestrator.reset() not clearing positions | 🔴 Open | 2026-03-01 |
| B-26 | Map centering used 0-origin world bounds creating asymmetric dead space; not centered on content | ✅ Fixed | 2026-03-02 |
| B-27 | Pixel territory renderer shows nothing on mobile | 🔴 Open | 2026-03-02 |
| B-28 | Lane territory renderer broken — territories oversized, don't accurately capture star boundaries | 🔴 Open | 2026-03-02 |
| B-29 | Portrait mode wastes vertical/horizontal space — map generation doesn't maximize viewport | 🔴 Open | 2026-03-02 |

## Planned Features

| ID | Feature | Status | Priority | Date |
|----|---------|--------|----------|------|
| F-120 | Mobile layout refactor to CSS Grid (portrait: 3-row, landscape: statusbar left column) | ✅ Done | High | 2026-03-01 |
| F-121 | Gear+hamburger consolidated into SpeedControls bar ☰ button | ✅ Done | Medium | 2026-03-01 |
| F-122 | StatusBar.svelte replaces TopBar for in-game view | ✅ Done | Medium | 2026-03-01 |
| F-123 | StatusBar: minified leaderboard + game stats (ships/tick) | ✅ Done | Medium | 2026-03-01 |
| F-124 | Star cycling navigation: `◂ ⌖ ▸` widget with StarNav.svelte | ✅ Done | Medium | 2026-03-01 |
| F-125 | Player-color swatch in StatusBar | ✅ Done | Medium | 2026-03-01 |
| F-126 | Smooth camera transitions for star-cycle and center-fit (lerp/ease animation) | 🟡 Planned | High | 2026-03-02 |
| F-127 | "Stretch Map To Fit" toggle — rerender map to maximize viewport usage | 🟡 Planned | High | 2026-03-02 |
| F-128 | Main Menu full redesign — current menu wastes space on desktop and mobile | 🟡 Planned | Medium | 2026-03-02 |
| F-129 | Canvas debug infrastructure (debug borders, world bounds rect, log.canvas category) | ✅ Done | Low | 2026-03-02 |
| F-130 | Audio volume persistence — remember per-sound volume adjustments in localStorage | 🟡 Planned | Critical | 2026-03-02 |
| F-131 | Per-sound file selector — dropdown to pick which audio file for each sound event | 🟡 Planned | Critical | 2026-03-02 |
| F-132 | Audio theming — save/load audio presets, designate default themes | 🟡 Planned | Critical | 2026-03-02 |

## Known Regressions

| ID | Description | Status | Date |
|----|-------------|--------|------|
| R-1 | Territory rendering (all modes) regressed during mobile layout work | 🔴 Active | 2026-03-02 |

