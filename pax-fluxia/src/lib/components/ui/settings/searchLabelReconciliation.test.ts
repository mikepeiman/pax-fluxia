import { describe, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getSearchableSettingRecords } from "./settingMetadata";

/**
 * SEARCH ↔ RENDERED-CONTROL RECONCILIATION AUDIT.
 *
 * The search index (settingMetadata) is a hand-authored label→key map. The
 * settingsSearchIntegrity test proves each key EXISTS in GAME_CONFIG, but not
 * that a control is actually RENDERED for it, nor that the search LABEL matches
 * the label the user sees on the control. Both drift silently → "search finds a
 * result whose label isn't the real control / navigates to nothing".
 *
 * This audit statically extracts every rendered (settingConfigKey → label) pair
 * from the settings components and diffs it against the search index. It LOGS a
 * full report (drift / not-rendered / duplicate / missing) so the whole surface
 * can be fixed at once instead of one search term at a time.
 */

const SETTINGS_DIR = path.resolve(process.cwd(), "src/lib/components/ui/settings");
const EXTRA_FILES = [path.resolve(process.cwd(), "src/lib/components/ui/GameSettingsPanel.svelte")];

function componentFiles(): string[] {
    const inDir = readdirSync(SETTINGS_DIR)
        .filter((f) => f.endsWith(".svelte"))
        .map((f) => path.join(SETTINGS_DIR, f));
    return [...inDir, ...EXTRA_FILES];
}

/** static string value of an attribute (double/single quote or {`literal`}); null if dynamic. */
function staticAttr(attrs: string, name: string): string | null {
    const dq = new RegExp(`\\b${name}=\"([^\"]*)\"`).exec(attrs);
    if (dq) return dq[1];
    const sq = new RegExp(`\\b${name}='([^']*)'`).exec(attrs);
    if (sq) return sq[1];
    const braceStr = new RegExp(`\\b${name}=\\{\"([^\"]*)\"\\}`).exec(attrs);
    if (braceStr) return braceStr[1];
    const tmpl = new RegExp(`\\b${name}=\\{\`([^\`$]*)\`\\}`).exec(attrs); // template w/o ${}
    if (tmpl) return tmpl[1];
    return null; // {variable} / template with ${} → dynamic, skip
}

/** configKey → set of rendered labels seen for it. */
function extractRenderedControls(): {
    labelsByKey: Map<string, Set<string>>;
    dynamicKeyFiles: string[];
} {
    const labelsByKey = new Map<string, Set<string>>();
    const dynamicKeyFiles: string[] = [];
    const tagRe = /<Pax[A-Za-z]*(?:Row|Select)\b([\s\S]*?)(?:\/>|>)/g;

    for (const file of componentFiles()) {
        const src = readFileSync(file, "utf-8");
        let m: RegExpExecArray | null;
        while ((m = tagRe.exec(src))) {
            const attrs = m[1];
            if (!/\bsettingConfigKey=/.test(attrs)) continue;
            const key = staticAttr(attrs, "settingConfigKey");
            if (key == null) {
                dynamicKeyFiles.push(path.basename(file));
                continue;
            }
            const label =
                staticAttr(attrs, "label") ?? staticAttr(attrs, "settingLabel");
            if (label == null) continue;
            if (!labelsByKey.has(key)) labelsByKey.set(key, new Set());
            labelsByKey.get(key)!.add(label.trim());
        }
    }
    return { labelsByKey, dynamicKeyFiles };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

describe("search ↔ rendered-control reconciliation", () => {
    it("reports the full drift/dead/dup/missing diff", () => {
        const { labelsByKey, dynamicKeyFiles } = extractRenderedControls();
        const records = getSearchableSettingRecords().filter(
            (r) => !r.key.startsWith("local."),
        );

        // DUP: one config key surfaced under multiple distinct search labels.
        const searchLabelsByKey = new Map<string, Set<string>>();
        for (const r of records) {
            if (!searchLabelsByKey.has(r.key)) searchLabelsByKey.set(r.key, new Set());
            searchLabelsByKey.get(r.key)!.add(r.label.trim());
        }
        const dup = [...searchLabelsByKey.entries()]
            .filter(([, labels]) => labels.size > 1)
            .map(([key, labels]) => `${key}: ${[...labels].join(" | ")}`);

        // DRIFT: search label is not any rendered label for that key.
        const drift: string[] = [];
        const notRendered: string[] = [];
        for (const r of records) {
            const rendered = labelsByKey.get(r.key);
            if (!rendered || rendered.size === 0) {
                notRendered.push(`${r.key}  ("${r.label}")`);
                continue;
            }
            const rn = [...rendered].map(norm);
            if (!rn.includes(norm(r.label))) {
                drift.push(`${r.key}: search="${r.label}"  rendered=${[...rendered].map((l) => `"${l}"`).join(", ")}`);
            }
        }

        // MISSING: a rendered control with no search entry at all.
        const searched = new Set(records.map((r) => r.key));
        const missing = [...labelsByKey.keys()]
            .filter((k) => !searched.has(k))
            .map((k) => `${k}  (${[...labelsByKey.get(k)!].join(", ")})`);

        const report = [
            `\n===== SEARCH ↔ RENDERED RECONCILIATION =====`,
            `rendered static controls: ${labelsByKey.size} keys | search records: ${records.length}`,
            `\n-- DUPLICATE search labels for one key (${dup.length}) --\n${dup.join("\n")}`,
            `\n-- LABEL DRIFT: search label ≠ rendered label (${drift.length}) --\n${drift.join("\n")}`,
            `\n-- NOT RENDERED: search key has no static control (${notRendered.length}) --\n${notRendered.join("\n")}`,
            `\n-- MISSING: rendered control with no search entry (${missing.length}) --\n${missing.join("\n")}`,
            `\n(dynamic settingConfigKey in: ${[...new Set(dynamicKeyFiles)].join(", ")})`,
        ].join("\n");
        // eslint-disable-next-line no-console
        console.log(report);
    });
});
