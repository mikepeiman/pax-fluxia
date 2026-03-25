# Ask the User About Visual Behavior

## RULE: Do NOT try to understand visual/animation behavior purely from code.

When working on visual features, animations, or UI polish:

1. **ASK the user** what they currently see on screen
2. **ASK the user** to describe the desired visual outcome in their own words
3. **THEN** look at code to understand how to implement it

The user has direct visual access to the running application. Code reading is a poor substitute for human visual perception, especially for:
- Animation timing and feel
- Spatial relationships between elements
- Color, glow, and particle effects
- "Juice" and polish details

## Anti-Pattern
```
*reads 500 lines of renderer code to understand what an animation looks like*
```

## Correct Pattern
```
"Can you describe what the surge looks like right now, and what you'd want the conquest transition to look like visually?"
```

The user designed this game for visual interaction. Leverage their expertise.
