// Transitive dead-closure: iterate to fixpoint. A module is dead if every
// importer is itself dead. Reports the true removable tree.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const LIB = path.join(SRC, 'lib');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['_quarantine', 'node_modules', '_archived'].includes(e.name)) continue;
      walk(p, out);
    } else if (/\.(ts|svelte|js)$/.test(e.name)) out.push(p);
  }
  return out;
}
const norm = (p) => p.replace(/\\/g, '/');
const files = [...walk(SRC), ...walk(path.join(ROOT, 'tools'))];

function resolve(spec, fromFile) {
  let base;
  if (spec.startsWith('$lib/')) base = path.join(LIB, spec.slice(5));
  else if (!spec.startsWith('.')) return null;
  else base = path.resolve(path.dirname(fromFile), spec);
  base = base.replace(/\?.*$/, '');
  for (const c of [base, base + '.ts', base + '.js', base + '.svelte',
    path.join(base, 'index.ts'), path.join(base, 'index.js')]) {
    try { if (fs.statSync(c).isFile()) return norm(c); } catch {}
  }
  return null;
}

const importedBy = new Map();
const RE = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = RE.exec(src))) {
    const t = resolve(m[1], f);
    if (!t) continue;
    if (!importedBy.has(t)) importedBy.set(t, new Set());
    importedBy.get(t).add(norm(f));
  }
}

// Live roots: routes, spawned workers, d.ts, app shell, tools, tests, and
// anything referenced as a path string in vite.config.js (browserBenchEntry).
const viteCfg = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
const namedInVite = (p) => {
  const i = p.indexOf('/src/');
  return i >= 0 && viteCfg.includes(p.slice(i + 1));
};

// A worker file is a live root ONLY if something spawns it by name
// (new URL('...<name>.worker.ts', import.meta.url) or a '?worker' import).
// Blindly rooting every *.worker.ts hid the metaball compute worker for a
// full campaign stage after its spawner was quarantined.
const workerSpawnNames = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /([\w./-]+\.worker(?:\.ts)?)/g;
  if (!/new\s+Worker|\?worker/.test(src)) continue;
  let m;
  while ((m = re.exec(src))) {
    if (norm(f).endsWith(m[1].replace(/^\.\//, '/'))) continue; // self-reference
    workerSpawnNames.add(m[1].split('/').pop().replace(/\.ts$/, ''));
  }
}
const isSpawnedWorker = (p) => {
  if (!/\.worker\.ts$/.test(p)) return false;
  const base = p.split('/').pop().replace(/\.ts$/, '');
  return workerSpawnNames.has(base);
};

const isEntry = (p) =>
  /\/src\/routes\//.test(p) || /\.test\.ts$/.test(p) || /\.d\.ts$/.test(p) ||
  /\/(app|hooks|service-worker|vite-env)\./.test(p) || isSpawnedWorker(p) ||
  /\/tools\//.test(p) || namedInVite(p);

const libFiles = files.map(norm).filter((p) => p.includes('/src/lib/'));
const dead = new Set();
for (let i = 0; i < 100; i++) {
  const before = dead.size;
  for (const p of libFiles) {
    if (dead.has(p) || isEntry(p)) continue;
    const live = [...(importedBy.get(p) || [])].filter((x) => !dead.has(x));
    if (live.length === 0) dead.add(p);
  }
  if (dead.size === before) break;
}
const rel = (p) => p.replace(norm(ROOT) + '/', '');
const rows = [...dead].map((p) => ({ p, loc: fs.readFileSync(p, 'utf8').split('\n').length }))
  .sort((a, b) => b.loc - a.loc);
console.log(`scanned ${libFiles.length} src/lib modules`);
console.log(`TRANSITIVELY DEAD: ${rows.length} files, ${rows.reduce((s, r) => s + r.loc, 0)} LOC\n`);
for (const { p, loc } of rows) console.log(`${String(loc).padStart(6)}  ${rel(p)}`);
