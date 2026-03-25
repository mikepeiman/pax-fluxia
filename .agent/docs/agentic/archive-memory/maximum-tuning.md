# Maximum Tuning & Feedback Policy

## CRITICAL: The Architect (user) wants MAXIMUM logs, UI feedback, and tuning controls on ALL systems.

This applies to:
- **Debugging**: Comprehensive console/visual logging
- **Visual tuning**: Every visual parameter (colors, sizes, gradients, glow, alpha, etc.) should have an exposed slider/control
- **UI tuning**: Layout, spacing, timing parameters exposed
- **Functionality tuning**: All gameplay/system parameters exposed with real-time adjustment
- **Gameplay dynamics**: Combat, production, AI behavior — all tunable in real-time

### Implementation Rule
When building ANY new visual or functional system:
1. Extract ALL magic numbers into `GAME_CONFIG` or equivalent config
2. Add corresponding UI controls (sliders, toggles, color pickers) in the debug panel
3. Persist all values to localStorage
4. Show current values in the UI next to each control
