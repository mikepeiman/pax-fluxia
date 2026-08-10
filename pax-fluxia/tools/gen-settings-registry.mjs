// Generates src/lib/components/ui/settings/settingsControlRegistry.generated.ts
// by extracting every static-keyed control from the non-territory settings
// sections (one section per file). Rendered label = ground truth, so generated
// labels cannot drift from the UI. Run: bun tools/gen-settings-registry.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const SETTINGS = path.join(ROOT, "src/lib/components/ui/settings");

// Render-mode-gated tuning cards. These live under Territory -> Render, and the
// SUBSECTION is the render mode whose chip mounts the card — so a search hit
// selects that mode and the control is actually there. Without this the cards'
// controls stayed outside the registry: 49 rows whose label, search text and
// persisted key were three hand-kept lists that could drift apart.
const FILE_SECTION_SUBSECTION = {
    // The cell-grid family shares one card group; phase_edges is its canonical
    // entry, matching the hand-authored cell-grid entries in the registry.
    "CellGridTuning.svelte": ["territory_styles", "phase_edges"],
    "TerritorySurfaceStyleTuning.svelte": ["territory_styles", "phase_edges"],
    "GridGradientTuning.svelte": ["territory_styles", "grid_gradient"],
};

// One section per component file (the clean, non-mode-gated sections).
const FILE_SECTION = {
    "ControlsSection-Territory.svelte": "territory_tuning",
  "ControlsSection-Players.svelte": "players",
  "ControlsSection-Timing.svelte": "match_flow",
  "ControlsSection-Battle.svelte": "combat_tuning",
  "ControlsSection-Economy.svelte": "economy",
  "ControlsSection-Travel.svelte": "travel_orders",
  "ControlsSection-Conquest.svelte": "conquest",
  "ControlsSection-Surge.svelte": "effects",
  "ControlsSection-Audio.svelte": "audio",
  "ControlsSection-Ships.svelte": "fleet_star_visuals",
  "ControlsSection-Visuals.svelte": "map_options",
  "ControlsSection-Diagnostics.svelte": "diagnostics",
  "ControlsSection-Logging.svelte": "logging",
  "ControlsSection-AI.svelte": "ai",
  "ControlsSection-FrontierFx.svelte": "frontier_fx",
};

// Keys already curated by hand in settingsControlRegistry.ts — never regenerate.
const manualSrc = readFileSync(path.join(SETTINGS, "settingsControlRegistry.ts"), "utf-8");
const MANUAL = new Set([...manualSrc.matchAll(/configKey:\s*"([^"]+)"/g)].map((m) => m[1]));

function staticAttr(attrs, name) {
  const dq = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  if (dq) return dq[1];
  const braceStr = new RegExp(`\\b${name}=\\{"([^"]*)"\\}`).exec(attrs);
  if (braceStr) return braceStr[1];
  const tmpl = new RegExp(`\\b${name}=\\{\`([^\`$]*)\`\\}`).exec(attrs);
  if (tmpl) return tmpl[1];
  return null;
}
function num(attrs, name) {
  const m = new RegExp(`\\b${name}=\\{(-?[\\d.]+)\\}`).exec(attrs);
  return m ? Number(m[1]) : null;
}

const tagRe = /<Pax([A-Za-z]*)(Row|Select)\b([\s\S]*?)(?:\/>|>)/g;
const seen = new Set();
const entries = [];

const FILE_TARGETS = [
  ...Object.entries(FILE_SECTION).map(([file, section]) => [file, section, null]),
  ...Object.entries(FILE_SECTION_SUBSECTION).map(([file, [section, sub]]) => [file, section, sub]),
];

for (const [file, section, subsection] of FILE_TARGETS) {
  const src = readFileSync(path.join(SETTINGS, file), "utf-8");
  let m;
  while ((m = tagRe.exec(src))) {
    const kind = m[1]; // Settings? Range/Toggle/Segmented/... or Hud (Select)
    const attrs = m[3];
    if (!/\bsettingConfigKey=/.test(attrs)) continue;
    const key = staticAttr(attrs, "settingConfigKey");
    if (!key || MANUAL.has(key) || seen.has(key)) continue;
    const label = staticAttr(attrs, "label") ?? staticAttr(attrs, "settingLabel");
    if (!label) continue;
    seen.add(key);
    const description =
      staticAttr(attrs, "description") ??
      staticAttr(attrs, "settingDescription") ??
      staticAttr(attrs, "hint") ??
      staticAttr(attrs, "note") ??
      undefined;

    let controlType = "custom";
    let range;
    if (/Range/.test(kind)) {
      const min = num(attrs, "min"), max = num(attrs, "max"), step = num(attrs, "step");
      if (min != null && max != null && step != null) {
        controlType = "range";
        range = { min, max, step };
      }
    } else if (/Toggle/.test(kind)) {
      controlType = "toggle";
    }
    entries.push({ configKey: key, section, subsection, label: label.trim(), description, controlType, range });
  }
}

// ── Merge, never truncate ───────────────────────────────────────────────────
//
// Extraction can only see controls that STILL have a `<Pax*Row settingConfigKey>`
// tag. Once a section migrates to SettingsControlRenderer its rows become
// `controlsFor([...])` lists and the tags are gone — at which point the registry
// entry IS the definition, and a naive regenerate would silently delete it and
// make the control vanish from the UI. (Measured: regenerating after the Travel,
// Battle, Conquest and Surge sections migrated dropped 19 live controls.)
//
// So the previous output is carried forward verbatim for any key extraction no
// longer finds, and re-extracted keys win — markup is ground truth while it
// exists. Deleting a control means deleting its entry here on purpose.
const OUT_FILE = path.join(SETTINGS, "settingsControlRegistry.generated.ts");
const previousLines = new Map();
try {
  const previous = readFileSync(OUT_FILE, "utf-8");
  for (const line of previous.split("\n")) {
    const key = /^\s*\{ configKey: "([^"]+)"/.exec(line)?.[1];
    if (key) previousLines.set(key, line.trimEnd());
  }
} catch { /* first run */ }

entries.sort((a, b) => (a.section + a.configKey).localeCompare(b.section + b.configKey));
const extractedLines = entries
  .map((e) => {
    const parts = [
      `configKey: ${JSON.stringify(e.configKey)}`,
      `section: ${JSON.stringify(e.section)}`,
      `subsection: ${JSON.stringify(e.subsection ?? null)}`,
      `label: ${JSON.stringify(e.label)}`,
    ];
    if (e.description) parts.push(`description: ${JSON.stringify(e.description)}`);
    parts.push(`controlType: ${JSON.stringify(e.controlType)}`);
    if (e.range) parts.push(`range: { min: ${e.range.min}, max: ${e.range.max}, step: ${e.range.step} }`);
    return [e.configKey, `  { ${parts.join(", ")} },`];
  });

const merged = new Map(previousLines);
for (const [key, line] of extractedLines) merged.set(key, line);
const carriedForward = [...previousLines.keys()].filter(
  (key) => !extractedLines.some(([extractedKey]) => extractedKey === key),
);
const body = [...merged.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, line]) => line)
  .join("\n");

const out = `// AUTO-GENERATED by tools/gen-settings-registry.mjs — DO NOT EDIT BY HAND.
// One section per source file; rendered label is ground truth (no drift).
import type { SettingsControl } from "./settingsControlRegistry";

export const GENERATED_CONTROLS: readonly SettingsControl[] = [
${body}
];
`;
writeFileSync(OUT_FILE, out, "utf-8");
console.log(
  `registry: ${merged.size} controls (${entries.length} extracted from markup, ` +
    `${carriedForward.length} carried forward from already-projected sections)`,
);
