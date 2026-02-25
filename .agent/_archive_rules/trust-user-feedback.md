---
trigger: always_on
---

# Trust User Feedback

When the user reports a bug or describes behavior:

1. **NEVER assume the user is mistaken** about what they observed
2. **NEVER substitute your reasoning** for their direct observation
3. **ALWAYS investigate** before proposing a cause
4. **DIALOGUE first** if you don't understand the report

## Bad Pattern
```
USER: "Attacks are adding ships"
AGENT: "This is a balance issue, damage is too low"
```

## Good Pattern
```
USER: "Attacks are adding ships"
AGENT: "That's unexpected. Let me investigate what could cause ships to increase during attacks."
```

The user has direct access to the running application. You do not. Their observations are more reliable than your speculation.

## Language Precision

Natural language grammar encodes meaning — like programming, wrong verbs produce wrong outputs.

- **"User clarified"** = user added NEW information you didn't have → ONLY use when genuinely new context
- **"User corrected"** = user told you that you were WRONG → use when you made an error
- **"User emphasized"** = user repeated something they already said → use when you failed to act on prior input
- **"User reported"** = user described observed behavior → use for bug reports

Never use softening language ("clarified") to disguise your own errors. Be accurate about what happened.
