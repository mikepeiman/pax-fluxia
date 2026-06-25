#!/usr/bin/env node
/**
 * Semantic rename — Stage 5: the 9 SHARED camelCase panel-key handles.
 *   metaball{Saturation,Lightness,Alpha,FillEnabled,BorderEnabled,BorderWidth,
 *            BorderAlpha,BorderSaturation,BorderLightness} -> territorySurface*
 * Genuine metaball-mode handles (metaballSharpness, metaballBlur,
 * metaballBlurAffectsBorders, metaballBorderForceRatio, metaballCombatBorder*)
 * are NOT in the list → untouched. Word-boundary, longest-first.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOTS = ['src', 'tools'];
const EXTS = new Set(['.ts', '.svelte']);
const SKIP_DIRS = new Set(['node_modules', '.svelte-kit', 'dist', 'build', 'rename']);
// Longest-first so e.g. metaballBorderSaturation is handled before metaballSaturation
// could ever be considered (they don't overlap, but order is defensive).
const KEYS = [
  ['metaballBorderSaturation', 'territorySurfaceBorderSaturation'],
  ['metaballBorderLightness', 'territorySurfaceBorderLightness'],
  ['metaballBorderEnabled', 'territorySurfaceBorderEnabled'],
  ['metaballBorderWidth', 'territorySurfaceBorderWidth'],
  ['metaballBorderAlpha', 'territorySurfaceBorderAlpha'],
  ['metaballFillEnabled', 'territorySurfaceFillEnabled'],
  ['metaballSaturation', 'territorySurfaceSaturation'],
  ['metaballLightness', 'territorySurfaceLightness'],
  ['metaballAlpha', 'territorySurfaceAlpha'],
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (EXTS.has(extname(name))) yield p;
  }
}

const totals = {};
let filesChanged = 0;
for (const root of ROOTS) {
  try { statSync(root); } catch { continue; }
  for (const file of walk(root)) {
    let text = readFileSync(file, 'utf8');
    if (!text.includes('metaball')) continue;
    const before = text;
    for (const [from, to] of KEYS) {
      const re = new RegExp(`\\b${from}\\b`, 'g');
      const n = (text.match(re) || []).length;
      if (n) { text = text.replace(re, to); totals[from] = (totals[from] || 0) + n; }
    }
    if (text === before) continue;
    filesChanged++;
    if (WRITE) writeFileSync(file, text);
  }
}
console.log(WRITE ? 'APPLIED' : 'DRY RUN');
console.log('files changed:', filesChanged);
for (const [k, v] of Object.entries(totals)) console.log(`  ${String(v).padStart(5)}  ${k}`);
