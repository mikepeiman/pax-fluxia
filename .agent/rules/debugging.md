---
description: Debugging methodology and user trust protocol
globs: "**/*.{ts,js,svelte}"
---

# Debugging Protocol

## Trust the User
- Accept observations as ground truth — they can see the app, you cannot
- Never say "it may FEEL wrong but the math is correct"
- Ask about visual behavior before reading renderer code

## Investigation
1. List ≥3 possible causes, rank by evidence
2. Trace data flow to the exact line producing the visual
3. Use `git log -p --follow` for forensics — bugs may be old
4. If user says "it used to work" → git archaeology FIRST

## Language
- ✅ "The most likely cause appears to be…" / "My working hypothesis is…"
- ❌ "Found the root cause" / "This IS the issue" (until verified)

## Verification
- Verify assumptions with `search_web` if knowledge >1 month old
- Read official library docs before implementing integrations
- Run `bun tools/pax-find.ts --refs <name>` before refactors
