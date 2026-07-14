// Measure the coupling surface of a candidate extraction range inside a Svelte
// component script. For lines [from,to], report which TOP-LEVEL identifiers
// declared OUTSIDE the range are referenced inside it (= the deps the extracted
// module would need), and which identifiers declared INSIDE are referenced
// outside (= the API it must expose).
const fs = require('fs');
const file = process.argv[2];
const from = Number(process.argv[3]);
const to = Number(process.argv[4]);
const lines = fs.readFileSync(file, 'utf8').split('\n');

// Collect top-level declarations: `    let x`, `    const x`, `    function x`,
// `    type X`, `    interface X`, `    export function x`, `    async function x`
const decls = new Map(); // name -> line
const DECL = /^    (?:export\s+)?(?:async\s+)?(let|const|var|function|type|interface|class)\s+([A-Za-z_$][\w$]*)/;
for (let i = 0; i < lines.length; i++) {
  const m = DECL.exec(lines[i]);
  if (m) decls.set(m[2], i + 1);
}

const inRange = (ln) => ln >= from && ln <= to;
const idsOn = (text) => {
  // strip strings + line comments to reduce noise
  const t = text.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, '``').replace(/\/\/.*$/, '');
  return t.match(/[A-Za-z_$][\w$]*/g) || [];
};

const needs = new Map();  // outside decl referenced inside range
const exposes = new Map(); // inside decl referenced outside range

for (let i = 0; i < lines.length; i++) {
  const ln = i + 1;
  for (const id of idsOn(lines[i])) {
    const d = decls.get(id);
    if (!d) continue;
    if (d === ln) continue; // its own declaration line
    if (inRange(ln) && !inRange(d)) needs.set(id, (needs.get(id) || 0) + 1);
    if (!inRange(ln) && inRange(d)) {
      if (!exposes.has(id)) exposes.set(id, []);
      exposes.get(id).push(ln);
    }
  }
}

const kind = (n) => {
  const l = decls.get(n);
  const m = DECL.exec(lines[l - 1]);
  return m ? m[1] : '?';
};
const sortDesc = (m) => [...m.entries()].sort((a, b) => (b[1].length ?? b[1]) - (a[1].length ?? a[1]));

console.log(`RANGE ${from}-${to}  (${to - from + 1} lines)\n`);
console.log(`--- NEEDS (${needs.size}) : declared outside, used inside = deps ---`);
for (const [n, c] of sortDesc(needs)) console.log(`  ${String(c).padStart(3)}x  ${kind(n).padEnd(9)} ${n}  @${decls.get(n)}`);
console.log(`\n--- EXPOSES (${exposes.size}) : declared inside, used outside = public API ---`);
for (const [n, ls] of sortDesc(exposes)) console.log(`  ${String(ls.length).padStart(3)}x  ${kind(n).padEnd(9)} ${n}  @${decls.get(n)} -> used at ${ls.slice(0, 8).join(',')}${ls.length > 8 ? ',…' : ''}`);
