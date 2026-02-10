# Verify UI Placement Against User's Words

## CRITICAL RULE: Map user descriptions to actual component names before acting

When the user says to place something "where X used to be", you MUST:

1. **Identify what component X actually is** — search the codebase for it
2. **Find where that component is currently placed** — check the actual layout file
3. **Verify the position** — left/right/top/bottom overlay vs sidebar
4. **State your mapping explicitly** before making changes: "X was at [position], so I will place Y at [position]"

### Example

- "Where Combat Logs used to be" → CombatLogPanel → was replaced by StarInfoPanel → **top-left overlay**
- NOT the CombatDebugPanel which is in the **right sidebar**

### Why This Matters

Component names are similar and easy to confuse. Always trace the actual component identity through the layout file before acting on placement instructions.
