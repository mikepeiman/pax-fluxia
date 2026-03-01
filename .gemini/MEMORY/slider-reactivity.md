

# Slider Reactivity: Panel-First Pattern

## RULE: All UI sliders MUST read from `panel.xxx` ($state), never `GAME_CONFIG.xxx` directly.

`GAME_CONFIG` is a plain object — it is **NOT** Svelte-reactive. Reading `GAME_CONFIG.xxx` in a template will NOT update when config changes (theme apply, import, sync).

### Required pattern for every slider:
1. Display reads `panel.someKey` (reactive $state)
2. oninput writes to BOTH `GAME_CONFIG.XXX = v` AND calls `updatePanel("someKey", v)`
3. Every slider key must exist in `PANEL_CONFIG_MAP` (in `settingsDefs.ts`)
4. After theme/import, `syncPanelFromConfig()` syncs GAME_CONFIG → panel automatically

### Never do this:
```svelte
<span>{GAME_CONFIG.SOME_VALUE}</span>
<input value={GAME_CONFIG.SOME_VALUE} ...>
```

### Always do this:
```svelte
<span>{panel.someKey}</span>
<input value={panel.someKey} oninput={(e) => { GAME_CONFIG.SOME_VALUE = v; updatePanel("someKey", v); }}>
```

