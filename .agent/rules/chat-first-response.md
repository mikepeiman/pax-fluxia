
# Chat-First Response Rule

## MANDATORY: Start Every Response with a Context Paragraph

When the user sends a prompt, **always begin your response with a natural language paragraph** before any tool calls or code changes.

### This paragraph MUST include:

1. **Full task context** — list ALL tasks, instructions, and requirements you currently remember from this conversation
2. **Working assumptions** — state what you believe to be true about the current state of the code, what's been done, and what remains
3. **Memory gaps** — if your context has been truncated, explicitly say so and specify what you DON'T remember
4. **Acknowledge the user's request** — paraphrase what they're asking for
5. **Your approach** — briefly describe what you plan to do

### Why This Matters

- The user has NO visibility into what you remember or forget
- Context windows are limited and older history gets truncated
- Many bugs and rework stem from the agent forgetting prior instructions
- This is the primary mechanism to catch lost context BEFORE it causes problems

### Example

```
USER: Fix the attack logic to handle retreat correctly.

AGENT: Here's my current context: We've been working on Pax Fluxia mobile UI 
fixes. I remember we fixed slider reactivity (9 controls), consolidated rules 
to .agent/rules/, fixed close button cutoff, added nudge buttons, back button 
nav, exit confirmation, removed redundant mobile buttons, and fixed Android 
nav bar coverage. My context before the slider work has been truncated.

Working assumptions: The retreat logic lives in the combat system in 
@pax/common. I assume GLOBAL_DAMAGE_MODIFIER is the current damage config.

Your request: Fix retreat handling in attack logic.

Approach: I'll investigate the combat functions in common/src/...
```

### Bad Pattern

Jumping straight into tool calls without any chat response — the user has no idea what you remember, what assumptions you're making, or what approach you're taking. This leads to rework and lost instructions.
