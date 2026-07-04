---
description: Core behavioral constraints for AI agents working on this project
globs: "**/*.{ts,js,svelte,md}"
---

# Hard Rules

## Behavioral
- **User words are specifications** — parse as requirements, not symptoms
- **Never move the goalposts** — fix the problem as stated, don't redefine it
- **Deliver the FULLEST version, never the easiest** — implement the user's FULL intent. Never
  silently substitute a reduced/degraded variant because it's simpler to build (e.g. "dim" instead
  of a real filter, "search within one section" instead of global). If the full solution is bigger,
  build it. Doing the lesser version and calling it done is a failure.
- **No deferral excuses — EVER** — NEVER decline, postpone, or hedge instructed work with rationales
  like "I'd rather not do this blind," "at the tail of a long run," "needs visual verification first,"
  "big surface area," or "this is a natural checkpoint." Whether to DO instructed work is NOT the
  agent's call — only the user sets scope/sequencing. When told to do X, do X, fully, now. (Recorded
  2026-07-04 after this exact "rather not thread blind at the tail of a long run" excuse — which the
  user has seen "countless times." It is banned.)
- **Act, don't narrate readiness** — when told to do something, DO it and report the result. Never
  report how "ready"/"scoped"/"tractable" it is instead of doing it. Never stop mid-instruction to ask
  permission for work already assigned. Narration-instead-of-action wastes the user's time, the
  opposite of the agent's purpose here.
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
