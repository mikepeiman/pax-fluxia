#!/usr/bin/env node
/**
 * ui-audit — render UI in isolation, screenshot it, and audit contrast + spacing
 * deterministically.
 *
 * Exists because design work was being done blind: contrast and padding defects
 * kept shipping because nobody could see the rendered result. This makes the
 * feedback loop cheap and repeatable.
 *
 *   bun run ui:audit                      # every theme, every target
 *   bun run ui:audit -- --theme=broadcast-minimal
 *   bun run ui:audit -- --target=ds-buttons --theme=neon-arcade
 *   bun run ui:audit -- --contrast-only   # no screenshots, just the report
 *
 * Outputs to .ui-audit/ (git-ignored):
 *   <theme>__<target>.png   tight crops, cheap to view
 *   report.json             full machine-readable findings
 *   report.md               ranked human/agent summary
 *
 * The contrast audit walks every rendered text node, resolves the *effective*
 * background by climbing ancestors until it finds an opaque layer, composites
 * any translucent layers in between, and computes the true WCAG 2.1 ratio.
 * That is the deterministic answer to "is this text readable" — no eyeballing.
 */

import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".ui-audit");
const PORT = Number(process.env.UI_AUDIT_PORT ?? 5179);
const BASE = `http://localhost:${PORT}`;

const THEMES = [
  "nebula-veil",
  "nebula-veil-v1",
  "neon-arcade",
  "aurelia-drift",
  "cyber-flux",
  "starglass-prime",
  "broadcast-minimal",
];

/** Tight crops keep the PNGs small so they are cheap to look at. */
const TARGETS = {
  topbar: ".tb",
  settings: ".settings",
  "panel-speed": '[data-shot="speed"]',
  "panel-standings": '[data-shot="standings"]',
  "panel-star": '[data-shot="star"]',
  "ds-buttons": '[data-shot="ds-buttons"]',
  "ds-icons": '[data-shot="ds-icons"]',
  "ds-segmented": '[data-shot="ds-segmented"]',
  "ds-fields": '[data-shot="ds-fields"]',
  "ds-rows": '[data-shot="ds-rows"]',
  "ds-panel": '[data-shot="ds-panel"]',
};

// ---------------------------------------------------------------- CLI
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v = "true"] = a.replace(/^--/, "").split("=");
      return [k, v];
    }),
);
const themes = args.theme ? args.theme.split(",") : THEMES;
const targets = args.target
  ? Object.fromEntries(args.target.split(",").map((t) => [t, TARGETS[t]]).filter(([, v]) => v))
  : TARGETS;
const contrastOnly = args["contrast-only"] === "true";

// ---------------------------------------------------------------- dev server
async function ping(url, ms = 1500) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    const r = await fetch(url, { signal: c.signal });
    clearTimeout(t);
    return r.ok || r.status < 500;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await ping(BASE)) {
    console.log(`• reusing dev server on ${BASE}`);
    return null;
  }
  console.log(`• starting dev server on ${PORT}…`);
  const proc = spawn(
    process.platform === "win32" ? "bunx.exe" : "bunx",
    ["vite", "dev", "--port", String(PORT), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", shell: process.platform === "win32" },
  );
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await ping(BASE)) {
      console.log("• dev server ready");
      return proc;
    }
  }
  proc.kill();
  throw new Error("dev server did not become ready in 60s");
}

// ------------------------------------------------- in-page contrast auditor
/* Runs inside the browser. Returns every text element whose computed colour
   fails WCAG AA against its true composited background. */
const CONTRAST_PROBE = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  /* climb ancestors compositing translucent layers until opaque */
  const effectiveBg = (el) => {
    const layers = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      const c = parse(s.backgroundColor);
      const hasImage = s.backgroundImage && s.backgroundImage !== "none";
      if (hasImage) layers.push({ image: true, el: n });
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 0.999 && !hasImage) break;
      }
      n = n.parentElement;
    }
    let base = { r: 12, g: 12, b: 16, a: 1 };
    let uncertain = false;
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (l.image) { uncertain = true; continue; }
      base = over(l, base);
    }
    return { bg: base, uncertain };
  };

  const out = [];
  const els = document.querySelectorAll(".stage *");
  for (const el of els) {
    // only elements that directly render text
    const own = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
    );
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) < 0.15) continue;

    const fg = parse(s.color);
    if (!fg || fg.a === 0) continue;
    const { bg, uncertain } = effectiveBg(el);
    const composited = fg.a < 1 ? over(fg, bg) : fg;
    const cr = ratio(composited, bg);

    const px = parseFloat(s.fontSize);
    const bold = Number(s.fontWeight) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3.0 : 4.5;

    if (cr < need) {
      out.push({
        ratio: Math.round(cr * 100) / 100,
        need,
        text: (el.textContent || "").trim().slice(0, 42),
        selector:
          el.tagName.toLowerCase() +
          (el.className && typeof el.className === "string"
            ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
            : ""),
        color: s.color,
        bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
        fontSize: px,
        uncertain,
      });
    }
  }
  // worst first, de-duplicated by selector+text
  const seen = new Set();
  return out
    .sort((a, b) => a.ratio - b.ratio)
    .filter((f) => {
      const k = f.selector + "|" + f.text;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
};

/* Flags cramped or lopsided padding on interactive elements. */
const SPACING_PROBE = () => {
  const out = [];
  const sel = "button, .ds__cell, .panel, input, select, [role='switch']";
  for (const el of document.querySelectorAll(`.stage ${sel}`)) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const s = getComputedStyle(el);
    const pt = parseFloat(s.paddingTop), pb = parseFloat(s.paddingBottom);
    const pl = parseFloat(s.paddingLeft), pr = parseFloat(s.paddingRight);
    const name =
      el.tagName.toLowerCase() +
      (typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "");
    const issues = [];
    // asymmetric horizontal padding reads as "crowded on one side"
    if (Math.abs(pl - pr) > 3) issues.push(`asymmetric-x ${pl}/${pr}`);
    if (Math.abs(pt - pb) > 3) issues.push(`asymmetric-y ${pt}/${pb}`);
    // interactive targets under 32px tall are cramped
    if (el.matches("button, input, select") && r.height < 30) {
      issues.push(`short ${Math.round(r.height)}px`);
    }
    // text butting against the edge
    if (el.matches("button") && (pl < 6 || pr < 6) && r.width > 44) {
      issues.push(`tight-x ${pl}/${pr}`);
    }
    if (issues.length) {
      out.push({ name, w: Math.round(r.width), h: Math.round(r.height), issues });
    }
  }
  const seen = new Set();
  return out.filter((f) => {
    const k = f.name + f.issues.join();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// ---------------------------------------------------------------- main
const server = await ensureServer();
if (existsSync(OUT)) await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 1100 },
  deviceScaleFactor: 2,
});

const report = { generatedAt: new Date().toISOString(), themes: {} };

try {
  await page.goto(`${BASE}/themes`, { waitUntil: "networkidle" });

  for (const theme of themes) {
    process.stdout.write(`• ${theme} … `);
    await page.evaluate((t) => {
      const stage = document.querySelector(".stage");
      if (stage) stage.setAttribute("data-theme", t);
    }, theme);
    await page.waitForTimeout(260); // let transitions settle

    const contrast = await page.evaluate(CONTRAST_PROBE);
    const spacing = await page.evaluate(SPACING_PROBE);
    report.themes[theme] = { contrast, spacing, shots: [] };

    if (!contrastOnly) {
      for (const [name, selector] of Object.entries(targets)) {
        const el = page.locator(selector).first();
        if ((await el.count()) === 0) continue;
        try {
          await el.scrollIntoViewIfNeeded();
          await page.waitForTimeout(60);
          const file = path.join(OUT, `${theme}__${name}.png`);
          await el.screenshot({ path: file });
          report.themes[theme].shots.push(path.basename(file));
        } catch {
          /* element not visible in this theme — skip */
        }
      }
    }
    console.log(`${contrast.length} contrast, ${spacing.length} spacing`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}

// ---------------------------------------------------------------- output
await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

let md = `# UI audit\n\n${report.generatedAt}\n\n`;
let totalC = 0, totalS = 0;
for (const [theme, r] of Object.entries(report.themes)) {
  totalC += r.contrast.length;
  totalS += r.spacing.length;
  md += `## ${theme}\n\n`;
  md += `**Contrast failures (WCAG AA): ${r.contrast.length}**\n\n`;
  if (r.contrast.length) {
    md += `| ratio | need | element | text | colour | on |\n|---|---|---|---|---|---|\n`;
    for (const f of r.contrast.slice(0, 14)) {
      md += `| ${f.ratio} | ${f.need} | \`${f.selector}\` | ${f.text || "—"} | ${f.color} | ${f.bg} |\n`;
    }
    md += `\n`;
  }
  md += `**Spacing flags: ${r.spacing.length}**\n\n`;
  if (r.spacing.length) {
    md += `| element | size | issues |\n|---|---|---|\n`;
    for (const f of r.spacing.slice(0, 14)) {
      md += `| \`${f.name}\` | ${f.w}×${f.h} | ${f.issues.join(", ")} |\n`;
    }
    md += `\n`;
  }
}
md = md.replace("\n\n", `\n\n**Totals — contrast: ${totalC}, spacing: ${totalS}**\n\n`);
await writeFile(path.join(OUT, "report.md"), md);

console.log(`\n✓ ${totalC} contrast failures, ${totalS} spacing flags`);
console.log(`  ${path.relative(process.cwd(), OUT)}/report.md`);
if (!contrastOnly) console.log(`  screenshots: ${path.relative(process.cwd(), OUT)}/*.png`);
