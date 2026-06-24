#!/usr/bin/env node
/**
 * Semantic rename — Stage 1: config keys (UPPER_SNAKE only).
 *
 *   METABALL_GRID_*           → CELL_GRID_*            (grid mechanism; the misnomer)
 *   9 shared surface keys     → TERRITORY_SURFACE_*    (shared fill/border colour)
 *   real-metaball keys        → UNCHANGED              (genuine metaball rendering)
 *
 * Word-boundary (\b) replacements so e.g. METABALL_BORDER_ALPHA does not
 * corrupt METABALL_BORDER_ALPHA_BOOST. No regex backreferences (avoids the
 * literal-byte footgun). Run with `--write` to apply; default is a dry run.
 *
 * Usage:
 *   node tools/rename/stage1-config-keys.mjs            # dry run (counts only)
 *   node tools/rename/stage1-config-keys.mjs --write    # apply
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOTS = ['src', 'tools'];
const EXTS = new Set(['.ts', '.svelte', '.json']);
// Skip our own rename tooling + generated/vendored dirs.
const SKIP_DIRS = new Set(['node_modules', '.svelte-kit', 'dist', 'build', 'rename']);

// Ordered: grid prefix first (no overlap with shared keys, but explicit), then
// the 9 shared keys. Each entry is [search, replace]; search is a plain token
// wrapped in \b...\b at apply time.
const SHARED_KEYS = [
  ['METABALL_BORDER_SATURATION', 'TERRITORY_SURFACE_BORDER_SATURATION'],
  ['METABALL_BORDER_LIGHTNESS', 'TERRITORY_SURFACE_BORDER_LIGHTNESS'],
  ['METABALL_BORDER_WIDTH', 'TERRITORY_SURFACE_BORDER_WIDTH'],
  ['METABALL_BORDER_ALPHA', 'TERRITORY_SURFACE_BORDER_ALPHA'],
  ['METABALL_BORDER_ENABLED', 'TERRITORY_SURFACE_BORDER_ENABLED'],
  ['METABALL_FILL_ENABLED', 'TERRITORY_SURFACE_FILL_ENABLED'],
  ['METABALL_SATURATION', 'TERRITORY_SURFACE_SATURATION'],
  ['METABALL_LIGHTNESS', 'TERRITORY_SURFACE_LIGHTNESS'],
  ['METABALL_ALPHA', 'TERRITORY_SURFACE_ALPHA'],
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

function transform(text) {
  let out = text;
  const counts = {};
  // 1) grid prefix: METABALL_GRID -> CELL_GRID (covers every METABALL_GRID_* key
  //    and the METABALL_GRID_TUNABLE_KEYS const). Safe: no shared key contains _GRID.
  {
    const re = /METABALL_GRID/g;
    const n = (out.match(re) || []).length;
    if (n) { out = out.replace(re, 'CELL_GRID'); counts['METABALL_GRID*'] = n; }
  }
  // 2) shared surface keys, word-boundary so longer keys are untouched.
  for (const [from, to] of SHARED_KEYS) {
    const re = new RegExp(`\\b${from}\\b`, 'g');
    const n = (out.match(re) || []).length;
    if (n) { out = out.replace(re, to); counts[from] = n; }
  }
  return { out, counts };
}

const totals = {};
let filesChanged = 0;
for (const root of ROOTS) {
  let exists = true;
  try { statSync(root); } catch { exists = false; }
  if (!exists) continue;
  for (const file of walk(root)) {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('METABALL')) continue;
    const { out, counts } = transform(text);
    if (out === text) continue;
    filesChanged++;
    for (const [k, v] of Object.entries(counts)) totals[k] = (totals[k] || 0) + v;
    if (WRITE) writeFileSync(file, out);
  }
}

console.log(WRITE ? 'APPLIED' : 'DRY RUN (no writes)');
console.log('files changed:', filesChanged);
for (const [k, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(5)}  ${k}`);
}
