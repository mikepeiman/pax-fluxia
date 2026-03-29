# Workflow — Deep Dive

## Git

### Commit Protocol
- Commit after every code/doc change
- Alias: `git ac "message"` (combines `git add .` + `git commit -m`)
- Push after every commit: `git push origin master`
- Remote: `https://github.com/mikepeiman/pax-fluxia.git`

### Branches
- `master` — development
- `live` — production (merge master → live for releases)
- Branch only for risky experiments: `feat/`, `fix/`, `refactor/`
- Merge & delete promptly. No long-lived dev branches.

---

## Task Queue Discipline

### During Work
When user reports new items mid-task:
1. Document in session notes under "Queued"
2. Acknowledge briefly ("Noted, queued after current task")
3. Continue current task
4. Do NOT stop to investigate the new item

### After Completing a Task
1. Check session notes → queued items
2. Check `FEATURE_STATUS.md` → open bugs and planned features
3. **Suggest** the next item from the queue with context
4. Let the user confirm or redirect

```
// GOOD:
"Task complete. From the queue:
- Next: Panel dedup (Conquest Speed in multiple tabs)
- Then: UI layout improvements (F-59)
- Open bugs: B-89 (surge hiccup)
Proceeding with panel dedup unless you'd prefer something else."

// BAD:
"Task complete! What would you like me to work on next?"
```

---

## Session Documents

Save to `.agent/WIP Work-In-Progress/SESSION_YYYY-MM-DD.md` every session.

### Document Should Include
- Session focus/title
- Bug fixes completed (with IDs, root cause, fix)
- Features implemented
- Documentation changes
- Roadmap items documented
- Open items deferred
- Key files modified
- Lessons learned (if any)

---

## Completion Reports

Every completion message MUST include clickable references to all modified code:

```markdown
### Modified Code
- [functionName](file:///absolute/path/to/file.ts#L123-L145) — description
- [ClassName.method](file:///absolute/path/to/file.ts#L200-L230) — what changed
- [CONSTANT_NAME](file:///absolute/path/to/config.ts#L15) — new value
```

Rules:
- Every function modified/created gets a clickable link
- Links MUST include line ranges (`#L123-L145`)
- Group by file, ordered by importance

---

## Settings Reference

### Canonical Locations
| What | Where |
|------|-------|
| Code defaults | `pax-fluxia/src/lib/config/game.config.ts` |
| Saved themes | `common/resources/settings-themes/*.json` |
| Runtime values | `localStorage` (browser) |

### When to Check
- Before changing any default value
- When debugging animation/timing issues
- When user reports unexpected behavior
- Check saved themes first — code defaults ≠ user's actual values

---

## Documentation Policy

### Docs-First for Libraries
When working with external libraries (Colyseus, PixiJS, Svelte):
1. Read official docs FIRST before writing integration code
2. If API errors: read docs before trying alternatives
3. Never guess at APIs — use `read_url_content` on official docs

### Key Documentation URLs
- Colyseus: https://docs.colyseus.io/
- PixiJS: https://pixijs.download/release/docs/
- Svelte 5: https://svelte.dev/docs

---

## Atlas Self-Enforcement

### Pre-Flight Check (Simplified Trigger Matrix)
Before writing code, check:
1. **Filesystem ops?** (Create/Move/Delete) → Update physical map section
2. **New exports/types?** → Update asset inventory section
3. **Data flow changes?** → Update I/O section
4. **New events/reactivity?** → Update event section

### Entropy Defense
- At commit time: "Did I update the docs that changed?"
- If not: update before pushing
- Living architecture doc (`/.atlas/`) updated incrementally, not ceremonially
