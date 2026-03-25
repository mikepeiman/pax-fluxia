

# Theme Versioning Policy

## MANDATORY: When the user provides an updated version of a named theme

When the user provides new values for an existing named theme:

1. **Do NOT overwrite** the existing theme directly
2. **Create a versioned copy**: append ` v2`, ` v3`, etc. to the theme name
3. Keep the original version intact for comparison
4. Example: "Smooth Bezier" → "Smooth Bezier v2" → "Smooth Bezier v3"

## When Updating Built-in Themes

If the user provides updated values for a built-in theme in `builtinThemes.ts`:
1. Add the new version as a separate `GameTheme` export with versioned name
2. Add it to the `BUILTIN_THEMES` array
3. Keep the original for reference

## Where Themes Live

| File | Purpose |
|------|---------|
| `pax-fluxia/src/lib/config/builtinThemes.ts` | Built-in theme presets shipped with the game |
| `pax-fluxia/src/lib/config/themes.ts` | Theme system: extract, apply, save/load, export |
| `pax-fluxia/src/lib/utils/themePresets.ts` | Alternate preset system (unused, legacy) |

