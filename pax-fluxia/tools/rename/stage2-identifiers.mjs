#!/usr/bin/env node
/**
 * Semantic rename — Stage 2: camelCase/PascalCase identifiers + import paths.
 *   MetaballGrid -> CellGrid   (classes, types, file refs)
 *   metaballGrid -> cellGrid   (vars, fns, import paths, worker URLs)
 * Genuine metaball identifiers (MetaballFamily, MetaballRenderer, buildMetaballScene)
 * do NOT contain "Grid", so they are untouched.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOTS = ['src', 'tools'];
const EXTS = new Set(['.ts', '.svelte']);
const SKIP_DIRS = new Set(['node_modules', '.svelte-kit', 'dist', 'build', 'rename']);
const RULES = [['MetaballGrid', 'CellGrid'], ['metaballGrid', 'cellGrid']];

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
    if (!text.includes('etaballGrid')) continue;
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
