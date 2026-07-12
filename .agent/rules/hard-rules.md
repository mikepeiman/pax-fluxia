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
- **NEVER assert a UI target exists / is reachable unless VERIFIED — no UI hallucination** — writing
  code that adds a control does NOT mean it is reachable in the running app (conditional `{#if}` gates,
  an unmounted component, a wrong panel name). NEVER tell the user "in the X panel", "toggle Y", "set Z"
  unless you have verified the element exists AND its render path actually mounts in the current UI.
  Previews are banned here, so you usually CANNOT verify in-app — therefore do NOT state in-app
  locations as fact. Instead: trace the full render/mount path in CODE (component → where it's imported/
  mounted → the exact `{#if}` conditions that gate it) and either (a) state it as a code path explicitly
  flagged "unverified in the running app — confirm on screen", or (b) don't claim a location at all.
  (Recorded 2026-07-04: claimed a "Conquest Transition panel" + Radial control the user could not find —
  the control's mount path was never traced. This wasted the user's time hunting a phantom.)
- **Epistemic honesty** — use conditional language until verified
- **Ask about visuals** — don't guess what animations look like from code
- **Task queue discipline** — finish current task before new items
- **MAXIMALISM over minimalism** (user-stated 2026-07-12, learned through hard experience): the
  smallest add-on / least-disruptive patch is the AGENTIC FAILURE BIAS, not a virtue. There are NO
  standing rules named "one change at a time", "bias to less code", or "don't disturb the working
  state" — citing those as constraints is a violation. When a defect's root cause implies a
  structural change, propose and build the structural change.
- **PRE-FIX CHECKPOINT** (user-mandated 2026-07-12): before implementing ANY fix, state visibly:
  (a) the root cause, (b) what the BEST solution would be if designing this today, (c) whether the
  chosen fix IS (b) — and if not, surface the gap to the user instead of silently choosing less.
- **Hedged language is not a command** — "X is likely indicated" is a hypothesis to test, not an
  order to execute. Destructive actions (reverts, deletions) require an explicit imperative or an
  explicit ask-first. (Recorded 2026-07-12 after an uncommanded panic-revert destroyed measured WIP.)
- **≤10 targeted tests per run** — run the test(s) that answer the current question, never the
  whole suite as ritual. Repeated all-green full-suite runs have solved nothing, ever.

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
