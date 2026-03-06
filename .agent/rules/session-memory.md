

# Session Memory Rules

## 1. Daily Session Notes
**File:** `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md`
- Create at session start. After each commit/fix/feature, append: hash, one-line summary, root cause or rationale, key files, deferred work.
- End of session: verify all commits from `git log --oneline --after/before` are captured.

## 2. Daily Chat Log
**File:** `.agent/WIP Work-In-Progress/CHAT_YYYY-MM-DD.md`
- Create at session start. Capture every user prompt verbatim (no paraphrasing). Truncate pasted logs to essentials. Tag ideas with `#idea`. Prefix with `## HH:MM`. Agent responses are NOT logged.

## 3. Save User-Shared Images
**Directory:** `.agent/WIP Work-In-Progress/screenshots/`
- Save every image the user shares in chat to this directory immediately.
- Filename format: `YYYY-MM-DD_HH-MM_<brief-description>_<latest-commit-hash>.png`
- Example: `2026-03-06_13-46_territory-alignment-fail_fc68a84.png`
- These images are critical evidence for debugging visual issues across sessions.
