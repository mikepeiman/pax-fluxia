const fs = require('fs');

// 1. Add METABALL_BORDER_WIDTH and METABALL_BORDER_ALPHA to config type and defaults
const configPath = 'c:\\Users\\mikep\\Desktop\\WebDev\\PRISM-Atlas-DART v1\\pax-fluxia\\src\\lib\\components\\ui\\settingsDefs.ts';
let settingsC = fs.readFileSync(configPath, 'utf8');

// Add border mappings to PANEL_CONFIG_MAP
const borderMappings = `    { panelKey: 'metaballBorderWidth', configKey: 'METABALL_BORDER_WIDTH' },\r\n    { panelKey: 'metaballBorderAlpha', configKey: 'METABALL_BORDER_ALPHA' },\r\n`;
const insertBefore = "    { panelKey: 'metaballBlur', configKey: 'METABALL_BLUR' },";
if (settingsC.includes(insertBefore) && !settingsC.includes('metaballBorderWidth')) {
    settingsC = settingsC.replace(insertBefore, borderMappings + insertBefore);
    fs.writeFileSync(configPath, settingsC);
    console.log('settingsDefs.ts: border mappings added');
} else {
    console.log('settingsDefs.ts: already has border mappings or marker not found');
}

// 2. Add METABALL_BORDER_WIDTH and METABALL_BORDER_ALPHA to game config type
const gcPath = 'c:\\Users\\mikep\\Desktop\\WebDev\\PRISM-Atlas-DART v1\\pax-fluxia\\src\\lib\\config\\game.config.ts';
let gc = fs.readFileSync(gcPath, 'utf8');

// Add to type interface
const typeMarker = "    METABALL_BLUR: number;              // GPU blur on metaball container (0=sharp, default 4)";
if (gc.includes(typeMarker) && !gc.includes('METABALL_BORDER_WIDTH')) {
    gc = gc.replace(typeMarker, typeMarker + '\r\n    METABALL_BORDER_WIDTH: number;       // Border line width between territories (default 1.5)\r\n    METABALL_BORDER_ALPHA: number;       // Border line alpha (default 0.6)');
    console.log('game.config.ts: type interface updated');
}

// Add to defaults
const defaultMarker = "    METABALL_BLUR: 4,";
if (gc.includes(defaultMarker) && !gc.includes('METABALL_BORDER_WIDTH:')) {
    gc = gc.replace(defaultMarker, defaultMarker + '\r\n    /** Border line width between metaball territories */\r\n    METABALL_BORDER_WIDTH: 1.5,\r\n    /** Border line alpha */\r\n    METABALL_BORDER_ALPHA: 0.6,');
    console.log('game.config.ts: defaults updated');
}

fs.writeFileSync(gcPath, gc);
console.log('Done');
