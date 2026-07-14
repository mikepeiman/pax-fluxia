/**
 * PolygonValidator.ts
 * Lightweight geometry validation utilities for territory fill polygons.
 * Used in transition samplers and the presentation layer to detect
 * degenerate polygons before they reach PIXI's earcut triangulation.
 *
 * Layer: DevTools / Geometry
 * No PIXI imports.
 */

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface PolygonValidationResult {
    valid: boolean;
    pointCount: number;
    signedArea: number;
    absArea: number;
    isClosed: boolean;
    hasDuplicateAdjacentVertices: boolean;
    hasZeroLengthEdges: boolean;
    /** True if any edge of this polygon crosses another edge (O(n²) — dev only). */
    hasSelfIntersection: boolean;
    issues: string[];
}

// ---------------------------------------------------------------------------
// Main validation entry point
// ---------------------------------------------------------------------------

/**
 * Validate a single polygon point array.
 * @param points  Open polygon (no closing duplicate). PIXI poly() accepts open arrays.
 * @param label   Human-readable label for log output.
 * @param logInvalid  If true, console.warn on invalid polygons.
 */
export function validatePolygon(
    points: readonly [number, number][],
    label = 'polygon',
    logInvalid = false,
): PolygonValidationResult {
    const issues: string[] = [];
    const n = points.length;

    if (n < 3) {
        issues.push(`Too few points: ${n}`);
        return {
            valid: false, pointCount: n, signedArea: 0, absArea: 0,
            isClosed: false, hasDuplicateAdjacentVertices: false,
            hasZeroLengthEdges: false, hasSelfIntersection: false, issues,
        };
    }

    const area = signedArea(points);
    const absArea = Math.abs(area);

    if (absArea < 1) {
        issues.push(`Near-zero area: ${absArea.toFixed(4)}`);
    }

    // Check for closing duplicate vertex (open array expected)
    const lastFirst = points[n - 1][0] === points[0][0] && points[n - 1][1] === points[0][1];
    if (lastFirst) {
        issues.push('Closing duplicate vertex present (array should be open)');
    }

    // Check for duplicate adjacent vertices and zero-length edges
    let hasDuplicateAdjacentVertices = false;
    let hasZeroLengthEdges = false;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const dx = points[j][0] - points[i][0];
        const dy = points[j][1] - points[i][1];
        const len2 = dx * dx + dy * dy;
        if (len2 < 1e-10) {
            hasDuplicateAdjacentVertices = true;
            hasZeroLengthEdges = true;
        }
    }
    if (hasDuplicateAdjacentVertices) {
        issues.push('Duplicate adjacent vertices or zero-length edges found');
    }

    // Self-intersection check (O(n²) — only use in dev/diagnostics)
    const hasSelfIntersection = checkSelfIntersection(points);
    if (hasSelfIntersection) {
        issues.push('Self-intersecting polygon detected');
    }

    const valid = issues.length === 0;

    if (!valid && logInvalid) {
        console.warn(`[PolygonValidator] Invalid ${label}: ${issues.join('; ')}`, {
            pointCount: n, absArea,
            first: points[0], last: points[n - 1],
        });
    }

    return {
        valid,
        pointCount: n,
        signedArea: area,
        absArea,
        isClosed: lastFirst,
        hasDuplicateAdjacentVertices,
        hasZeroLengthEdges,
        hasSelfIntersection,
        issues,
    };
}

/**
 * Validate all regions in a fill frame and return a summary.
 */
export function validateFillFrame(
    regions: readonly { ownerId: string; points: [number, number][] }[],
    label = 'fillFrame',
    logInvalid = false,
): { allValid: boolean; invalidCount: number; results: PolygonValidationResult[] } {
    const results = regions.map((r, i) =>
        validatePolygon(r.points, `${label}[${i}]:${r.ownerId}`, logInvalid),
    );
    const invalidCount = results.filter(r => !r.valid).length;
    return { allValid: invalidCount === 0, invalidCount, results };
}

// ---------------------------------------------------------------------------
// Geometry primitives
// ---------------------------------------------------------------------------

export function signedArea(points: readonly [number, number][]): number {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i][0] * points[j][1];
        area -= points[j][0] * points[i][1];
    }
    return area / 2;
}

/**
 * O(n²) self-intersection check.
 * Only use in diagnostics — not suitable for every render frame.
 */
function checkSelfIntersection(points: readonly [number, number][]): boolean {
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const a = points[i];
        const b = points[(i + 1) % n];
        for (let j = i + 2; j < n; j++) {
            if (i === 0 && j === n - 1) continue; // adjacent edges share a vertex
            const c = points[j];
            const d = points[(j + 1) % n];
            if (segmentsIntersect(a, b, c, d)) return true;
        }
    }
    return false;
}

function cross2D(ax: number, ay: number, bx: number, by: number): number {
    return ax * by - ay * bx;
}

function segmentsIntersect(
    a: [number, number], b: [number, number],
    c: [number, number], d: [number, number],
): boolean {
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const cdx = d[0] - c[0], cdy = d[1] - c[1];
    const denom = cross2D(abx, aby, cdx, cdy);
    if (Math.abs(denom) < 1e-12) return false; // parallel
    const acx = c[0] - a[0], acy = c[1] - a[1];
    const t = cross2D(acx, acy, cdx, cdy) / denom;
    const u = cross2D(acx, acy, abx, aby) / denom;
    return t > 0 && t < 1 && u > 0 && u < 1;
}
