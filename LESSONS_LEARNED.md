# Agent Lessons Learned

This document captures post-mortems from significant failures and corrections. Future sessions should review this to prevent recurrence.

---

## Post-Mortem: Accidental Deletion of Critical Logic (2026-01-30)

### What Happened
- **Expected:** Connections would render as 5px white lines.
- **Actual:** Connections disappeared entirely.
- **Discovery:** User reported "NO VISIBLE CONNECTIONS".
- **Root Cause:** In a cleanup step, I intended to remove stray lines but accidentally deleted the `generateStarConnections` call because I didn't verify the full context of the diff block.

### Root Cause
- [ ] Outdated information
- [x] Skipped verification
- [ ] Incorrect mental model

### What I Should Have Known Beforehand
- "Cleanup" operations are high-risk. Deleting "stray lines" requires verifying that they are indeed stray and not functional code context.

### Prevention Checklist
- [x] Verify context of deleted lines in `replace_file_content`.
- [x] Check if functionality (e.g., `this.connections`) is still populated after edits.

### Heuristic
> "When cleaning up code, verify the *entire* block being removed, not just the target lines. Verify functional outputs after every edit."

---

## Post-Mortem: PowerShell `&&` Command Separator (2026-01-30)

### What Happened
- **Expected:** `git add -A && git commit -m "message"` would run two commands sequentially
- **Actual:** PowerShell error: `The token '&&' is not a valid statement separator in this version`
- **Discovery:** User correction after repeated occurrences (minimum 3+ times in this session)

### Root Cause
- [x] Incorrect mental model
- [ ] Outdated information
- [ ] Skipped verification

### Explanation
I defaulted to bash/Unix shell syntax (`&&`) which works in cmd.exe and bash but NOT in PowerShell. PowerShell requires `;` for statement separation or separate commands.

### What I Should Have Known Beforehand
PowerShell's statement separator is **NOT** `&&`. In PowerShell:
- Use `;` to chain commands: `git add -A; git commit -m "message"`
- OR run as separate sequential commands (safer/clearer)
- The `&&` operator was only added in PowerShell 7.x and may not be available

### Prevention Checklist
- [x] Check user's shell (PowerShell on Windows)
- [x] Never use `&&` for PowerShell commands
- [x] Prefer separate `run_command` calls for sequential operations

### Heuristic
> "Windows PowerShell ≠ bash. Use separate commands or `;` separator, never `&&`."

---

## Post-Mortem: Unauthorized Creative Extensions & Naming Violation (2026-01-31)

### What Happened
- **Expected:** Implement 6 star types using specific colors defined by user (Yellow=Prod, Green=Atk, etc.).
- **Actual:** I created "Fantasy Names" (Forge, Fortress, Agro) and assigned fixed Emoji icons (🛡️, ⚔️) without request.
- **Result:** User reprimanded for "making things up" and failing to follow strict color-based instructions.

### Root Cause
- [x] Incorrect mental model (Assumed "Types" needed "Flavor Names")
- [ ] Outdated information
- [x] Skipped verification (Did not ask if "names" were desired)

### What I Should Have Known Beforehand
- **DART Principle:** Do not add features/flavor not requested.
- **Specific Instruction:** User said "Stars: yellow (production) green (att)...". This was a strict mapping. I improperly expanded it into "Classes".

### Prevention Checklist
- [x] If user gives a list (Color -> Stat), implement EXACTLY that list.
- [x] Do not add "Flavor Text", "Lore", or "Icons" unless explicitly requested.

### Heuristic
> "Creative embellishment is a failure mode. If the user says 'Red Star', do not build a 'Fortress Class Star'. Build a Red Star."

---

## Heuristics Index

Quick-reference one-liners:

1. **PowerShell Separator:** "Windows PowerShell ≠ bash. Use separate commands or `;` separator, never `&&`."
2. **Code Cleanup:** "When cleaning up code, verify the *entire* block being removed, not just the target lines."

---

## Positive Patterns

Approaches that worked well:

- User approved implementation plan with "LGTM" after detailed PRD
- Atomic git commits per feature (one concern per commit)
- Using `bun run build` to verify before committing
