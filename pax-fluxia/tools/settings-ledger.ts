/**
 * settings-ledger — the machine-readable settings integrity ledger.
 *
 * Run:  bun tools/settings-ledger.ts            (from pax-fluxia/)
 *       bun run settings:ledger
 *
 * Emits one row per setting with the full evidence chain
 *
 *     Svelte control -> registry definition -> persisted value -> runtime reader
 *     -> owning subsystem (PixiJS renderer / shared sim / server) -> status
 *
 * and a ranked, batched ACTION list. Every column is derived from the code:
 * config defaults and registry entries come from importing the real modules
 * (not regex), render-shape comes from ast-grep over the Svelte markup, and
 * readers come from a whole-repo token scan of the consuming trees.
 *
 * Nothing here decides product questions. A runtime-only key is reported as a
 * CANDIDATE for exposure, never as a defect.
 *
 * Outputs (overwritten on every run):
 *   .agent/docs/game/design/2026-08-10_settings-audit/ledger.json
 *   .agent/docs/game/design/2026-08-10_settings-audit/ledger.csv
 *   .agent/docs/game/design/2026-08-10_settings-audit/FINDINGS.md
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { GAME_CONFIG } from "../src/lib/config/game.config";
import { CATEGORY_KEYS, EXCLUDED_FROM_CATEGORIES } from "../src/lib/config/categoryKeys";
import {
    PANEL_CONFIG_MAP,
    deriveInvalidations,
    derivePanelKey,
} from "../src/lib/components/ui/settingsDefs";
import { SETTINGS_CONTROLS } from "../src/lib/components/ui/settings/settingsControlRegistry";
import { SETTINGS_SECTIONS } from "../src/lib/components/ui/settings/settingsRegistry";
import { SETTINGS_PANELS } from "../src/lib/components/ui/settings/settingsPanels";
import { searchSettings } from "../src/lib/components/ui/settings/settingsSearch";
import { scanSvelte } from "./svelte-tsx/sg-svelte";
import { getSearchableSettingRecords } from "../src/lib/components/ui/settings/settingMetadata";

// ── Layout ──────────────────────────────────────────────────────────────────

const CLIENT_ROOT = path.resolve(process.cwd()); // pax-fluxia/
const REPO_ROOT = path.resolve(CLIENT_ROOT, "..");
const OUT_DIR = path.join(
    REPO_ROOT,
    ".agent/docs/game/design/2026-08-10_settings-audit",
);
const SETTINGS_DIR = path.join(CLIENT_ROOT, "src/lib/components/ui/settings");

/** Trees whose reads count as a real runtime EFFECT. */
const CONSUMER_ROOTS = [
    path.join(CLIENT_ROOT, "src/lib"),
    path.join(CLIENT_ROOT, "src/routes"),
    path.join(REPO_ROOT, "common/src"),
    path.join(REPO_ROOT, "pax-server/src"),
];

/**
 * The settings layer itself is NOT a consumer: a key listed in a render array,
 * a persistence map or a search record proves registration, not effect. This is
 * the distinction every earlier pass got wrong.
 */
function isSettingsLayer(file: string): boolean {
    return (
        file.startsWith(SETTINGS_DIR) ||
        /settingsDefs|settingsStore|settingsState|settingsTelemetry|categoryKeys|fullConfigPresets|configTransfer/.test(
            path.basename(file),
        )
    );
}
const isTest = (file: string) => /\.(test|spec)\.[tj]s$/.test(file) || /\.e2e\.ts$/.test(file);

/**
 * The config TREE declares defaults, types and themes. A key appearing there is
 * its definition, never evidence that anything consumes it — the same trap as
 * counting the settings layer.
 */
function isConfigDeclaration(file: string): boolean {
    return path
        .relative(REPO_ROOT, file)
        .replace(/\\/g, "/")
        .includes("src/lib/config/");
}

/** Which subsystem OWNS the effect, from the reader's path (reporting only). */
function subsystemOf(file: string): string {
    const rel = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
    if (rel.startsWith("common/src")) return "shared-sim";
    if (rel.startsWith("pax-server/src")) return "server";
    if (/src\/lib\/(renderers|territory|fx|lanes|animations)\//.test(rel)) return "pixi-render";
    if (/src\/lib\/components\/game\//.test(rel)) return "pixi-host";
    if (/src\/lib\/(engine|mechanics|actions)\//.test(rel)) return "client-engine";
    if (/src\/lib\/(audio|services|stores|workers|perf)\//.test(rel)) return "client-services";
    if (/src\/lib\/(utils|shell|editor|debug|design-system|bench|icons|site)\//.test(rel))
        return "client-support";
    if (/src\/(routes|lib\/components)\//.test(rel)) return "client-ui";
    // game.config.ts is not only declarations: it holds the transfer clamp and
    // the combat bridge, which read GAME_CONFIG like any other consumer.
    if (/src\/lib\/config\//.test(rel)) return "config-helper";
    return "other";
}

// ── File walk ───────────────────────────────────────────────────────────────

function walk(dir: string, acc: string[]): string[] {
    let entries: string[];
    try {
        entries = readdirSync(dir);
    } catch {
        return acc;
    }
    for (const entry of entries) {
        if (entry === "node_modules" || entry === ".svelte-kit" || entry === "_quarantine") continue;
        const full = path.join(dir, entry);
        let st: ReturnType<typeof statSync>;
        try {
            st = statSync(full);
        } catch {
            continue;
        }
        if (st.isDirectory()) walk(full, acc);
        else if (/\.(ts|js|svelte)$/.test(entry)) acc.push(full);
    }
    return acc;
}

// ── Pass 1: what the config actually declares ───────────────────────────────

const configKeys = Object.keys(GAME_CONFIG).sort();
const configKeySet = new Set(configKeys);
const defaults = Object.fromEntries(
    configKeys.map((k) => [k, (GAME_CONFIG as Record<string, unknown>)[k]]),
);
const typeOf = (v: unknown) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);

// ── Pass 2: registration surfaces ───────────────────────────────────────────

const controlsByKey = new Map<string, (typeof SETTINGS_CONTROLS)[number][]>();
for (const control of SETTINGS_CONTROLS) {
    const list = controlsByKey.get(control.configKey) ?? [];
    list.push(control);
    controlsByKey.set(control.configKey, list);
}

const persistedKeys = new Set(PANEL_CONFIG_MAP.map((m) => m.configKey));
const panelKeyOf = new Map(
    PANEL_CONFIG_MAP.map((m) => [m.configKey, m.panelKey ?? derivePanelKey(m.configKey)]),
);
const searchableKeys = new Set(getSearchableSettingRecords().map((r) => r.key));

const categoryOf = new Map<string, string>();
for (const [category, keys] of Object.entries(CATEGORY_KEYS)) {
    for (const key of keys) categoryOf.set(key, category);
}

const sectionMeta = new Map(SETTINGS_SECTIONS.map((s) => [s.id, s]));

// ── Pass 3: how the control RENDERS (ast-grep over the markup) ──────────────

type RenderShape = "projected" | "hand-rendered" | "dynamic-key" | "custom-widget" | "none";

/**
 * Markup findings, from the Svelte rule pack running over the TSX mirror
 * (tools/svelte-tsx). ast-grep has no Svelte grammar and parsing .svelte as HTML
 * recovers 2 of 75 controls — so the markup is re-emitted as TSX by Svelte's own
 * parser, line for line, and ast-grep's TSX engine scans that. Result: 219 of 219
 * controls, and structural rules over markup that a tag scan could never express.
 */
const svelteFindings = scanSvelte({ rebuild: true });

/** Hand-rendered rows: a literal settingConfigKey on a Pax* tag. */
function handRenderedKeys(): Map<string, string> {
    const found = new Map<string, string>();
    for (const finding of svelteFindings) {
        if (finding.ruleId !== "settings-control-key") continue;
        const key = finding.captures.KEY;
        if (key && !found.has(key)) found.set(key, path.basename(finding.file));
    }
    return found;
}

/**
 * Controls whose config key is BUILT at runtime — `settingConfigKey={`AUDIO_VOL_${type}`}`.
 * The whole per-sound audio surface is rendered this way, so treating only
 * literal keys as "exposed" reports three live families (AUDIO_VOL_*,
 * AUDIO_FILE_*, AUDIO_OFFSET_*) as settings the user cannot reach — when they
 * are sitting right there in the Audio section.
 *
 * Only the template-literal form is resolvable: a static prefix plus an
 * interpolation. `settingConfigKey={v.key}` cannot be resolved at all and is
 * reported by the rule as something to make declarative.
 */
function dynamicallyExposedPrefixes(): { prefix: string; at: string }[] {
    const out: { prefix: string; at: string }[] = [];
    for (const finding of svelteFindings) {
        if (finding.ruleId !== "settings-control-dynamic-key") continue;
        const prefix = /^`([A-Z][A-Z0-9_]*_)\$\{/.exec(finding.captures.EXPR ?? "")?.[1];
        if (prefix) out.push({ prefix, at: `${finding.file}:${finding.line}` });
    }
    return out;
}

/**
 * Projected rows: keys a section hands to SettingsControlRenderer.
 *
 * Sections name their keys in several shapes — an inline `controlsFor([...])`,
 * a `GROUPS` array of `{ label, keys: [...] }` iterated with `{#each}`, or a
 * plain `const KEYS = [...]`. Matching only the inline call misses whole
 * sections (Battle and AI render every one of their controls through a GROUPS
 * array). Since a section component exists solely to render controls, any
 * registry key quoted in a projecting section IS rendered by it.
 */
function projectedKeys(): Map<string, string> {
    const found = new Map<string, string>();
    const registryKeys = new Set(SETTINGS_CONTROLS.map((c) => c.configKey));
    for (const file of walk(SETTINGS_DIR, []).filter((f) => f.endsWith(".svelte"))) {
        const src = readFileSync(file, "utf-8");
        if (!/SettingsControlRenderer/.test(src)) continue;
        for (const lit of src.matchAll(/["']([A-Za-z0-9_.]+)["']/g)) {
            const key = lit[1]!;
            if (registryKeys.has(key) && !found.has(key)) found.set(key, path.basename(file));
        }
    }
    return found;
}

/**
 * Config keys read through a CONSTRUCTED name — `GAME_CONFIG[`AUDIO_FILE_${x}`]`.
 * A token scan cannot see these: the key never appears as a literal in the
 * consumer. Without this pass the whole AUDIO_FILE_* family reads as dead.
 * Collect the literal prefixes used in dynamic key construction and treat any
 * config key carrying one as dynamically read.
 */
function dynamicKeyPrefixes(): { prefix: string; at: string }[] {
    const out: { prefix: string; at: string }[] = [];
    const RE = /[`'"]([A-Z][A-Z0-9_]*_)\$\{/g;
    for (const root of CONSUMER_ROOTS) {
        for (const file of walk(root, [])) {
            // The settings layer builds key names dynamically too (the audio
            // section loops sound types to label its cards). That is
            // registration, not consumption — counting it would resurrect every
            // AUDIO_* key as "read".
            if (isTest(file) || isConfigDeclaration(file) || isSettingsLayer(file)) continue;
            const src = readFileSync(file, "utf-8");
            for (const m of src.matchAll(RE)) {
                const line = src.slice(0, m.index).split("\n").length;
                out.push({
                    prefix: m[1]!,
                    at: `${path.relative(REPO_ROOT, file).replace(/\\/g, "/")}:${line}`,
                });
            }
        }
    }
    return out;
}

/**
 * Structural TypeScript findings, from the ast-grep rule pack. These answer the
 * two questions a key-name grep cannot: is this setting FROZEN at import (read
 * once into a module-scope const, so writes never take effect until reload), and
 * does a SECOND WRITER outside the settings apply layer race the store?
 */
function astGrepFindings(): Map<string, { rule: string; at: string }[]> {
    const byKey = new Map<string, { rule: string; at: string }[]>();
    const bin = path.join(
        REPO_ROOT,
        "node_modules/.bin",
        process.platform === "win32" ? "ast-grep.exe" : "ast-grep",
    );
    let raw = "";
    try {
        raw = execFileSync(bin, ["scan", "-c", path.join(REPO_ROOT, "sgconfig.yml"), "--json=compact"], {
            encoding: "utf-8",
            maxBuffer: 128 * 1024 * 1024,
            cwd: REPO_ROOT,
        });
    } catch (err) {
        // ast-grep exits non-zero when any error-severity rule matches; the JSON
        // is still on stdout and those matches are exactly what we want.
        raw = (err as { stdout?: string }).stdout ?? "";
    }
    if (!raw.trim()) return byKey;
    let matches: Array<{
        ruleId: string;
        file: string;
        range: { start: { line: number } };
        metaVariables?: { single?: Record<string, { text: string }> };
    }>;
    try {
        matches = JSON.parse(raw);
    } catch {
        return byKey;
    }
    for (const m of matches) {
        const key = m.metaVariables?.single?.KEY?.text;
        if (!key) continue;
        const at = `${m.file.replace(/\\/g, "/")}:${m.range.start.line + 1}`;
        const list = byKey.get(key) ?? [];
        list.push({ rule: m.ruleId, at });
        byKey.set(key, list);
    }
    return byKey;
}

const handRendered = handRenderedKeys();
const dynamicExposure = dynamicallyExposedPrefixes();
const projected = projectedKeys();
const structural = astGrepFindings();

// The markup rule pack finds second writers the TypeScript rules cannot reach:
// their globs are `*.ts`, so every component writing GAME_CONFIG from a script
// block was invisible — including GameCanvas.svelte, the PixiJS host.
for (const finding of svelteFindings) {
    if (finding.ruleId !== "settings-write-outside-store-markup") continue;
    const key = finding.captures.KEY;
    if (!key) continue;
    const list = structural.get(key) ?? [];
    list.push({ rule: "settings-write-outside-store", at: `${finding.file}:${finding.line}` });
    structural.set(key, list);
}

/** Controls reached through a runtime-built key, resolved by static prefix. */
const dynamicKeySite = (key: string): string | null =>
    dynamicExposure.find((entry) => key.startsWith(entry.prefix))?.at ?? null;

function renderShapeOf(key: string): RenderShape {
    if (projected.has(key)) return "projected";
    if (handRendered.has(key)) return "hand-rendered";
    if (dynamicKeySite(key)) return "dynamic-key";
    if (controlsByKey.get(key)?.some((c) => c.custom || c.controlType === "custom"))
        return "custom-widget";
    return "none";
}

// ── Pass 4: who READS each key (the effect evidence) ────────────────────────

// The leading `_?` matters: runtime-derived internals are named `_MAP_WIDTH`,
// and a `[A-Z]`-anchored token would never match them (the underscore is a word
// character, so there is no word boundary before `MAP`). Without it the whole
// `_MAP_*` family reports as unread when gameStore writes it every layout pass.
const TOKEN_RE = /\b_?[A-Z][A-Z0-9_]{2,}\b/g;

type Reader = { file: string; line: number; subsystem: string };
const readers = new Map<string, Reader[]>();
const registrationOnly = new Map<string, Reader[]>();

const scanned = new Set<string>();
for (const root of CONSUMER_ROOTS) {
    for (const file of walk(root, [])) {
        if (scanned.has(file)) continue;
        scanned.add(file);
        if (isTest(file)) continue;
        const inConfigTree = isConfigDeclaration(file);
        const isReg = isSettingsLayer(file);
        const lines = readFileSync(file, "utf-8").split("\n");
        const seenHere = new Set<string>();
        for (let i = 0; i < lines.length; i++) {
            const text = lines[i]!;
            for (const m of text.matchAll(TOKEN_RE)) {
                const token = m[0]!;
                if (!configKeySet.has(token)) continue;
                // Inside the config tree the same token is usually the DECLARATION
                // (`FOO: 3`) or a theme's key list. Only an explicit GAME_CONFIG
                // member access there is a read — game.config.ts holds real helper
                // functions (the transfer clamp reads MAX_SHIPS_PER_TRANSFER), so
                // skipping the tree wholesale invents dead knobs.
                if (
                    inConfigTree &&
                    !new RegExp(`GAME_CONFIG(\\.${token}\\b|\\[["']${token}["']\\])`).test(text)
                )
                    continue;
                const dedupe = `${token}@${i}`;
                if (seenHere.has(dedupe)) continue;
                seenHere.add(dedupe);
                const entry: Reader = {
                    file: path.relative(REPO_ROOT, file).replace(/\\/g, "/"),
                    line: i + 1,
                    subsystem: subsystemOf(file),
                };
                const bucket = isReg ? registrationOnly : readers;
                const list = bucket.get(token) ?? [];
                list.push(entry);
                bucket.set(token, list);
            }
        }
    }
}

/**
 * Every read outside the settings layer and the config declarations counts as an
 * effect. An allowlist of "real" subsystems looked rigorous and was simply wrong:
 * it scored GameCanvas.svelte (the PixiJS host) and utils/render.utils.ts as
 * non-consumers, which turned live knobs into false "dead" reports.
 */
/**
 * Some settings never reach their effect through the config key at all: the
 * control writes the PANEL mirror and the machinery reads `panel.bindAnimToTick`
 * or `panel.starSystemScale`. Those keys are alive, but only inside the settings
 * layer — a real category ("settings-machinery"), not a dead knob and not a
 * renderer-consumed setting. Reading the config key alone mislabels them.
 */
function panelMirrorReaders(): Map<string, Reader[]> {
    const wanted = new Map<string, string>(); // panelKey -> configKey
    for (const [configKey, panelKey] of panelKeyOf) {
        if (panelKey) wanted.set(panelKey, configKey);
    }
    const out = new Map<string, Reader[]>();
    for (const file of scanned) {
        if (isTest(file) || isConfigDeclaration(file)) continue;
        const lines = readFileSync(file, "utf-8").split("\n");
        for (let i = 0; i < lines.length; i++) {
            for (const m of lines[i]!.matchAll(/\bpanel\.([A-Za-z0-9_]+)\b/g)) {
                const configKey = wanted.get(m[1]!);
                if (!configKey) continue;
                const list = out.get(configKey) ?? [];
                list.push({
                    file: path.relative(REPO_ROOT, file).replace(/\\/g, "/"),
                    line: i + 1,
                    subsystem: isSettingsLayer(file) ? "settings-machinery" : subsystemOf(file),
                });
                out.set(configKey, list);
            }
        }
    }
    return out;
}

const panelReaders = panelMirrorReaders();
const dynamicPrefixes = dynamicKeyPrefixes();
const dynamicReadOf = (key: string) =>
    dynamicPrefixes.filter((p) => key.startsWith(p.prefix));
const effectReaders = (key: string) => readers.get(key) ?? [];

// ── Pass 5: classify + recommend ────────────────────────────────────────────

type Status =
    | "live"
    | "half-wired"
    | "startup-only"
    | "settings-machinery"
    | "unregistered-control"
    | "disconnected"
    | "duplicate"
    | "runtime-only"
    | "orphan-config"
    | "dead-ui"
    | "uncertain";

interface Row {
    key: string;
    default: unknown;
    valueType: string;
    hasControl: boolean;
    controlCount: number;
    controlType: string | null;
    label: string | null;
    section: string | null;
    subsection: string | null;
    category: string | null;
    excludedFromCategories: boolean;
    renderShape: RenderShape;
    renderedIn: string | null;
    persisted: boolean;
    panelKey: string | null;
    searchable: boolean;
    invalidates: string[];
    effectOwners: string[];
    readerCount: number;
    topReaders: string[];
    frozenAt: string[];
    secondWriters: string[];
    status: Status;
    issues: string[];
    action: string;
}

const rows: Row[] = [];
const allKeys = new Set<string>([...configKeys, ...controlsByKey.keys()]);

for (const key of [...allKeys].sort()) {
    const controls = controlsByKey.get(key) ?? [];
    const control = controls[0];
    /**
     * A key is EXPOSED if the user can reach a control for it — whether or not
     * the registry knows about it. The registry is still mid-migration (its own
     * header says "seeded"), so registry membership alone reports whole rendered
     * families (every CELL_GRID_* knob in CellGridTuning) as "runtime-only" when
     * the user is looking straight at them.
     */
    const dynamicSite = dynamicKeySite(key);
    const rendered = handRendered.has(key) || Boolean(dynamicSite);
    const exposed = Boolean(control) || rendered;
    const inConfig = configKeySet.has(key);
    const localOnly = key.startsWith("local.");
    const effects = effectReaders(key);
    const dynamic = dynamicReadOf(key);
    const mirror = panelReaders.get(key) ?? [];
    const owners = [
        ...new Set([...effects, ...mirror].map((r) => r.subsystem)),
    ].sort();
    if (dynamic.length > 0 && !owners.includes("dynamic")) owners.push("dynamic");
    const readCount = effects.length + dynamic.length + mirror.length;
    /** Alive, but the only reader is the settings layer reading the panel mirror. */
    const machineryOnly =
        effects.length === 0 &&
        dynamic.length === 0 &&
        mirror.length > 0 &&
        mirror.every((r) => r.subsystem === "settings-machinery");
    const shape = renderShapeOf(key);
    const issues: string[] = [];

    if (controls.length > 1) issues.push(`registry declares this key ${controls.length}x`);
    if (exposed && !inConfig && !localOnly)
        issues.push("control writes a key that GAME_CONFIG does not declare");
    if (control && inConfig && !persistedKeys.has(key))
        issues.push("not in PANEL_CONFIG_MAP — value is not persisted");
    if (control && !searchableKeys.has(key) && !localOnly)
        issues.push("absent from the search index — unfindable via search");
    if (control && inConfig && !categoryOf.has(key) && !EXCLUDED_FROM_CATEGORIES.has(key))
        issues.push("in no CATEGORY_KEYS bucket — presets/themes will not carry it");
    if (control && shape === "none")
        issues.push("registry entry renders through no component (no projection, no row)");
    if (control && readCount === 0 && !localOnly)
        issues.push("NO consuming code reads this key — moving the control does nothing");
    if (control && machineryOnly)
        issues.push(
            `reaches its effect only through the panel mirror \`panel.${panelKeyOf.get(key)}\` inside the settings layer — verify the effect by hand`,
        );

    const frozen = (structural.get(key) ?? []).filter((f) => f.rule === "settings-frozen-at-import");
    const secondWriters = (structural.get(key) ?? []).filter(
        (f) => f.rule === "settings-write-outside-store",
    );
    if (frozen.length > 0)
        issues.push(
            `read into a module-scope const at ${frozen[0]!.at} — frozen at import, changes need a reload`,
        );
    if (secondWriters.length > 0)
        issues.push(
            `written outside the settings apply layer (${secondWriters.length}x, e.g. ${secondWriters[0]!.at}) — races the store`,
        );

    // Type / range sanity against the real default.
    if (control && inConfig) {
        const def = defaults[key];
        const t = typeOf(def);
        if (control.controlType === "range" && t !== "number")
            issues.push(`range control over a ${t} default (${JSON.stringify(def)})`);
        if (control.controlType === "toggle" && t !== "boolean")
            issues.push(`toggle control over a ${t} default (${JSON.stringify(def)})`);
        if (control.controlType === "range" && control.range && t === "number") {
            const shown = (def as number) * (control.scale ?? 1);
            if (shown < control.range.min || shown > control.range.max)
                issues.push(
                    `default ${shown} sits outside the slider range ${control.range.min}..${control.range.max}`,
                );
        }
        if (
            (control.controlType === "segmented" || control.controlType === "select") &&
            control.options
        ) {
            const values = control.options.map((o) => (typeof o === "string" ? o : o.value));
            if (typeof def === "string" && !values.includes(def))
                issues.push(`default "${def}" is not one of the offered options`);
        }
    }

    let status: Status;
    if (rendered && !control) issues.push("rendered control with NO settingsControlRegistry entry");

    if (exposed && !inConfig && !localOnly) status = "dead-ui";
    else if (controls.length > 1) status = "duplicate";
    else if (exposed && readCount === 0 && !localOnly) status = "disconnected";
    else if (exposed && frozen.length > 0) status = "startup-only";
    else if (exposed && machineryOnly) status = "settings-machinery";
    else if (rendered && !control) status = "unregistered-control";
    else if (control && issues.length > 0) status = "half-wired";
    else if (control) status = "live";
    else if (readCount > 0) status = "runtime-only";
    else if (inConfig) status = "orphan-config";
    else status = "uncertain";

    let action: string;
    switch (status) {
        case "dead-ui":
            action = "REMOVE the control (or add the missing config key)";
            break;
        case "duplicate":
            action = "MERGE onto one canonical home; delete the other entry";
            break;
        case "disconnected":
            action = "DECIDE: wire it to its subsystem, or remove the control + the key";
            break;
        case "unregistered-control":
            action = `REGISTER — add to settingsControlRegistry (rendered in ${handRendered.get(key) ?? dynamicSite})`;
            break;
        case "settings-machinery":
            action = "VERIFY BY HAND — effect flows through the panel mirror, not the config key";
            break;
        case "startup-only":
            action = `RECONNECT — move the read at ${frozen[0]!.at} inside the using function`;
            break;
        case "half-wired":
            action = "RECONNECT — " + issues[0];
            break;
        case "runtime-only":
            action = `CANDIDATE — read by ${owners.join("/")}, no control (product call)`;
            break;
        case "orphan-config":
            action = "REMOVE the config key — nothing declares it and nothing reads it";
            break;
        case "live":
            action = "KEEP";
            break;
        default:
            action = "INVESTIGATE";
    }

    rows.push({
        key,
        default: inConfig ? defaults[key] : null,
        valueType: inConfig ? typeOf(defaults[key]) : "n/a",
        hasControl: exposed,
        controlCount: controls.length,
        controlType: control?.controlType ?? null,
        label: control?.label ?? null,
        section: control?.section ?? null,
        subsection: control?.subsection ?? null,
        category: categoryOf.get(key) ?? null,
        excludedFromCategories: EXCLUDED_FROM_CATEGORIES.has(key),
        renderShape: shape,
        renderedIn: projected.get(key) ?? handRendered.get(key) ?? dynamicSite,
        persisted: persistedKeys.has(key),
        panelKey: panelKeyOf.get(key) ?? null,
        searchable: searchableKeys.has(key),
        invalidates: [...deriveInvalidations(key)],
        effectOwners: owners,
        readerCount: readCount,
        topReaders: [...effects.slice(0, 4).map((r) => `${r.file}:${r.line}`), ...dynamic.slice(0, 2).map((d) => `${d.at} (dynamic ${d.prefix}*)`)],
        frozenAt: frozen.map((f) => f.at),
        secondWriters: secondWriters.map((f) => f.at),
        status,
        issues,
        action,
    });
}

// ── Cross-cutting findings ──────────────────────────────────────────────────

const duplicateLabels: string[] = [];
const bySectionLabel = new Map<string, string[]>();
for (const control of SETTINGS_CONTROLS) {
    const id = `${control.section}::${control.label.toLowerCase()}`;
    const list = bySectionLabel.get(id) ?? [];
    list.push(control.configKey);
    bySectionLabel.set(id, list);
}
for (const [id, keys] of bySectionLabel) {
    if (keys.length > 1) duplicateLabels.push(`${id} → ${keys.join(", ")}`);
}

const emptySections = SETTINGS_SECTIONS.filter(
    (s) => !SETTINGS_CONTROLS.some((c) => c.section === s.id),
).map((s) => s.id);

/**
 * Panel findability must be asked of `searchSettings`, not of the settingMetadata
 * record list. There are TWO indexes: settingMetadata covers individual settings,
 * and settingsSearch indexes SETTINGS_PANELS separately (the 2026-08-08 utility-
 * drawer fix). Checking the wrong one reports all eight drawers as unfindable
 * when every one of them resolves on its own label.
 */
const panelsMissingSearch = SETTINGS_PANELS.filter(
    (p) => !searchSettings(p.label, 24).some((hit) => JSON.stringify(hit).includes(p.id)),
).map((p) => p.id);

const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
}, {});

// ── Emit ────────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

const ledger = {
    generatedAt: new Date().toISOString(),
    generator: "pax-fluxia/tools/settings-ledger.ts",
    totals: {
        configKeys: configKeys.length,
        registryControls: SETTINGS_CONTROLS.length,
        distinctControlKeys: controlsByKey.size,
        persistedKeys: persistedKeys.size,
        searchableKeys: searchableKeys.size,
        rows: rows.length,
    },
    statusCounts: counts,
    crossCutting: { duplicateLabels, emptySections, panelsMissingSearch },
    rows,
};
writeFileSync(path.join(OUT_DIR, "ledger.json"), JSON.stringify(ledger, null, 2), "utf-8");

const csvCols = [
    "key",
    "status",
    "action",
    "valueType",
    "default",
    "label",
    "section",
    "subsection",
    "category",
    "renderShape",
    "renderedIn",
    "persisted",
    "searchable",
    "readerCount",
    "effectOwners",
    "issues",
] as const;
const csvCell = (v: unknown) =>
    `"${String(Array.isArray(v) ? v.join(" | ") : (v ?? "")).replace(/"/g, '""')}"`;
writeFileSync(
    path.join(OUT_DIR, "ledger.csv"),
    [
        csvCols.join(","),
        ...rows.map((r) => csvCols.map((c) => csvCell((r as never)[c])).join(",")),
    ].join("\n"),
    "utf-8",
);

// FINDINGS.md — the action list, ordered by what to do first.
const md: string[] = [];
const bucket = (status: Status) => rows.filter((r) => r.status === status);
const table = (list: Row[], cols: string[], pick: (r: Row) => string[]) =>
    [`| ${cols.join(" | ")} |`, `| ${cols.map(() => "---").join(" | ")} |`, ...list.map((r) => `| ${pick(r).join(" | ")} |`)].join("\n");

md.push(`# Settings audit — findings (generated)

> Machine-generated by \`pax-fluxia/tools/settings-ledger.ts\`. Re-run after every batch:
> \`bun run settings:ledger\`. Full data: \`ledger.json\` / \`ledger.csv\`.
> Generated ${ledger.generatedAt}.

**Scale:** ${configKeys.length} GAME_CONFIG keys · ${SETTINGS_CONTROLS.length} registry controls (${controlsByKey.size} distinct keys) · ${persistedKeys.size} persisted · ${searchableKeys.size} searchable.

**Status split:** ${Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `\`${k}\` ${v}`)
        .join(" · ")}
`);

const sections: Array<[string, Status, string]> = [
    ["1. Dead UI — control writes a key the config does not declare", "dead-ui", "Highest severity: the control cannot work at all."],
    ["2. Disconnected — a control nothing reads", "disconnected", "The knob moves; no code consumes the value. Wire it or delete it."],
    ["3. Duplicate — one key, several registry entries", "duplicate", "Pick one canonical home; delete the rest."],
    ["4. Startup-only — the value is frozen at import", "startup-only", "The control writes the config, but the reader captured the value once at module load. Nothing changes until reload."],
    ["5. Half-wired — a live control missing a wiring leg", "half-wired", "Persistence, search or preset-category coverage is missing."],
    ["6. Unregistered control — rendered, but the registry has never heard of it", "unregistered-control", "The user can move this knob, yet it is outside the single source of truth: its label, its search text and its persisted key are maintained in three separate places and drift independently. This is the remaining registry-migration surface."],
    ["7. Orphan config — declared, unread, unexposed", "orphan-config", "Nothing declares a control and nothing reads it. Safe removal candidates."],
    ["8. Runtime-only — read by code, no control", "runtime-only", "CANDIDATES ONLY. Whether these should become settings is a product call."],
];

for (const [title, status, blurb] of sections) {
    const list = bucket(status);
    md.push(`\n## ${title} — ${list.length}\n\n${blurb}\n`);
    if (list.length === 0) {
        md.push("_None._\n");
        continue;
    }
    if (status === "runtime-only" || status === "orphan-config" || status === "unregistered-control") {
        md.push(
            table(list, ["Key", "Type", "Default", "Read by", "Where"], (r) => [
                `\`${r.key}\``,
                r.valueType,
                `\`${JSON.stringify(r.default)}\``,
                r.effectOwners.join(", ") || "—",
                r.topReaders[0] ?? "—",
            ]),
        );
    } else {
        md.push(
            table(list, ["Key", "Label", "Section", "Issue", "Action"], (r) => [
                `\`${r.key}\``,
                r.label ?? "—",
                r.section ?? "—",
                r.issues.join("; ") || "—",
                r.action,
            ]),
        );
    }
    md.push("");
}

md.push(`\n## 7. Cross-cutting\n`);
md.push(`**Duplicate labels inside one section** (${duplicateLabels.length}) — same visible name, different keys:\n`);
md.push(duplicateLabels.length ? duplicateLabels.map((d) => `- ${d}`).join("\n") : "_None._");
md.push(`\n**Sections with no registry control** (${emptySections.length}):\n`);
md.push(emptySections.length ? emptySections.map((s) => `- \`${s}\``).join("\n") : "_None._");
md.push(`\n**Utility panels absent from the search index** (${panelsMissingSearch.length}):\n`);
md.push(panelsMissingSearch.length ? panelsMissingSearch.map((s) => `- \`${s}\``).join("\n") : "_None._");

md.push(`\n## 8. Render-shape coverage (registry migration)\n`);
const shapeCounts = rows
    .filter((r) => r.hasControl)
    .reduce<Record<string, number>>((acc, r) => {
        acc[r.renderShape] = (acc[r.renderShape] ?? 0) + 1;
        return acc;
    }, {});
md.push(
    Object.entries(shapeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([shape, n]) => `- \`${shape}\` — ${n}`)
        .join("\n"),
);
md.push(
    `\nControls still rendered by hand are the remaining migration surface: each one is a place where the rendered label, the search text and the persisted key can drift apart independently.\n`,
);

writeFileSync(path.join(OUT_DIR, "FINDINGS.md"), md.join("\n"), "utf-8");

console.log(`ledger: ${rows.length} rows -> ${path.relative(REPO_ROOT, OUT_DIR)}`);
console.log(
    Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `  ${k.padEnd(14)} ${v}`)
        .join("\n"),
);
