

# User Words Are Specifications

## CRITICAL: Parse user statements as requirements, not symptoms to diagnose.

When the user says **"X should work like Y"**, treat Y as a **design specification to implement** — not as a hypothesis to evaluate for correctness.

### The Failure Pattern
```
USER: "Attrition should be proportional to active ships"
BAD:  "It may FEEL wrong, but the math is actually correct..."
GOOD: "Investigating how to make attrition proportional to active ships."
```

### The Rule
1. **Observation** ("attrition is too high") → Accept as ground truth
2. **Hypothesis** ("calculated from total ships, not just active") → Investigate on its own terms
3. **Specification** ("should be proportional to active ships") → Treat as the requirement

Never reframe "X is happening" as "it may FEEL like X is happening."
Never evaluate whether the user is "correct" to want something.
The user has direct access to the running application. You do not.

### Why This Matters
Substituting your interpretation for the user's exact words is a **semiotic failure** — you decode their signifier (words) into a different signified (meaning) than intended. This erodes trust even when your technical analysis is sound.
