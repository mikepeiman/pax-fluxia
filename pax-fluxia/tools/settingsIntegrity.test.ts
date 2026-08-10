/**
 * settingsIntegrity.test — CI gate for the structural settings rules.
 *
 * The repo's existing settings guards check the settings layer against ITSELF:
 * is a rendered key searchable, persistable, read by someone. They cannot see
 * the two failure modes that live in the CONSUMING code:
 *
 *   1. a second writer of a user-facing GAME_CONFIG key outside the apply layer
 *      (bypasses persistence + invalidation, races the store), and
 *   2. a config value captured into a module-scope const, so the setting is
 *      frozen at import and only takes effect after a reload.
 *
 * Both are expressed as ast-grep rules in tools/ast-grep/rules. This test runs
 * them and holds the line at the known baseline: the existing violations are
 * listed with a reason so the suite is green, and anything NEW fails.
 *
 * It gates BOTH halves of the codebase. The TypeScript rules glob `*.ts`, so
 * every component writing GAME_CONFIG from a Svelte script block used to be
 * invisible — including GameCanvas (the PixiJS host) and the whole MainMenu
 * setup cluster. The markup half runs the same rule over the TSX mirror
 * (tools/svelte-tsx) and maps back to .svelte paths and lines.
 *
 * Shrink BASELINE; never grow it. Run the rules directly with:
 *   bun run settings:lint     (TypeScript)
 *   bun run svelte:lint       (Svelte markup)
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { scanSvelte } from "./svelte-tsx/sg-svelte";

const REPO_ROOT = path.resolve(process.cwd(), "..");

/**
 * Known violations, as `rule | file | configKey` with the count at the time of
 * the 2026-08-10 audit and why each is still here.
 */
const BASELINE: Record<string, { count: number; why: string }> = {
    // ── Owned families ──────────────────────────────────────────────────────
    // audioManager is the SINGLE writer of the audio keys: every audio control
    // in both Settings and the menu calls audioManager.setMasterVolume /
    // toggleMute / setSeparateConquestSounds, and the rows carry
    // settingConfigKey only as a data attribute for search and telemetry.
    // GAME_CONFIG is the manager's mirror, and it has its own persistence
    // (AUDIO_STORAGE_KEY over CATEGORY_KEYS.audio). One owner, no race.
    "settings-write-outside-store|pax-fluxia/src/lib/services/audioManager.svelte.ts|AUDIO_MASTER_VOLUME":
        { count: 4, why: "audioManager owns the audio family; every UI path delegates to it" },
    "settings-write-outside-store|pax-fluxia/src/lib/services/audioManager.svelte.ts|AUDIO_MUTED":
        { count: 4, why: "as above" },
    "settings-write-outside-store|pax-fluxia/src/lib/services/audioManager.svelte.ts|AUDIO_SEPARATE_CONQUEST":
        { count: 3, why: "as above" },

    // activeGameStore owns BASE_TICK_MS: settingsStore.updateTickInterval
    // delegates to it rather than writing config itself.
    "settings-write-outside-store|pax-fluxia/src/lib/stores/activeGameStore.svelte.ts|BASE_TICK_MS":
        { count: 1, why: "sole owner; settingsStore.updateTickInterval delegates here" },

    // ── Canonicalisation in place ───────────────────────────────────────────
    // Not competing writes: each reads the key, normalises a legacy value, and
    // writes the canonical form back so downstream reads agree. Idempotent.
    "settings-write-outside-store|pax-fluxia/src/lib/components/game/GameCanvas.svelte|TERRITORY_RENDER_MODE":
        { count: 1, why: "normalises a legacy render-mode id in place" },
    "settings-write-outside-store|pax-fluxia/src/lib/components/game/GameCanvas.svelte|BG_IMAGE_URL":
        { count: 1, why: "normalises the background path in place" },

    // ── Deliberate override ─────────────────────────────────────────────────
    "settings-write-outside-store|pax-fluxia/src/lib/perf/benchmarkBridge.ts|TERRITORY_RENDER_MODE":
        { count: 1, why: "bench harness deliberately forces a render mode" },
};

interface Finding {
    ruleId: string;
    file: string;
    range: { start: { line: number } };
    metaVariables?: { single?: Record<string, { text: string }> };
}

function scan(): Finding[] {
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
        // Non-zero exit just means an error-severity rule matched.
        raw = (err as { stdout?: string }).stdout ?? "";
    }
    return raw.trim() ? (JSON.parse(raw) as Finding[]) : [];
}

/**
 * The Svelte half. Same rules, run over the TSX mirror and mapped back to
 * .svelte paths and lines, so a component writing GAME_CONFIG is gated exactly
 * like a .ts module. Normalised into the same shape as the TypeScript findings
 * (`settings-write-outside-store-markup` is the same defect as
 * `settings-write-outside-store`) so one baseline covers both.
 */
function scanMarkup(): Finding[] {
    return scanSvelte({ rebuild: true })
        .filter((finding) => finding.ruleId === "settings-write-outside-store-markup")
        .map((finding) => ({
            ruleId: "settings-write-outside-store",
            file: finding.file,
            range: { start: { line: finding.line - 1 } },
            metaVariables: { single: { KEY: { text: finding.captures.KEY ?? "" } } },
        }));
}

const identity = (f: Finding) =>
    `${f.ruleId}|${f.file.replace(/\\/g, "/")}|${f.metaVariables?.single?.KEY?.text ?? ""}`;

describe("settings integrity — structural rules", () => {
    const findings = [...scan(), ...scanMarkup()];

    it("the rule pack actually runs (guards against a silent config break)", () => {
        expect(findings.length).toBeGreaterThan(0);
    });

    it("no NEW second writer of a user-facing GAME_CONFIG key", () => {
        const counted = new Map<string, number>();
        for (const f of findings.filter((f) => f.ruleId === "settings-write-outside-store")) {
            const id = identity(f);
            counted.set(id, (counted.get(id) ?? 0) + 1);
        }
        const regressions: string[] = [];
        for (const [id, count] of counted) {
            const base = BASELINE[id];
            if (!base) regressions.push(`NEW: ${id} (${count}x)`);
            else if (count > base.count)
                regressions.push(`GREW: ${id} — ${base.count} -> ${count}`);
        }
        expect(
            regressions,
            `settings written outside the apply layer:\n${regressions.join("\n")}\n\nRoute the write through settingsStore/panelSync, or add it to BASELINE with a reason.`,
        ).toEqual([]);
    });

    it("no NEW setting frozen at import", () => {
        const regressions: string[] = [];
        for (const f of findings.filter((f) => f.ruleId === "settings-frozen-at-import")) {
            const id = identity(f);
            if (!BASELINE[id]) regressions.push(`NEW: ${id}:${f.range.start.line + 1}`);
        }
        expect(
            regressions,
            `config read into a module-scope const — the setting will not take effect until reload:\n${regressions.join("\n")}`,
        ).toEqual([]);
    });

    it("every BASELINE entry still exists (delete fixed ones)", () => {
        const present = new Set(findings.map(identity));
        const stale = Object.keys(BASELINE).filter((id) => !present.has(id));
        expect(
            stale,
            `BASELINE entries with no matching violation — the debt is paid, remove them:\n${stale.join("\n")}`,
        ).toEqual([]);
    });
});
