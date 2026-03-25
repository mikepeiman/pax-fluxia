# Deep Thinking Protocol

## TRIGGER: User tags this rule, or task involves ambiguous game mechanics / visual behavior

When activated, execute this **before writing any code**:

### Step 1: STATE (What is happening now?)
Describe the **observed behavior** precisely. Distinguish:
- What the CODE does (trace the actual execution path)
- What the USER sees (the visual/behavioral result)
- What the USER expects (from their words, not your assumptions)

### Step 2: CHALLENGE (What am I assuming?)
For each assumption, ask:
- **Zeroth Principle**: Am I even solving the right problem? What am I assuming the problem IS?
- **Counterfactual**: If I removed X, would the issue actually change?
- **Falsification**: What evidence would prove my understanding wrong? Does that evidence exist in the code?

### Step 3: ASK (What do I need to validate?)
List specific questions for the user. Questions must:
- Distinguish between competing hypotheses ("Does X happen or Y happen?")
- Reference observable behavior ("When you click Z, do you see A or B?")
- Never assume the user's intent — ask about it

### Step 4: TRACE (Follow the data, not the names)
Before building anything:
1. Find the exact line that produces the visual the user sees
2. Follow the data flow backward to the config/store that drives it
3. Identify every place that value is read or written

### Anti-Patterns This Prevents
- ❌ Building architecture before diagnosing (Failure 2 from animation speed postmortem)
- ❌ Confusing concepts by name similarity (attack ≠ transfer)
- ❌ "It used to work" → reimplementation instead of git archaeology
- ❌ Reasoning about code instead of tracing code
- ❌ Declaring "fixed" from mental model, not from evidence

### When to Use Git Archaeology Instead
If the user says ANY of these, stop and do `git log` + `git diff` FIRST:
- "It used to work"
- "This worked before"
- "We already did/built/fixed this"
- "There was a thing called [X]"
