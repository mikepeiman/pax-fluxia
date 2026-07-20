
# Slider Reactivity: Panel-First Pattern

## RULE: All UI sliders MUST read from `panel.xxx` ($state), never `GAME_CONFIG.xxx` directly.

`GAME_CONFIG` is a plain object — it is **NOT** Svelte-reactive. Reading `GAME_CONFIG.xxx` in a template will NOT update when config changes (theme apply, import, sync).

### The ONE correct pattern:

1. **Every slider variable** must have an entry in `PANEL_CONFIG_MAP` (in `settingsDefs.ts`)
2. **Display/value** must read from `panel.xxx` (which is `$state` and therefore reactive)
3. **oninput** must call `updatePanel(key, value)` which writes to both `panel` AND `GAME_CONFIG`
4. **After theme/import**, `settingsStore.syncFromConfig()` reads `GAME_CONFIG` back into `panel`, triggering reactivity

### ❌ NEVER do this:
```svelte
<span>{GAME_CONFIG.SOME_VALUE}</span>
<input value={GAME_CONFIG.SOME_VALUE} oninput={(e) => { GAME_CONFIG.SOME_VALUE = v; }} />
```

### ✅ ALWAYS do this:
```svelte
<span>{panel.someValue}</span>
<input value={panel.someValue} oninput={(e) => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    GAME_CONFIG.SOME_VALUE = v;
    updatePanel("someValue", v);
}} />
```

### Checklist for adding a new slider:
1. Add entry to `PANEL_CONFIG_MAP` in `settingsDefs.ts`: `{ panelKey: 'myKey', configKey: 'MY_CONFIG_KEY' }`
2. If the display is inverse of config (like Defense = 1/AGGRESSOR_ADVANTAGE), add `transform: 'inverse'`
3. Template reads `panel.myKey`, writes via `updatePanel("myKey", v)`
4. `settingsStore.syncFromConfig()` automatically handles sync after theme apply
