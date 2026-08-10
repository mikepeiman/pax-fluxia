/**
 * sg-svelte — run ast-grep rules over Svelte markup and report .svelte locations.
 *
 * Run:  bun run svelte:lint            (pretty)
 *       bun run svelte:lint --json     (machine-readable)
 *       bun tools/svelte-tsx/sg-svelte.ts --no-build   (reuse the existing mirror)
 *
 * Rebuilds the TSX mirror, scans it with `sgconfig.svelte.yml`, then maps every
 * hit back to the original .svelte path and line. Line numbers are exact by
 * construction (the mirror is line-for-line); columns are not, so the original
 * source line is re-read and reported as evidence instead of a column offset.
 *
 * Exit code is 1 if any error-severity rule matched, so it works as a CI gate.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { MIRROR_DIR, build, sourcePathFor } from "./build";

export interface SvelteFinding {
    ruleId: string;
    severity: string;
    /** Repo-relative path of the ORIGINAL .svelte file. */
    file: string;
    /** 1-based line in the original .svelte file. */
    line: number;
    /** The original source line, trimmed — the mirror's columns do not map. */
    sourceLine: string;
    message: string;
    /** Captured metavariables (KEY, EXPR, COMPONENT, …). */
    captures: Record<string, string>;
}

interface RawMatch {
    ruleId: string;
    severity?: string;
    message?: string;
    file: string;
    range: { start: { line: number } };
    metaVariables?: { single?: Record<string, { text: string }> };
}

const CLIENT_ROOT = process.cwd();
const REPO_ROOT = path.resolve(CLIENT_ROOT, "..");

function astGrepBinary(): string {
    return path.join(
        REPO_ROOT,
        "node_modules/.bin",
        process.platform === "win32" ? "ast-grep.exe" : "ast-grep",
    );
}

export function scanSvelte(options: { rebuild?: boolean } = {}): SvelteFinding[] {
    if (options.rebuild !== false) {
        const result = build(CLIENT_ROOT);
        if (result.failed.length > 0) {
            for (const failure of result.failed) {
                console.error(`svelte->tsx FAILED ${failure.file}: ${failure.error}`);
            }
            throw new Error(`${result.failed.length} .svelte file(s) could not be converted`);
        }
    }

    let raw = "";
    try {
        raw = execFileSync(
            astGrepBinary(),
            [
                "scan",
                "-c",
                path.join(REPO_ROOT, "sgconfig.svelte.yml"),
                // The mirror is a gitignored dot-directory; ast-grep skips both
                // by default, so both ignore layers have to be turned off.
                "--no-ignore",
                "dot",
                "--no-ignore",
                "vcs",
                "--json=compact",
                path.join(CLIENT_ROOT, MIRROR_DIR),
            ],
            { encoding: "utf-8", maxBuffer: 256 * 1024 * 1024, cwd: REPO_ROOT },
        );
    } catch (error) {
        // Non-zero exit only means an error-severity rule matched.
        raw = (error as { stdout?: string }).stdout ?? "";
    }
    if (!raw.trim()) return [];

    const matches = JSON.parse(raw) as RawMatch[];
    const sourceCache = new Map<string, string[]>();

    return matches.map((match) => {
        const sourceFile = sourcePathFor(CLIENT_ROOT, match.file);
        if (!sourceCache.has(sourceFile)) {
            try {
                sourceCache.set(sourceFile, readFileSync(sourceFile, "utf-8").split(/\r?\n/));
            } catch {
                sourceCache.set(sourceFile, []);
            }
        }
        const line = match.range.start.line; // ast-grep is 0-based
        const captures: Record<string, string> = {};
        for (const [name, value] of Object.entries(match.metaVariables?.single ?? {})) {
            captures[name] = value.text;
        }
        return {
            ruleId: match.ruleId,
            severity: match.severity ?? "hint",
            file: path.relative(REPO_ROOT, sourceFile).replace(/\\/g, "/"),
            line: line + 1,
            sourceLine: (sourceCache.get(sourceFile)?.[line] ?? "").trim(),
            message: match.message ?? "",
            captures,
        };
    });
}

if (import.meta.main) {
    const wantsJson = process.argv.includes("--json");
    const findings = scanSvelte({ rebuild: !process.argv.includes("--no-build") });

    if (wantsJson) {
        console.log(JSON.stringify(findings, null, 2));
    } else {
        const bySeverity = new Map<string, SvelteFinding[]>();
        for (const finding of findings) {
            const list = bySeverity.get(finding.severity) ?? [];
            list.push(finding);
            bySeverity.set(finding.severity, list);
        }
        for (const severity of ["error", "warning", "info", "hint"]) {
            const list = bySeverity.get(severity);
            if (!list?.length) continue;
            console.log(`\n${severity.toUpperCase()} (${list.length})`);
            for (const finding of list) {
                const key = finding.captures.KEY ?? finding.captures.EXPR ?? "";
                console.log(
                    `  ${finding.file}:${finding.line}  [${finding.ruleId}]${key ? ` ${key}` : ""}`,
                );
                if (finding.sourceLine) console.log(`      ${finding.sourceLine}`);
            }
        }
        console.log(`\n${findings.length} finding(s) across the Svelte markup.`);
    }

    if (findings.some((finding) => finding.severity === "error")) process.exit(1);
}
