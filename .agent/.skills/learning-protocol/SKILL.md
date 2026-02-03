---
name: learning-protocol
description: |
  Reflective self-improvement system with post-mortem templates. Use when code fails
  after declaring it complete, when backtracking on an approach, when user corrects
  an assumption, or when discovering a better pattern. Creates structured learning artifacts.
metadata:
  author: metabrain
  version: "1.0"
---

# Agent Learning Protocol

**Purpose:** Learn from failures to compound knowledge and prevent recurrence.

---

## Mandatory Post-Mortem Triggers

You **MUST** create a post-mortem entry when:

1. **Code fails after you declared it complete**
   - "This should work" → It didn't → Why?

2. **You backtrack on an approach**
   - Started one way, had to change → What signal did you miss?

3. **User corrects your assumption**
   - You said X, reality was Y → Where did the false belief come from?

4. **You discover a significantly better pattern**
   - Found optimal solution → Extract the principle

---

## Post-Mortem Template

```markdown
## Post-Mortem: [Title] (YYYY-MM-DD)

### What Happened
- **Expected:** [What I thought would happen]
- **Actual:** [What actually happened]
- **Discovery:** [How the error was identified]

### Root Cause
- [ ] Outdated information (training data)
- [ ] Skipped verification step
- [ ] Misread documentation
- [ ] Incorrect mental model
- [ ] Other: ___

### What I Should Have Known Beforehand
[The key knowledge that would have prevented this]

### Prevention Checklist
- [ ] Specific check 1
- [ ] Specific check 2
- [ ] Verification step 3

### Heuristic
> "One-sentence rule that encodes the lesson"
```

---

## Example Heuristics

From actual failures:

- "IndexedDB + Svelte 5 = Always clone. Reactive wrappers can't cross serialization boundary."
- "Before claiming a framework is alpha/beta, web_search to verify."
- "Framework versions expire fast—always verify if claim is >1 month old."
- "The 30-Second Rule: If verification takes <30s, DO IT."

---

## Knowledge Artifacts

Maintain these living documents:

| File | Purpose |
|------|---------|
| `LESSONS_LEARNED.md` | Post-mortems of every significant failure |
| `USER_PATTERNS.md` | Communication style, tool preferences, corrections |
| `ENCYCLOPEDIA.md` | Master taxonomy of project concepts |

---

## Positive Reinforcement

Also capture what works:

- **User says "Good" / "Excellent"** → Current approach working
- **"Your thought process is very good"** → Methodology is sound
- **User proceeds without correction** → Assumptions aligned

---

## The Learning Loop

```
Error/Failure
    ↓
Post-Mortem Analysis
    ↓
Heuristic Extraction
    ↓
Knowledge Artifact Updated
    ↓
Future Agent Retrieves Context
    ↓
Error Prevented
```
