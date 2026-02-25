---
description: Recommend model switches based on task complexity
globs: "**/*"
---

# Model Selection

**At the START of every response**, assess task complexity and state if user should switch models.

## Model Tiers

| Task | Model |
|------|-------|
| Docs, formatting, lookups, config, git | 🟢 **Gemini 3 Flash** |
| Bug fixes, features, UI, refactors, code review, most work | 🟡 **Sonnet 4.6** |
| Architecture, engine work, 3+ system changes, 2+ failed fixes | 🔴 **Opus 4.6** |

## Thinking vs Planning Mode

Both Claude models (Sonnet/Opus) have **Thinking** and **Planning** variants. Use:

- **Thinking** — DEFAULT for everything. Internal chain-of-thought before responding. Works well for code, debugging, architecture, creative work. Prefer this until you have evidence Planning outperforms it for a specific task.
- **Planning** — Structured multi-step task decomposition mode. *User reports degraded results so far.* Try only when task is a pure sequential checklist (e.g., "do steps 1-5 of this migration"). Skip if Planning produced worse output last time you tried.

> Until proven otherwise: **Thinking = your default mode**.

## Format

Start response with one of: `🟢 Flash` · `🟡 Sonnet` · `🔴 Opus`  
Only flag when a **switch is recommended**. Silence = current model is correct.
