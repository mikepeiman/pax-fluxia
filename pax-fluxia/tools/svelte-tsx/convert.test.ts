/**
 * convert.test — the two properties the Svelte→TSX bridge has to hold.
 *
 * 1. LINE FIDELITY. Every generated file has exactly as many lines as its
 *    source, and each construct sits on its original line. Everything
 *    downstream (the ledger, sg-svelte's reporting) trusts that a hit at
 *    generated line N is a hit at source line N, with no source map.
 *
 * 2. RECALL. The conversion loses no settings control. This is the property the
 *    HTML-grammar approach failed catastrophically (2 of 75 in one file), so it
 *    is asserted against an independent ground truth: a plain text scan of the
 *    original .svelte files. If ast-grep sees fewer controls than a regex does,
 *    the bridge is broken and every rule built on it is lying.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { svelteToTsx } from "./convert";
import { build, mirrorPathFor, sourcePathFor, svelteFiles } from "./build";
import { scanSvelte } from "./sg-svelte";

const CLIENT_ROOT = process.cwd();
const SRC = path.join(CLIENT_ROOT, "src");

describe("svelte -> tsx conversion", () => {
    const files = svelteFiles(SRC);

    it("finds the .svelte tree", () => {
        expect(files.length).toBeGreaterThan(50);
    });

    it("preserves the line count of every file", () => {
        const drifted: string[] = [];
        for (const file of files) {
            const source = readFileSync(file, "utf-8");
            const expected = source.split("\n").length;
            const actual = svelteToTsx(source, file).lineCount;
            if (actual !== expected) {
                drifted.push(`${path.relative(SRC, file)}: ${expected} -> ${actual}`);
            }
        }
        expect(drifted, `line count changed:\n${drifted.join("\n")}`).toEqual([]);
    });

    it("converts every file without throwing", () => {
        const result = build(CLIENT_ROOT);
        expect(
            result.failed.map((f) => `${path.relative(SRC, f.file)}: ${f.error}`),
            "files the Svelte parser or the emitter rejected",
        ).toEqual([]);
        expect(result.converted).toBe(files.length);
    });

    it("round-trips mirror paths", () => {
        const file = files[0]!;
        expect(sourcePathFor(CLIENT_ROOT, mirrorPathFor(CLIENT_ROOT, file))).toBe(file);
    });
});

describe("ast-grep over the mirror", () => {
    /** Ground truth: what a plain text scan sees in the ORIGINAL .svelte files. */
    function literalControlKeys(): { total: number; distinct: Set<string> } {
        const distinct = new Set<string>();
        let total = 0;
        for (const file of svelteFiles(path.join(SRC, "lib/components"))) {
            const source = readFileSync(file, "utf-8");
            // `[^"]+`, not a character class of "expected" key characters: one
            // real control is keyed `local.playerPalette.nudges[selected]`, and
            // a `[A-Za-z0-9_.]+` ground truth silently misses it — which is how
            // the ledger's original tag scan lost it too.
            for (const match of source.matchAll(/settingConfigKey="([^"]+)"/g)) {
                distinct.add(match[1]!);
                total += 1;
            }
        }
        return { total, distinct };
    }

    const findings = scanSvelte({ rebuild: true });
    const controlHits = findings.filter((f) => f.ruleId === "settings-control-key");

    it("recovers EVERY literal settings control (the HTML grammar recovered 2 of 75)", () => {
        const truth = literalControlKeys();
        expect(controlHits.length).toBe(truth.total);
        expect(new Set(controlHits.map((f) => f.captures.KEY))).toEqual(truth.distinct);
    });

    it("reports hits at real .svelte paths, on lines that contain the control", () => {
        const misplaced: string[] = [];
        const cache = new Map<string, string[]>();
        for (const finding of controlHits.slice(0, 60)) {
            const file = path.join(CLIENT_ROOT, "..", finding.file);
            if (!cache.has(file)) cache.set(file, readFileSync(file, "utf-8").split(/\r?\n/));
            const lines = cache.get(file)!;
            // A control's reported line is the line its TAG opens on; the key
            // itself may sit a few lines below in a multi-line tag.
            const window = lines.slice(finding.line - 1, finding.line + 40).join("\n");
            if (!window.includes(`settingConfigKey="${finding.captures.KEY}"`)) {
                misplaced.push(`${finding.file}:${finding.line} ${finding.captures.KEY}`);
            }
        }
        expect(misplaced, `hit lines that do not open the matching control:\n${misplaced.join("\n")}`).toEqual([]);
    });

    it("resolves the dynamically-keyed audio controls the literal scan cannot see", () => {
        const dynamic = findings.filter((f) => f.ruleId === "settings-control-dynamic-key");
        const prefixes = dynamic
            .map((f) => /^`([A-Z][A-Z0-9_]*_)\$\{/.exec(f.captures.EXPR ?? "")?.[1])
            .filter(Boolean);
        expect(prefixes).toContain("AUDIO_FILE_");
        expect(prefixes).toContain("AUDIO_VOL_");
    });
});
