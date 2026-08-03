#!/usr/bin/env node
/**
 * ui-audit — render UI in isolation, screenshot it, and audit contrast + spacing
 * deterministically.
 *
 * Exists because design work was being done blind: contrast and padding defects
 * kept shipping because nobody could see the rendered result. This makes the
 * feedback loop cheap and repeatable.
 *
 *   bun run ui:audit                      # every scene, theme and target
 *   bun run ui:audit -- --scene=hud       # ONLY the real shipped HUD
 *   bun run ui:audit -- --theme=broadcast-minimal
 *   bun run ui:audit -- --target=ds-buttons --theme=neon-arcade
 *   bun run ui:audit -- --contrast-only   # no screenshots, just the report
 *   bun run ui:audit -- --sheet           # plus one full-page shot per theme
 *
 * Outputs to .ui-audit/ (git-ignored):
 *   <scene>__<theme>__<target>.png   tight crops, cheap to view
 *   report.json                      full machine-readable findings
 *   report.md                        ranked human/agent summary
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

const THEMES = ["nebula-veil", "aurelia-drift", "neon-arcade", "broadcast-minimal"];

/**
 * Two scenes.
 *
 *   hud  — /dev/hud, the REAL shipped components under the real theme state.
 *          This is the one that matters: it is what a player actually sees.
 *   lab  — /themes, the design lab. Still audited so exploratory work does not
 *          drift out of contrast while it is being explored.
 *
 * `root` scopes every probe, so nothing outside the audited surface is counted.
 * `switchTheme` runs in the page and must drive the SAME state the app uses —
 * setting a data attribute by hand only moves CSS and leaves component state
 * (and anything conditional on it) on the previous theme.
 */
const SCENES = {
  hud: {
    path: "/dev/hud",
    root: ".hudlab",
    /* The real store is reached through the switcher the page already renders. */
    switchSelector: (theme) => `[data-theme-id="${theme}"]`,
    targets: {
      topbar: '[data-shot="topbar"]',
      settings: '[data-shot="settings"]',
      "panel-speed": '[data-shot="panel-speed"]',
      "panel-standings": '[data-shot="panel-standings"]',
      "panel-star": '[data-shot="panel-star"]',
      "ds-buttons": '[data-shot="ds-buttons"]',
      "ds-icons": '[data-shot="ds-icons"]',
      "ds-segmented": '[data-shot="ds-segmented"]',
      "ds-fields": '[data-shot="ds-fields"]',
      "ds-panel": '[data-shot="ds-panel"]',
      "ds-themes": '[data-shot="ds-themes"]',
    },
  },
  lab: {
    path: "/themes",
    root: ".stage",
    switchSelector: (theme) => `[data-theme-id="${theme}"]`,
    targets: {
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
    },
  },
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
const sceneNames = args.scene ? args.scene.split(",") : Object.keys(SCENES);
const unknownScene = sceneNames.find((name) => !SCENES[name]);
if (unknownScene) {
  console.error(`unknown scene "${unknownScene}" — expected one of: ${Object.keys(SCENES).join(", ")}`);
  process.exit(1);
}
const contrastOnly = args["contrast-only"] === "true";

function targetsFor(scene) {
  if (!args.target) return scene.targets;
  return Object.fromEntries(
    args.target.split(",").map((t) => [t, scene.targets[t]]).filter(([, v]) => v),
  );
}

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
const CONTRAST_PROBE = (rootSelector) => {
  /* Chrome serialises anything produced by color-mix() as `color(srgb r g b / a)`
     with 0..1 channels, NOT as rgb(). Matching only rgb() made every mixed
     surface invisible to this probe: it silently skipped the real background
     and climbed to an ancestor, so it reported a contrast ratio against a
     surface the text is not actually sitting on. Since almost every themed
     control fill in this codebase is a color-mix, that blind spot covered most
     of the UI. Both syntaxes are parsed now. */
  const parse = (c) => {
    if (!c) return null;
    const srgb = c.match(/color\(srgb\s+([^)]+)\)/);
    if (srgb) {
      const p = srgb[1].split(/[\s/]+/).filter(Boolean).map(Number);
      if (p.length < 3 || p.some(Number.isNaN)) return null;
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 };
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (p.some(Number.isNaN)) return null;
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
  const els = document.querySelectorAll(`${rootSelector} *`);
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

/* Force every option of every single-select control into its selected state, so
   one pass measures ALL of them. Returns what to put back. */
const FORCE_ALL_SELECTED = (rootSelector) => {
  const changed = [];
  const items = document.querySelectorAll(
    `${rootSelector} [data-state="off"], ${rootSelector} [aria-checked="false"]`,
  );
  items.forEach((el, i) => {
    const id = `pax-audit-${i}`;
    el.setAttribute("data-pax-audit-id", id);
    changed.push({
      id,
      state: el.getAttribute("data-state"),
      checked: el.getAttribute("aria-checked"),
    });
    if (el.hasAttribute("data-state")) el.setAttribute("data-state", "on");
    if (el.hasAttribute("aria-checked")) el.setAttribute("aria-checked", "true");
  });
  return changed;
};

const RESTORE_SELECTED = (changed) => {
  for (const rec of changed) {
    const el = document.querySelector(`[data-pax-audit-id="${rec.id}"]`);
    if (!el) continue;
    if (rec.state === null) el.removeAttribute("data-state");
    else el.setAttribute("data-state", rec.state);
    if (rec.checked === null) el.removeAttribute("aria-checked");
    else el.setAttribute("aria-checked", rec.checked);
    el.removeAttribute("data-pax-audit-id");
  }
};

/* Flags cramped or lopsided padding on interactive elements. */
const SPACING_PROBE = (rootSelector) => {
  const out = [];
  const sel = "button, .ds__cell, .panel, .pax-hud-panel, input, select, [role='switch']";
  for (const el of document.querySelectorAll(`${rootSelector} :is(${sel})`)) {
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
    /* Asymmetric padding reads as "crowded on one side". A few px of deliberate
       optical weighting (heavier bottom under a title, say) is normal craft, so
       the threshold sits above that rather than flagging every considered
       choice — a probe that cries wolf gets ignored, which is worse than one
       that misses a 4px nudge. */
    if (Math.abs(pl - pr) > 6) issues.push(`asymmetric-x ${pl}/${pr}`);
    if (Math.abs(pt - pb) > 6) issues.push(`asymmetric-y ${pt}/${pb}`);
    /* Pointer target size — WCAG 2.5.8 (AA) wants 24x24 CSS px. The border box
       is not the whole story: a control can stay visually small and still be a
       fair target by carrying an absolutely-positioned overlay, which is how a
       quiet 14px marker keeps its size without failing. Measure the union. */
    if (el.matches("button, input, select")) {
      let tw = r.width, th = r.height;
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === "none" || ps.position !== "absolute") continue;
        const pw = parseFloat(ps.width), ph = parseFloat(ps.height);
        if (Number.isFinite(pw)) tw = Math.max(tw, pw);
        if (Number.isFinite(ph)) th = Math.max(th, ph);
      }
      if (tw < 24 || th < 24) {
        issues.push(`target ${Math.round(tw)}x${Math.round(th)} (WCAG 2.5.8 wants 24x24)`);
      }
    }
    /* Text butting against a button's edge. Full-bleed rows are exempt: a
       settings row that spans its container is not a chip, and its inline
       padding legitimately belongs to the container, not the row. */
    const parentW = el.parentElement?.getBoundingClientRect().width ?? 0;
    const fullBleed = parentW > 0 && r.width / parentW > 0.9;
    if (el.matches("button") && !fullBleed && (pl < 6 || pr < 6) && r.width > 44) {
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

const report = { generatedAt: new Date().toISOString(), scenes: {} };

try {
  for (const sceneName of sceneNames) {
    const scene = SCENES[sceneName];
    const targets = targetsFor(scene);
    console.log(`\n> scene ${sceneName} (${scene.path})`);
    report.scenes[sceneName] = { path: scene.path, themes: {} };

    await page.goto(`${BASE}${scene.path}`, { waitUntil: "networkidle" });
    /* Kill transitions/animations for the whole run. The theme cross-fade is
       450ms, so sampling before it settled read colours that were mid-blend and
       reported phantom failures. Deterministic sampling needs a static page. */
    await page.addStyleTag({
      content: `*, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }`,
    });
    await page.waitForSelector(scene.root, { timeout: 20000 });

    for (const theme of themes) {
      process.stdout.write(`  - ${theme} ... `);
      /* Click the real switcher: writing the data attribute by hand only moves
         CSS, leaving component state on the previous theme. */
      const sw = page.locator(scene.switchSelector(theme));
      if (await sw.count()) {
        await sw.first().click();
      } else {
        await page.evaluate((t) => {
          document.documentElement.dataset.paxTheme = t;
        }, theme);
      }
      await page.waitForTimeout(180); // transitions are off; just flush layout

      const contrast = await page.evaluate(CONTRAST_PROBE, scene.root);
      const spacing = await page.evaluate(SPACING_PROBE, scene.root);

      /* A single-select control only ever shows ONE option in its selected
         state, so a plain sweep audits one of five game-speed tones and leaves
         the other four unmeasured — the exact place a contrast bug hides. Force
         every selectable option on, re-measure, then restore. */
      const selectedStates = await page.evaluate(FORCE_ALL_SELECTED, scene.root);
      const contrastAllStates = await page.evaluate(CONTRAST_PROBE, scene.root);
      await page.evaluate(RESTORE_SELECTED, selectedStates);
      for (const f of contrastAllStates) {
        if (!contrast.some((seen) => seen.selector === f.selector && seen.text === f.text)) {
          contrast.push({ ...f, onlyInForcedState: true });
        }
      }
      contrast.sort((a, b) => a.ratio - b.ratio);

      report.scenes[sceneName].themes[theme] = { contrast, spacing, shots: [] };
      const shots = report.scenes[sceneName].themes[theme].shots;

      if (!contrastOnly) {
        /* Whole-screen review shot - one image per theme, one markup pass. */
        if (args.sheet === "true") {
          const file = path.join(OUT, `SHEET__${sceneName}__${theme}.png`);
          await page.screenshot({ path: file, fullPage: true });
          shots.push(path.basename(file));
        }
        for (const [name, selector] of Object.entries(targets)) {
          const el = page.locator(selector).first();
          if ((await el.count()) === 0) continue;
          try {
            await el.scrollIntoViewIfNeeded();
            await page.waitForTimeout(60);
            const file = path.join(OUT, `${sceneName}__${theme}__${name}.png`);
            await el.screenshot({ path: file });
            shots.push(path.basename(file));
          } catch {
            /* element not visible in this theme - skip */
          }
        }
      }
      console.log(`${contrast.length} contrast, ${spacing.length} spacing`);
    }
  }
} finally {
  await browser.close();
  if (server) server.kill();
}

// ---------------------------------------------------------------- output
await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

let md = `# UI audit\n\n${report.generatedAt}\n\n`;
let totalC = 0, totalS = 0;
for (const [sceneName, scene] of Object.entries(report.scenes)) {
  md += `# scene: ${sceneName} \u2014 \`${scene.path}\`\n\n`;
  for (const [theme, r] of Object.entries(scene.themes)) {
    totalC += r.contrast.length;
    totalS += r.spacing.length;
    md += `## ${theme}\n\n`;
    md += `**Contrast failures (WCAG AA): ${r.contrast.length}**\n\n`;
    if (r.contrast.length) {
      md += `| ratio | need | element | text | colour | on |\n|---|---|---|---|---|---|\n`;
      for (const f of r.contrast.slice(0, 14)) {
        md += `| ${f.ratio} | ${f.need} | \`${f.selector}\` | ${f.text || "-"} | ${f.color} | ${f.bg} |\n`;
      }
      md += `\n`;
    }
    md += `**Spacing flags: ${r.spacing.length}**\n\n`;
    if (r.spacing.length) {
      md += `| element | size | issues |\n|---|---|---|\n`;
      for (const f of r.spacing.slice(0, 14)) {
        md += `| \`${f.name}\` | ${f.w}x${f.h} | ${f.issues.join(", ")} |\n`;
      }
      md += `\n`;
    }
  }
}
md = md.replace("\n\n", `\n\n**Totals \u2014 contrast: ${totalC}, spacing: ${totalS}**\n\n`);
await writeFile(path.join(OUT, "report.md"), md);

console.log(`\n✓ ${totalC} contrast failures, ${totalS} spacing flags`);
console.log(`  ${path.relative(process.cwd(), OUT)}/report.md`);
if (!contrastOnly) console.log(`  screenshots: ${path.relative(process.cwd(), OUT)}/*.png`);
