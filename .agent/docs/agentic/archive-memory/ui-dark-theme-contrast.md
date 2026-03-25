
# UI Dark Theme Contrast Rule

## MANDATORY: All UI elements must have proper text contrast against the dark theme.

When creating or modifying UI components:

1. **Never use default browser styles** for `<select>`, `<input>`, `<option>`, or other form elements — they default to white backgrounds with dark text
2. **Always set explicit `background-color` and `color`** on form elements to match the dark theme
3. **Check text contrast** — light text on dark backgrounds, never white-on-white or dark-on-dark
4. **Standard dark theme values**:
   - Background: `var(--color-bg-secondary)` or `rgba(0,0,0,0.6)` or `#1a1a2e`
   - Text: `var(--color-text-primary)` or `#e0e0e0`
   - Borders: `rgba(255,255,255,0.1)` or `var(--color-border)`
5. **Test all interactive elements** visually after styling — dropdowns, inputs, selects, checkboxes

## Failure Mode

If a user reports white-on-white or unreadable text, the UI contrast check was **SKIPPED**. This is unacceptable.
