---
description: Core behavioral constraints for AI agents working on this project
globs: "**/*.{ts,js,svelte,md}"
---

# Hard Rules

## Behavioral
- **User words are specifications** — parse as requirements, not symptoms
- **Never move the goalposts** — fix the problem as stated, don't redefine it
- **Epistemic honesty** — use conditional language until verified
- **Ask about visuals** — don't guess what animations look like from code
- **Task queue discipline** — finish current task before new items

## Code
- **No raw `console.log`** — use `log.sys()`, `log.state()`, `log.combat()`, etc.
- **Bun only** — `bun install`, `bun run dev`, `bunx` (never npm/npx/yarn)
- **Game time only** — `gameNowMs` (FXClock) for all animation/VFX, never `performance.now()` in game code
- **Exhaustive cleanup** — when renaming, grep ALL references, fix in one pass
- **File size limits** — 300 line ideal, 500 hard max. Over 500 = must refactor first.

## Documentation
- **Session docs** every session: `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md`
- **Clickable code refs** in every completion report
- **Semantic naming** — game domain terms (order, transfer, battle, conquest), not CS jargon
