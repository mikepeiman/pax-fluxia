

# Visual Bug Report Protocol

## The Error Mode This Prevents

When a user reports a VISUAL bug, the agent's default mode is:
1. Form an interpretation of what the user means
2. Act on that interpretation
3. When told "still broken," double down on the same interpretation

This fails because **the agent substitutes its interpretation for the user's actual observation**. The user has direct visual access. The agent does not.

## Mandatory Steps When User Reports a Visual Bug

### Step 1: PARROT — Restate the user's EXACT words
Before ANY debugging, restate what the user said verbatim. Do NOT rephrase, generalize, or interpret.

**BAD**: "The borders aren't rendering"
**GOOD**: "You said the LOCATIONS of the borders are wrong"

### Step 2: OBSERVE — Use the browser tool to see it yourself
Check it yourself. If you cannot, ask the user for:
- Screenshot annotated with "this is wrong" and "this is what I expect"
- Specific console log output you need (name the exact log prefix/filter)

### Step 3: HYPOTHESIZE — Generate MULTIPLE hypotheses (minimum 3)
List at least 3 different possible causes. Present them to the user and ask which matches closest before coding.

### Step 4: VERIFY — Before each code change, state what you expect to change visually
"If my hypothesis is correct, this change will make [specific visual prediction]."
If the prediction doesn't match the result, the hypothesis is wrong. Stop. Go to Step 3.

### Step 5: ONE CHANGE — One change per iteration, verify before next
Never combine multiple changes. If you can't verify, you can't debug.

## The Lethal Pattern to Watch For

When the user says "still broken" or "same as before" after your fix:
1. **DO NOT** make another code change
2. **DO** ask: "What specifically do you still see? Is it the same symptom or a new one?"
3. **DO** re-examine whether your hypothesis matches their observation

## Key Insight

**The user's observation is more reliable than your speculation.** Natural language precision matters:
- "Wrong location" ≠ "not rendering"
- "Broken" ≠ "invisible"
- "Same as before" ≠ "my fix didn't apply"

Read the user's EXACT WORDS. Act on THOSE, not your interpretation.

</MEMORY>
