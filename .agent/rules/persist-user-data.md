

# Persist User-Created Data to File

## Rule

Any data the user creates through an **intentional save action** (clicking a button to save/create) MUST be persisted to BOTH:
1. **localStorage** (for immediate session use)
2. **File on disk** (for permanent persistence)

localStorage is ephemeral — clearing it destroys user content. Files persist.

## Applies To

- Saved themes → `common/resources/settings-themes/`
- Saved maps → appropriate file location
- Custom settings created by explicit save actions
- Any future user-created content

## NOT Applied To

- Transient UI state (panel open/closed, scroll position)
- Runtime preference changes via sliders (these can be localStorage-only)

## Key Distinction

- **Slider adjustment** = transient preference → localStorage OK
- **"Save Theme" button click** = intentional creation → MUST write to file

