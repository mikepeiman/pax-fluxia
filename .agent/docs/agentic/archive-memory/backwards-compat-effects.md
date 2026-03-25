# Backwards-Compatible Effects Policy

## Rule: Save Old Animations/Effects as Settings

When changing animations and visual effects:
1. **SAVE** the old effect as a configurable setting in the control panel
2. **ENSURE** all formulas and functions are constructed to be "backwards-compatible"
3. **OLD behaviors** should be accessible via config toggle/slider, not deleted
4. **CHECK with user** if this ever obstructs good architecture, clean code, or impinges on development

## Examples
- If changing easing from linear to cubic, add a mode selector: `linear | cubic`
- If adding a ramp-in, make duration configurable (0 = disabled = old behavior)
- If replacing a travel path mode, keep old modes as options: `straight | arc | magnetic`

## Exception
- Failed UI features (e.g., buttons that don't serve their purpose) can be removed per explicit user request
- Dead code that was never functional can be cleaned up
