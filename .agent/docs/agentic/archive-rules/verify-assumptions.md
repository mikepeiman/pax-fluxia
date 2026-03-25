---
description: Enforce Assumption Validation (Verify before asserting)
globs: "**/*.md"
---

# Rule: Verify Assumptions (D.A.R.T.)

**Core Principle:** "30 seconds of search prevents 30 minutes of rework."

## Mandate
Before creating any implementation plan or asserting any fact about external libraries/APIs, you must **VERIFY**.

## The Check
If you find yourself writing:
- "I assume..."
- "Using the standard..."
- "For version X..."

**STOP.**

## Triggers requiring verification:
1.  **Version Claims**: "React 19", "Tailwind v4", "Svelte 5".
2.  **API Support**: "Browser supports WebGPU".
3.  **Deprecations**: "X is no longer supported".

## Action
Use `search_web` or `browser_subagent` to confirm current status if >1 month old in your knowledge base.
