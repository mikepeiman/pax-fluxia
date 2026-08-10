/**
 * svelteToTsx — turn a .svelte file into TSX that ast-grep can parse exactly.
 *
 * WHY
 * ---
 * ast-grep has no Svelte grammar. Parsing .svelte as HTML degrades at the first
 * Svelte-only construct ({#if}, {expr}) and silently drops everything after it —
 * measured 2 of 75 controls recovered in ControlsSection-Ships.svelte. Rules
 * written against that would report 73 real controls as nonexistent.
 *
 * Rather than approximate the grammar, this uses Svelte's OWN parser (the same
 * compiler that builds the app, so it is right by construction) and re-emits the
 * markup as TSX. ast-grep's TSX engine is excellent, and Svelte markup maps onto
 * JSX almost one-to-one — including the parts that look hostile: `on:click`,
 * `bind:value` and `<svelte:window>` are all valid JSX *namespaced* names, so
 * directives survive verbatim and rules match them exactly as they are written
 * in the .svelte file.
 *
 * LINE FIDELITY
 * -------------
 * The output has EXACTLY as many lines as the input, and every construct is
 * emitted on its original line. An ast-grep hit at generated line N is a hit at
 * source line N — no source map, no drift. Columns are NOT preserved (a
 * rewritten construct is not the same width), which is why the runner re-finds
 * the matched text inside the original line instead of trusting the column.
 *
 * Multi-line expressions are flattened onto their first line, so the lines they
 * used to occupy come out blank. A hit inside such an expression reports the
 * line the expression starts on. That is the only place the mapping is coarse.
 *
 * HOW THE PIECES STAY CONTIGUOUS
 * ------------------------------
 * Text is appended to a per-line buffer, always in increasing source-offset
 * order. So `{#if cond}` can emit `(cond) ? ` on its own line, the children can
 * emit on theirs, and `: null` can land later — concatenating the buffers yields
 * one valid expression spread across the original lines. Every emitter therefore
 * *writes* its pieces rather than returning a string to be assembled elsewhere.
 *
 * WHAT IT IS NOT
 * --------------
 * Not a compiler. The output never runs and is never type-checked — reactivity,
 * scoping and types are irrelevant. The only contract is: it parses as TSX, and
 * every markup construct lands on its original line.
 */

import { parse } from "svelte/compiler";

export interface ConvertResult {
    /** TSX source with the same line count as the input. */
    code: string;
    lineCount: number;
}

/** Minimal shape of the Svelte 5 AST nodes this walker touches. */
interface Node {
    type: string;
    start: number;
    end: number;
    [key: string]: unknown;
}

interface Fragment {
    nodes?: Node[];
}

const ELEMENT_TYPES = new Set([
    "RegularElement",
    "Component",
    "SvelteComponent",
    "SvelteElement",
    "SvelteWindow",
    "SvelteDocument",
    "SvelteBody",
    "SvelteHead",
    "SvelteFragment",
    "SvelteSelf",
    "SvelteBoundary",
    "SvelteOptions",
    "SlotElement",
    "TitleElement",
]);

/** Directive node type -> the JSX namespace it becomes. */
const DIRECTIVE_NAMESPACE: Record<string, string> = {
    OnDirective: "on",
    BindDirective: "bind",
    ClassDirective: "class",
    StyleDirective: "style",
    UseDirective: "use",
    AnimateDirective: "animate",
    TransitionDirective: "transition",
    LetDirective: "let",
};

export function svelteToTsx(source: string, filename: string): ConvertResult {
    const ast = parse(source, { modern: true, filename }) as unknown as {
        fragment: Fragment;
        instance?: Node | null;
        module?: Node | null;
    };

    // ── line bookkeeping ────────────────────────────────────────────────────

    const lineStarts: number[] = [0];
    for (let i = 0; i < source.length; i++) {
        if (source[i] === "\n") lineStarts.push(i + 1);
    }
    const lineOf = (offset: number): number => {
        let lo = 0;
        let hi = lineStarts.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (lineStarts[mid]! <= offset) lo = mid;
            else hi = mid - 1;
        }
        return lo;
    };

    const out: string[] = new Array(lineStarts.length).fill("");
    const put = (offset: number, text: string): void => {
        const line = Math.min(Math.max(lineOf(offset), 0), out.length - 1);
        out[line] += text;
    };

    const slice = (node: { start: number; end: number } | null | undefined): string =>
        node ? source.slice(node.start, node.end) : "";

    /**
     * Collapse a source slice onto one line. Comments must go first: appending
     * anything after a surviving `//` would swallow it. The `(^|\s)` guard keeps
     * `https://` intact — the residual risk is a `//` inside a string literal
     * that is also preceded by whitespace, which does not occur in markup
     * expressions here.
     */
    const flat = (text: string): string =>
        text
            .replace(/\/\*[\s\S]*?\*\//g, " ")
            .replace(/(^|\s)\/\/[^\n]*/g, "$1")
            .replace(/\r?\n/g, " ")
            .trim();

    const expr = (node: unknown): string => {
        const flattened = flat(slice(node as { start: number; end: number }));
        return flattened.length > 0 ? flattened : "undefined";
    };

    const quote = (text: string): string =>
        `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;

    const textOf = (node: Node): string => String(node.data ?? node.raw ?? "");

    /** Whitespace-only text and comments carry nothing a rule can match on. */
    const keep = (node: Node): boolean => {
        if (node.type === "Comment") return false;
        if (node.type === "Text") return textOf(node).trim().length > 0;
        return true;
    };

    // ── attributes ──────────────────────────────────────────────────────────

    function attributeText(attr: Node): string {
        if (attr.type === "SpreadAttribute") return `{...${expr(attr.expression)}}`;

        const namespace = DIRECTIVE_NAMESPACE[attr.type];
        if (namespace) {
            // Modifiers (`on:click|preventDefault`) are split off into
            // attr.modifiers by the parser, so the name is JSX-legal as-is.
            const name = `${namespace}:${String(attr.name)}`;
            return attr.expression ? `${name}={${expr(attr.expression)}}` : name;
        }

        const name = String(attr.name);
        const value = attr.value as unknown;

        if (value === true) return name; // boolean attribute
        if (!Array.isArray(value)) {
            // A single node: `prop={expr}`, or the `{prop}` shorthand, which the
            // parser reports as name `prop` with an identifier expression.
            const node = value as Node | undefined;
            if (!node) return name;
            if (node.type === "Text") return `${name}=${quote(textOf(node))}`;
            return `${name}={${expr((node as { expression?: unknown }).expression ?? node)}}`;
        }
        if (value.length === 0) return name;
        if (value.length === 1) {
            const only = value[0] as Node;
            if (only.type === "Text") return `${name}=${quote(textOf(only))}`;
            return `${name}={${expr(only.expression)}}`;
        }
        // Mixed text + interpolation (`class="row {active}"`) becomes the
        // template literal it already is, so both halves stay searchable.
        const parts = (value as Node[])
            .map((part) =>
                part.type === "Text"
                    ? textOf(part).replace(/[`\\]/g, "\\$&").replace(/\$/g, "\\$")
                    : `\${${expr(part.expression)}}`,
            )
            .join("");
        return `${name}={\`${parts.replace(/\r?\n/g, " ")}\`}`;
    }

    // ── elements ────────────────────────────────────────────────────────────

    const elementName = (node: Node): string =>
        node.type === "SvelteElement" ? "svelte:element" : String(node.name ?? "svelte:fragment");

    function emitElement(node: Node): void {
        const name = elementName(node);
        put(node.start, `<${name}`);

        // `<svelte:element this={tag}>` carries its tag outside `attributes`.
        if (node.tag) put(node.start, ` this={${expr(node.tag as Node)}}`);

        let openTagEnd = node.start;
        for (const attr of ((node.attributes as Node[] | undefined) ?? [])) {
            put(attr.start, ` ${attributeText(attr)}`);
            openTagEnd = Math.max(openTagEnd, attr.end);
        }

        const children = ((node.fragment as Fragment | undefined)?.nodes ?? []).filter(keep);
        if (children.length === 0) {
            put(openTagEnd, " />");
            return;
        }
        put(openTagEnd, ">");
        for (const child of children) emitChild(child);
        put(Math.max(node.end - 1, openTagEnd), `</${name}>`);
    }

    /**
     * Emit a branch body as a JSX fragment, in place. Returns the offset it
     * finished at so the caller can place what comes next no earlier than that
     * and keep the buffer append order monotonic.
     */
    function emitFragment(fragment: Fragment | undefined, fallbackAnchor: number): number {
        const children = (fragment?.nodes ?? []).filter(keep);
        if (children.length === 0) {
            put(fallbackAnchor, "null");
            return fallbackAnchor;
        }
        put(children[0]!.start, "<>");
        for (const child of children) emitChild(child);
        const closeAt = Math.max(children[children.length - 1]!.end - 1, children[0]!.start);
        put(closeAt, "</>");
        return closeAt;
    }

    /** First offset of a branch, for placing the operator that introduces it. */
    const anchorOf = (fragment: Fragment | undefined, fallback: number): number => {
        const first = (fragment?.nodes ?? []).filter(keep)[0];
        return first ? first.start : fallback;
    };

    // ── blocks and tags ─────────────────────────────────────────────────────

    /**
     * Write a non-element node as a bare JS expression (no wrapping braces —
     * the caller supplies `{ }` in child position or `;( );` at top level).
     *
     * These expressions are not meant to reproduce Svelte semantics. They exist
     * so each construct sits in the right position with the right identifiers in
     * scope, which is what lets a rule ask "is this control inside this {#if}"
     * or "does this key come from this {#each} binding".
     */
    function emitBlock(node: Node): void {
        switch (node.type) {
            case "ExpressionTag":
            case "HtmlTag":
            case "RenderTag":
                put(node.start, expr(node.expression));
                return;

            case "ConstTag":
                // `declaration` slices as `const x = y`, which needs a statement
                // body rather than an expression position.
                put(node.start, `(() => { ${flat(slice(node.declaration as Node))}; return null; })()`);
                return;

            case "DebugTag":
                put(node.start, "null");
                return;

            case "IfBlock": {
                put(node.start, `(${expr(node.test)}) ? `);
                const consequentEnd = emitFragment(node.consequent as Fragment, node.start);
                const alternate = node.alternate as Fragment | undefined;
                const elseAnchor = anchorOf(alternate, consequentEnd);
                put(elseAnchor, " : ");
                emitFragment(alternate, elseAnchor);
                return;
            }

            case "EachBlock": {
                const context = flat(slice(node.context as Node)) || "_item";
                const index = node.index ? `, ${String(node.index)}` : "";
                put(node.start, `(${expr(node.expression)}).map((${context}${index}) => `);
                const bodyEnd = emitFragment(node.body as Fragment, node.start);
                put(Math.max(node.end - 1, bodyEnd), ")");
                return;
            }

            case "AwaitBlock": {
                put(node.start, `((${expr(node.expression)})`);
                let cursor = node.start;
                const pending = node.pending as Fragment | undefined;
                if ((pending?.nodes ?? []).filter(keep).length > 0) {
                    const anchor = anchorOf(pending, cursor);
                    put(anchor, ", ");
                    cursor = emitFragment(pending, anchor);
                }
                for (const [branch, binding, fallbackName] of [
                    [node.then as Fragment | undefined, node.value as Node | undefined, "_value"],
                    [node.catch as Fragment | undefined, node.error as Node | undefined, "_error"],
                ] as const) {
                    if (!branch) continue;
                    const anchor = anchorOf(branch, cursor);
                    const name = binding ? flat(slice(binding)) : fallbackName;
                    put(anchor, `, ((${name || fallbackName}) => `);
                    cursor = emitFragment(branch, anchor);
                    put(cursor, ")");
                }
                put(Math.max(node.end - 1, cursor), ")");
                return;
            }

            case "KeyBlock": {
                put(node.start, `((${expr(node.expression)}), `);
                const end = emitFragment(node.fragment as Fragment, node.start);
                put(Math.max(node.end - 1, end), ")");
                return;
            }

            case "SnippetBlock": {
                const name = flat(slice(node.expression as Node)) || "_snippet";
                const params = ((node.parameters as Node[]) ?? []).map((p) => flat(slice(p))).join(", ");
                put(node.start, `(function ${name}(${params}) { return `);
                const end = emitFragment(node.body as Fragment, node.start);
                put(Math.max(node.end - 1, end), "; })");
                return;
            }

            default:
                put(node.start, "null");
        }
    }

    /** A child sits in JSX-child position, so expressions need braces. */
    function emitChild(node: Node): void {
        if (ELEMENT_TYPES.has(node.type)) {
            emitElement(node);
            return;
        }
        if (node.type === "Text") {
            put(node.start, `{${quote(textOf(node).trim())}}`);
            return;
        }
        put(node.start, "{");
        emitBlock(node);
        put(Math.max(node.end - 1, node.start), "}");
    }

    // ── scripts: verbatim, line for line ────────────────────────────────────

    function emitScript(script: Node | null | undefined): void {
        const content = script?.content as { start: number; end: number } | undefined;
        if (!content) return;
        const firstLine = lineOf(content.start);
        source
            .slice(content.start, content.end)
            .split(/\r?\n/)
            .forEach((text, offset) => {
                const line = firstLine + offset;
                if (line < out.length) out[line] += text;
            });
    }

    emitScript(ast.module ?? null);
    emitScript(ast.instance ?? null);

    // ── top level ───────────────────────────────────────────────────────────
    //
    // Each top-level markup node becomes its own expression statement. That
    // sidesteps wrapper placement entirely: scripts stay module-scope statements,
    // markup nodes are siblings, and it does not matter whether the markup sits
    // before or after <script> in the file.
    for (const node of (ast.fragment.nodes ?? []).filter(keep)) {
        put(node.start, ";(");
        if (ELEMENT_TYPES.has(node.type)) emitElement(node);
        else if (node.type === "Text") put(node.start, quote(textOf(node).trim()));
        else emitBlock(node);
        put(Math.max(node.end - 1, node.start), ");");
    }

    return { code: out.join("\n"), lineCount: out.length };
}
