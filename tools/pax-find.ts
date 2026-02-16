#!/usr/bin/env bun
// ============================================================================
// pax-find — Blazing-fast codebase search utility
// ============================================================================
// Replaces unreliable multi-step CLI searches with a single guaranteed command.
// Handles encoding issues, ignores node_modules/.git, and works on all file
// types including .svelte, .ts, .js, .json, .md.
//
// Usage:
//   bun tools/pax-find.ts <term>              Find all references
//   bun tools/pax-find.ts --imports <module>   Find all imports of a module
//   bun tools/pax-find.ts --exports <file>     List exports from a file
//   bun tools/pax-find.ts --refs <name>        References with 2-line context
//   bun tools/pax-find.ts --config <key>       Find config variable readers/writers
// ============================================================================

import { readdir, readFile } from "fs/promises";
import { join, relative, extname, basename } from "path";

// ── Configuration ───────────────────────────────────────────────────────────

const SEARCH_EXTENSIONS = new Set([
    ".ts", ".tsx", ".js", ".jsx", ".svelte", ".vue",
    ".json", ".md", ".css", ".scss", ".html",
]);

const IGNORE_DIRS = new Set([
    "node_modules", ".git", "dist", "build", ".svelte-kit",
    ".next", ".nuxt", "coverage", ".turbo",
]);

const COLORS = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
};

// ── File Discovery ──────────────────────────────────────────────────────────

async function* walkFiles(dir: string): AsyncGenerator<string> {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!IGNORE_DIRS.has(entry.name)) {
                yield* walkFiles(fullPath);
            }
        } else if (entry.isFile()) {
            const ext = extname(entry.name).toLowerCase();
            if (SEARCH_EXTENSIONS.has(ext)) {
                yield fullPath;
            }
        }
    }
}

// ── Core Search ─────────────────────────────────────────────────────────────

interface Match {
    file: string;
    line: number;
    content: string;
    context?: string[];
}

async function searchFiles(
    root: string,
    term: string,
    options: { context?: number; caseSensitive?: boolean } = {}
): Promise<Match[]> {
    const matches: Match[] = [];
    const ctx = options.context ?? 0;
    const flags = options.caseSensitive === false ? "gi" : "g";
    const regex = new RegExp(escapeRegex(term), flags);

    for await (const filePath of walkFiles(root)) {
        let content: string;
        try {
            content = await readFile(filePath, "utf-8");
        } catch {
            // Binary or unreadable — skip silently
            continue;
        }

        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
                const match: Match = {
                    file: relative(root, filePath).replace(/\\/g, "/"),
                    line: i + 1,
                    content: lines[i].trimEnd(),
                };
                if (ctx > 0) {
                    match.context = lines
                        .slice(Math.max(0, i - ctx), Math.min(lines.length, i + ctx + 1))
                        .map((l) => l.trimEnd());
                }
                matches.push(match);
            }
            regex.lastIndex = 0; // Reset for next test
        }
    }

    return matches;
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Modes ───────────────────────────────────────────────────────────────────

async function findReferences(root: string, term: string) {
    const matches = await searchFiles(root, term, { context: 2 });
    printHeader(`References to "${term}"`, matches.length);

    // Group by file
    const byFile = new Map<string, Match[]>();
    for (const m of matches) {
        const arr = byFile.get(m.file) || [];
        arr.push(m);
        byFile.set(m.file, arr);
    }

    for (const [file, fileMatches] of byFile) {
        console.log(`\n${COLORS.cyan}${file}${COLORS.reset}`);
        for (const m of fileMatches) {
            if (m.context) {
                for (const line of m.context) {
                    const isMatch = line === m.content;
                    const prefix = isMatch ? `${COLORS.yellow}→${COLORS.reset}` : " ";
                    console.log(`  ${prefix} ${COLORS.dim}${m.line}${COLORS.reset}: ${highlightTerm(line, term)}`);
                }
                console.log();
            } else {
                console.log(`  ${COLORS.dim}L${m.line}${COLORS.reset}: ${highlightTerm(m.content, term)}`);
            }
        }
    }
}

async function findImports(root: string, module: string) {
    const patterns = [
        `from '${module}`,
        `from "${module}`,
        `require('${module}`,
        `require("${module}`,
        `import '${module}`,
        `import "${module}`,
    ];

    const allMatches: Match[] = [];
    for (const pattern of patterns) {
        const matches = await searchFiles(root, pattern);
        allMatches.push(...matches);
    }

    // Also search partial (e.g., --imports game.config matches '$lib/config/game.config')
    const partialMatches = await searchFiles(root, module);
    const importMatches = partialMatches.filter(
        (m) => /^\s*(import|export|from|require)/.test(m.content)
    );
    for (const m of importMatches) {
        if (!allMatches.some((e) => e.file === m.file && e.line === m.line)) {
            allMatches.push(m);
        }
    }

    printHeader(`Imports of "${module}"`, allMatches.length);
    for (const m of allMatches) {
        console.log(`  ${COLORS.cyan}${m.file}${COLORS.reset}:${COLORS.dim}${m.line}${COLORS.reset}`);
        console.log(`    ${highlightTerm(m.content, module)}`);
    }
}

async function findExports(root: string, filePattern: string) {
    // Find the actual file
    const targetFiles: string[] = [];
    for await (const filePath of walkFiles(root)) {
        const rel = relative(root, filePath).replace(/\\/g, "/");
        if (rel.includes(filePattern) || basename(filePath).includes(filePattern)) {
            targetFiles.push(filePath);
        }
    }

    if (targetFiles.length === 0) {
        console.log(`${COLORS.red}No files matching "${filePattern}" found.${COLORS.reset}`);
        return;
    }

    for (const filePath of targetFiles) {
        const content = await readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const exports: { line: number; content: string }[] = [];

        for (let i = 0; i < lines.length; i++) {
            if (/^\s*export\s/.test(lines[i])) {
                exports.push({ line: i + 1, content: lines[i].trimEnd() });
            }
        }

        const rel = relative(root, filePath).replace(/\\/g, "/");
        printHeader(`Exports from ${rel}`, exports.length);
        for (const e of exports) {
            console.log(`  ${COLORS.dim}L${e.line}${COLORS.reset}: ${highlightTerm(e.content, "export")}`);
        }
    }
}

async function findConfig(root: string, key: string) {
    const matches = await searchFiles(root, key, { context: 1 });
    printHeader(`Config key "${key}"`, matches.length);

    // Categorize: definition, reader, writer
    const writers: Match[] = [];
    const readers: Match[] = [];
    const definitions: Match[] = [];

    for (const m of matches) {
        if (/:\s*(number|string|boolean)/.test(m.content) || /interface|type\s/.test(m.content)) {
            definitions.push(m);
        } else if (new RegExp(`${escapeRegex(key)}\\s*[=:]`).test(m.content)) {
            writers.push(m);
        } else {
            readers.push(m);
        }
    }

    if (definitions.length > 0) {
        console.log(`\n${COLORS.magenta}── Definitions ──${COLORS.reset}`);
        for (const m of definitions) {
            console.log(`  ${COLORS.cyan}${m.file}${COLORS.reset}:${COLORS.dim}${m.line}${COLORS.reset}: ${m.content.trim()}`);
        }
    }
    if (writers.length > 0) {
        console.log(`\n${COLORS.yellow}── Writers ──${COLORS.reset}`);
        for (const m of writers) {
            console.log(`  ${COLORS.cyan}${m.file}${COLORS.reset}:${COLORS.dim}${m.line}${COLORS.reset}: ${m.content.trim()}`);
        }
    }
    if (readers.length > 0) {
        console.log(`\n${COLORS.green}── Readers ──${COLORS.reset}`);
        for (const m of readers) {
            console.log(`  ${COLORS.cyan}${m.file}${COLORS.reset}:${COLORS.dim}${m.line}${COLORS.reset}: ${m.content.trim()}`);
        }
    }
}

// ── Display Helpers ─────────────────────────────────────────────────────────

function printHeader(title: string, count: number) {
    const color = count > 0 ? COLORS.green : COLORS.red;
    console.log(
        `\n${COLORS.bold}${title}${COLORS.reset} — ${color}${count} match${count !== 1 ? "es" : ""}${COLORS.reset}`
    );
}

function highlightTerm(line: string, term: string): string {
    return line.replace(
        new RegExp(escapeRegex(term), "gi"),
        `${COLORS.red}${COLORS.bold}$&${COLORS.reset}`
    );
}

// ── CLI Entry ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const root = process.cwd();

if (args.length === 0) {
    console.log(`
${COLORS.bold}pax-find${COLORS.reset} — Codebase search utility

${COLORS.cyan}Usage:${COLORS.reset}
  bun tools/pax-find.ts <term>              Find all references
  bun tools/pax-find.ts --refs <name>       References with context
  bun tools/pax-find.ts --imports <module>  Find all imports of a module
  bun tools/pax-find.ts --exports <file>    List exports from a file
  bun tools/pax-find.ts --config <key>      Config variable audit (def/read/write)

${COLORS.cyan}Examples:${COLORS.reset}
  bun tools/pax-find.ts WOBBLE_AMP
  bun tools/pax-find.ts --config STAR_RENDER_RADIUS
  bun tools/pax-find.ts --imports game.config
  bun tools/pax-find.ts --exports VisualStateManager
  bun tools/pax-find.ts --refs travelingShips
`);
    process.exit(0);
}

const startTime = performance.now();

if (args[0] === "--imports" && args[1]) {
    await findImports(root, args[1]);
} else if (args[0] === "--exports" && args[1]) {
    await findExports(root, args[1]);
} else if (args[0] === "--refs" && args[1]) {
    await findReferences(root, args[1]);
} else if (args[0] === "--config" && args[1]) {
    await findConfig(root, args[1]);
} else {
    // Simple search — no context
    const matches = await searchFiles(root, args[0]);
    printHeader(`"${args[0]}"`, matches.length);

    const byFile = new Map<string, Match[]>();
    for (const m of matches) {
        const arr = byFile.get(m.file) || [];
        arr.push(m);
        byFile.set(m.file, arr);
    }

    for (const [file, fileMatches] of byFile) {
        console.log(`\n${COLORS.cyan}${file}${COLORS.reset} (${fileMatches.length})`);
        for (const m of fileMatches) {
            console.log(`  ${COLORS.dim}L${m.line}${COLORS.reset}: ${highlightTerm(m.content, args[0])}`);
        }
    }
}

const elapsed = (performance.now() - startTime).toFixed(0);
console.log(`\n${COLORS.dim}Completed in ${elapsed}ms${COLORS.reset}`);
