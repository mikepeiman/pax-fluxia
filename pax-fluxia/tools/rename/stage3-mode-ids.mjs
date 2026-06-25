#!/usr/bin/env node
/**
 * Semantic rename — Stage 3: render-mode ID string literals (drop the prefix).
 * LONGEST-FIRST so the base id does not clobber the compound ids.
 *   metaball_grid_phase_field   -> phase_field
 *   metaball_grid_phase_edges   -> phase_edges
 *   metaball_grid_ember_lattice -> ember_lattice
 *   metaball_grid               -> cell_grid   (base variant)
 *
 * By this stage, lowercase `metaball_grid` snake-case appears ONLY as render-mode
 * ids (UPPER METABALL_GRID → CELL_GRID in stage 1; camel metaballGrid → cellGrid
 * in stage 2), so a plain token replace is safe. Migration aliases for persisted
 * old ids are added to the catalog AFTER this runs (so their keys aren't rewritten).
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOTS = ['src', 'tools'];
const EXTS = new Set(['.ts', '.svelte', '.json']);
const SKIP_DIRS = new Set(['node_modules', '.svelte-kit', 'dist', 'build', 'rename']);
const RULES = [
  ['metaball_grid_phase_field', 'phase_field'],
  ['metaball_grid_phase_edges', 'phase_edges'],
  ['metaball_grid_ember_lattice', 'ember_lattice'],
  ['metaball_grid', 'cell_grid'],
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
    if (!text.includes('metaball_grid')) continue;
    const before = text;
    for (const [from, to] of RULES) {
      const n = text.split(from).length - 1;
      if (n) { text = text.split(from).join(to); totals[from] = (totals[from] || 0) + n; }
    }
    if (text === before) continue;
    filesChanged++;
    if (WRITE) writeFileSync(file, text);
  }
}
console.log(WRITE ? 'APPLIED' : 'DRY RUN');
console.log('files changed:', filesChanged);
for (const [k, v] of Object.entries(totals)) console.log(`  ${String(v).padStart(5)}  ${k}`);
