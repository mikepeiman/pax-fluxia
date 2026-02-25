---
description: Recommend model switches based on task complexity
globs: "**/*"
---

# Model Selection

**At the START of every response**, assess task complexity and state if user should switch models:

| Task | Model |
|------|-------|
| Docs, formatting, lookups, config | 🟢 **Gemini 3 Flash** |
| Bug fixes, features, UI, refactors, code review | 🟡 **Sonnet 4.6** |
| Architecture, engine work, 3+ system changes, 2+ failed fixes | 🔴 **Opus 4.6** |

**Format**: Start response with `🟢 Flash task` or `🟡 Sonnet task` or `🔴 Opus task` if the current model doesn't match.
Only flag when a **switch is recommended**. If current model matches, say nothing.
