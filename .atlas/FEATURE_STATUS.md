# Pax Fluxia — Feature Status & Bug Tracker

## Known Bugs

| ID | Description | Status | Date |
|----|-------------|--------|------|
| B-22 | Touch targets not located correctly on mobile after transpose — input hit testing uses non-transposed star coordinates while rendering uses transposed. Impossible to play. | ✅ Fixed | 2026-03-01 |
| B-23 | Full-map view (recenter button) doesn't account for bottom UI — map is obscured by speed controls | ✅ Fixed | 2026-03-01 |
| B-24 | Territory lag on mobile — conquering stars takes 1-4 ticks before territory visually updates | 🔴 Open | 2026-03-01 |
| B-25 | Damaged ship orbit rings still lerp/ease on orientation shift — fxOrchestrator.reset() not clearing positions | 🔴 Open | 2026-03-01 |

## Planned Features

| ID | Feature | Status | Priority | Date |
|----|---------|--------|----------|------|
| F-120 | Mobile layout refactor to CSS Grid | 📋 Planned | High | 2026-03-01 |
| F-121 | Combine gear (settings) + hamburger icon into speed widget; remove from topbar | 📋 Planned | Medium | 2026-03-01 |
| F-122 | Rename topbar to "Status Bar" / "Statusbar" | 📋 Planned | Medium | 2026-03-01 |
| F-123 | Statusbar: minified leaderboard display (CSS Grid + flex layout) | 📋 Planned | Medium | 2026-03-01 |
| F-124 | Star cycling navigation: `< [center] >` controls as a UI widget. Brackets cycle through player's stars with configurable zoom (slider). Center resets to full-map view. | 📋 Planned | Medium | 2026-03-01 |
| F-125 | Player-color swatch in statusbar: two-part swatch with territory color+pattern as full shape, player primary-color inset shape filled | 📋 Planned | Medium | 2026-03-01 |
