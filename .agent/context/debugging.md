# Debugging — Deep Dive

## Core Principle: Trust the User

The user has direct visual access to the running application. You do not.

- Accept user observations as ground truth: "It looks wrong" → investigate
- Never reframe "X is happening" as "it may FEEL like X is happening"
- Ask about visual behavior — don't guess from code
- When working on visuals/animations: ask the user what they see, what they want, THEN read code

### User Words Are Specifications
- "X should work like Y" → treat Y as a design spec to implement, not a hypothesis to evaluate
- "Attrition is too high" → accept as ground truth, investigate
- "Should be proportional to active ships" → that IS the requirement
- Never evaluate whether the user is "correct" to want something

---

## Investigation Method (Deep Thinking Protocol)

Trigger: bugs, ambiguous mechanics, visual behavior questions.

### Step 1: STATE — What is happening now?
- What the CODE does (trace execution path)
- What the USER sees (visual/behavioral result)
- What the USER expects (from their words)

### Step 2: CHALLENGE — What am I assuming?
- **Zeroth Principle**: Am I solving the right problem?
- **Counterfactual**: If I removed X, would the issue change?
- **Falsification**: What evidence would prove me wrong?

### Step 3: ASK — What do I need to validate?
- Questions that distinguish competing hypotheses
- Reference observable behavior ("When you click Z, do you see A or B?")
- Never assume user intent — ask

### Step 4: TRACE — Follow the data, not the names
1. Find the exact line producing the observed visual
2. Follow data flow backward to the config/store
3. Identify every place that value is read or written

---

## Multiple Hypotheses Rule

1. List ≥3 possible causes before picking one
2. Rank by evidence, not assumption
3. Verify most likely first
4. Never say "this means X" — say "this could be X, but also Y or Z"

---

## Forensic Investigation

- **Never assume** bugs are from the most recent commit
- The user does NOT exhaustively test after every change — bugs may be old
- Use `git log --oneline -20` for recent history
- Use `git log -p --follow -- <file>` to trace file changes
- If user says "this used to work" → `git log` + `git diff` FIRST, not reimplementation

---

## Git Archaeology Triggers

If the user says ANY of these, stop and do git history FIRST:
- "It used to work"
- "This worked before"
- "We already did/built/fixed this"
- "There was a thing called [X]"

---

## Verification Standards

- **Verify assumptions** with `search_web` if knowledge >1 month old
- **Read official docs** before implementing library integrations
- **After fixes**: re-verify no stale references remain
- **Confidence tracking**: reading code = medium, seeing it work = high, speculation = low

---

## Language Rules

### Until Verified
- ✅ "The most likely cause appears to be…"
- ✅ "This strongly suggests…"
- ✅ "My working hypothesis is…"
- ❌ "Found the root cause" / "This IS the issue"

### After a Failed Fix
- ✅ "My previous hypothesis was wrong. Let me re-examine…"
- ✅ "I don't yet understand why this fails. I need more data."
- Repeated failures demand a **different approach**, not minor variations

---

## Fresh Start Bias

- No attachment to existing code — prefer rewriting over patching when:
  - A fix requires understanding 3+ interacting systems → redesign
  - AI-generated code has accumulated 2+ patches → start fresh
  - Code has artificial phases creating boundary disjoints → collapse
- Follow official docs exactly — don't invent custom patterns
- Architecture > implementation — get the shape right first
