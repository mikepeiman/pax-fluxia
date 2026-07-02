/**
 * sharedEdgeGraph — builds the single-source border graph from power cells and
 * walks region loops out of it with an angular-order DCEL face traversal.
 *
 * Pure & deterministic: no Date.now / Math.random / console / DOM. Given the same
 * cells (in any array order) it produces identical edgeIds and loopIds.
 */

import {
    WORLD_OWNER,
    type Point,
    type PowerCell,
    type RegionLoop,
    type RegionLoopEdgeRef,
    type SharedEdge,
    type SharedEdgeGraph,
    type WorldEdge,
    type WorldRect,
} from './powerCoreTypes';

// ---------------------------------------------------------------------------
// Quantization — fold near-equal endpoints onto a shared key (1e-3 px grid).
// ---------------------------------------------------------------------------

const QUANT = 1000; // 1 / 1e-3

/** Stable string key for a point, snapped to the 1e-3 px grid. */
function pointKey(p: Point): string {
    // `+0` collapses -0 and +0 to the same key.
    return `${Math.round(p[0] * QUANT) + 0}:${Math.round(p[1] * QUANT) + 0}`;
}

/** Snap a point to the canonical grid coordinate it shares with its neighbors. */
function snap(p: Point): Point {
    return [Math.round(p[0] * QUANT) / QUANT, Math.round(p[1] * QUANT) / QUANT];
}

/** Undirected, order-independent key for an endpoint-pair (drops zero-length). */
function undirectedEdgeKey(aKey: string, bKey: string): string | null {
    if (aKey === bKey) return null; // degenerate zero-length edge — ignore
    return aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
}

/** Deterministic edgeId from the SORTED endpoint-key pair. */
function edgeIdFromKeys(aKey: string, bKey: string): string {
    return aKey < bKey ? `E:${aKey}>${bKey}` : `E:${bKey}>${aKey}`;
}

// ---------------------------------------------------------------------------
// World-boundary test — is a point on the rectangle [0,w] x [0,h] border?
// ---------------------------------------------------------------------------

const ON_BOUNDARY_EPS = 1e-6;

function onWorldBoundary(p: Point, world: WorldRect): boolean {
    const onLeft = Math.abs(p[0] - 0) <= ON_BOUNDARY_EPS;
    const onRight = Math.abs(p[0] - world.width) <= ON_BOUNDARY_EPS;
    const onTop = Math.abs(p[1] - 0) <= ON_BOUNDARY_EPS;
    const onBottom = Math.abs(p[1] - world.height) <= ON_BOUNDARY_EPS;
    const xInside = p[0] >= -ON_BOUNDARY_EPS && p[0] <= world.width + ON_BOUNDARY_EPS;
    const yInside = p[1] >= -ON_BOUNDARY_EPS && p[1] <= world.height + ON_BOUNDARY_EPS;
    return (
        ((onLeft || onRight) && yInside) || ((onTop || onBottom) && xInside)
    );
}

// ---------------------------------------------------------------------------
// buildSharedEdgeGraph
// ---------------------------------------------------------------------------

interface EdgeAccumulator {
    readonly edgeId: string;
    readonly aKey: string;
    readonly bKey: string;
    readonly aPt: Point; // canonical (snapped) endpoint for aKey
    readonly bPt: Point; // canonical (snapped) endpoint for bKey
    /** Distinct owners that have a cell-edge on this border. */
    readonly owners: Set<string>;
    /** Number of distinct cells contributing this edge (by siteId). */
    readonly siteIds: Set<string>;
}

/**
 * Build the deduped single-source border graph.
 *
 * For every consecutive point-pair of every cell polygon:
 *  - quantize endpoints to keys (1e-3 px);
 *  - accumulate by the undirected endpoint-key pair, recording the owners/sites
 *    that touch it.
 * Then classify:
 *  - two cells of DIFFERENT owners  → ONE SharedEdge (ownerA < ownerB);
 *  - two cells of the SAME owner    → internal, DROP;
 *  - exactly one cell AND on the world rectangle boundary → WorldEdge.
 * A single-cell edge NOT on the world boundary is a diagram artifact (e.g. a
 * clipped open cell) and is dropped — it bounds the unbounded face, handled by
 * the walk as WORLD.
 */
export function buildSharedEdgeGraph(
    cells: PowerCell[],
    world: WorldRect,
): SharedEdgeGraph {
    const acc = new Map<string, EdgeAccumulator>();

    for (const cell of cells) {
        const ring = cell.points;
        const n = ring.length;
        if (n < 2) continue;
        for (let i = 0; i < n; i++) {
            const p = ring[i];
            const q = ring[(i + 1) % n];
            const pKey = pointKey(p);
            const qKey = pointKey(q);
            const undirected = undirectedEdgeKey(pKey, qKey);
            if (undirected === null) continue;

            let entry = acc.get(undirected);
            if (!entry) {
                // Canonical endpoint ordering matches edgeId ordering (aKey < bKey).
                const aFirst = pKey < qKey;
                entry = {
                    edgeId: edgeIdFromKeys(pKey, qKey),
                    aKey: aFirst ? pKey : qKey,
                    bKey: aFirst ? qKey : pKey,
                    aPt: snap(aFirst ? p : q),
                    bPt: snap(aFirst ? q : p),
                    owners: new Set<string>(),
                    siteIds: new Set<string>(),
                };
                acc.set(undirected, entry);
            }
            entry.owners.add(cell.ownerId);
            entry.siteIds.add(cell.siteId);
        }
    }

    const sharedEdges: SharedEdge[] = [];
    const worldEdges: WorldEdge[] = [];

    for (const entry of acc.values()) {
        const distinctOwners = [...entry.owners].sort();
        const cellCount = entry.siteIds.size;

        if (distinctOwners.length >= 2) {
            // Inter-owner border. (If >2 owners share one endpoint-pair the diagram
            // is degenerate; we still emit a single edge between the two extreme
            // owners deterministically — see limitation note in module footer.)
            const ownerA = distinctOwners[0];
            const ownerB = distinctOwners[distinctOwners.length - 1];
            const pts: [Point, Point] = [entry.aPt, entry.bPt];
            sharedEdges.push({
                edgeId: entry.edgeId,
                ownerA,
                ownerB,
                pts,
                smoothedPts: [pts[0], pts[1]],
            });
            continue;
        }

        // Single distinct owner on this edge.
        const owner = distinctOwners[0];
        const isWorld =
            cellCount === 1 &&
            onWorldBoundary(entry.aPt, world) &&
            onWorldBoundary(entry.bPt, world);
        if (isWorld) {
            const pts: [Point, Point] = [entry.aPt, entry.bPt];
            worldEdges.push({
                edgeId: entry.edgeId,
                owner,
                pts,
                smoothedPts: [pts[0], pts[1]],
            });
        }
        // else: same-owner internal edge (cellCount === 2) → dropped;
        //       or single-cell non-boundary artifact → dropped.
    }

    // Deterministic ordering by edgeId.
    sharedEdges.sort((a, b) => (a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0));
    worldEdges.sort((a, b) => (a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0));

    return { sharedEdges, worldEdges };
}

// ---------------------------------------------------------------------------
// DCEL construction + angular-order face traversal
// ---------------------------------------------------------------------------

/** The cell whose interior lies to the LEFT of a directed (half-)edge. */
interface LeftCellTag {
    readonly siteId: string;
    readonly ownerId: string;
}

interface HalfEdge {
    readonly id: number;
    readonly fromKey: string; // tail vertex key
    readonly toKey: string; // head vertex key
    readonly fromPt: Point;
    readonly toPt: Point;
    readonly edgeId: string;
    readonly kind: 'shared' | 'world';
    /** This half-edge represents the underlying edge traversed in its stored p→q order. */
    readonly forward: boolean;
    readonly twinId: number;
    /** Angle of the OUTGOING direction (atan2(dy, dx)) at `fromKey`. */
    readonly angle: number;
    /**
     * The cell that CONTRIBUTED this half-edge, i.e. the cell whose interior is
     * on the LEFT of fromKey→toKey. The face walk keeps its interior on the
     * left too, so a face directly inherits owner/membership from these tags —
     * no point-in-polygon needed. Undefined on the outward side of world edges
     * (the unbounded face has no owning cell).
     */
    readonly leftCell?: LeftCellTag;
    nextId: number; // filled during linking
}

/**
 * Directed-edge → contributing-cell map. For each cell, every boundary segment
 * is keyed in the direction that puts the CELL INTERIOR ON THE LEFT (ring order
 * if the ring winds CCW / positive signed area, reversed otherwise). This is
 * what lets the DCEL walk derive each face's owner directly from the half-edges
 * it traverses.
 */
function buildInteriorLeftTags(cells: PowerCell[]): Map<string, LeftCellTag> {
    const tags = new Map<string, LeftCellTag>();
    for (const cell of cells) {
        const ring = cell.points;
        const n = ring.length;
        if (n < 3) continue;
        const ccw = signedArea(ring) > 0;
        for (let i = 0; i < n; i++) {
            const p = ring[i];
            const q = ring[(i + 1) % n];
            const pKey = pointKey(p);
            const qKey = pointKey(q);
            if (pKey === qKey) continue; // zero-length / closing duplicate
            // Interior-on-left direction: ring order when CCW, reversed when CW.
            const key = ccw ? `${pKey}>${qKey}` : `${qKey}>${pKey}`;
            const existing = tags.get(key);
            // Valid non-overlapping cells never collide here; if corrupt input
            // does, keep the lexicographically-smallest siteId for determinism.
            if (!existing || cell.siteId < existing.siteId) {
                tags.set(key, { siteId: cell.siteId, ownerId: cell.ownerId });
            }
        }
    }
    return tags;
}

/**
 * Same-owner connected components over cell adjacency (cells of the SAME owner
 * sharing an undirected boundary segment are one region). Components supply a
 * face's FULL membership — including interior cells whose edges never reach the
 * border graph (same-owner internal edges are dropped by buildSharedEdgeGraph).
 * Returns siteId → sorted member siteIds (shared array per component).
 */
function buildSameOwnerComponents(cells: PowerCell[]): Map<string, string[]> {
    // Union-find over siteIds.
    const parent = new Map<string, string>();
    const find = (x: string): string => {
        let r = x;
        while (parent.get(r) !== r) r = parent.get(r)!;
        // Path compression.
        let c = x;
        while (c !== r) {
            const next = parent.get(c)!;
            parent.set(c, r);
            c = next;
        }
        return r;
    };
    const union = (a: string, b: string): void => {
        const ra = find(a);
        const rb = find(b);
        if (ra === rb) return;
        // Deterministic root choice: lexicographically smaller wins.
        if (ra < rb) parent.set(rb, ra);
        else parent.set(ra, rb);
    };

    const byOwner = new Map<string, string>(); // siteId → ownerId
    for (const cell of cells) {
        parent.set(cell.siteId, cell.siteId);
        byOwner.set(cell.siteId, cell.ownerId);
    }

    // Accumulate cells per undirected segment, then union same-owner pairs.
    const touching = new Map<string, string[]>(); // undirectedKey → siteIds
    for (const cell of cells) {
        const ring = cell.points;
        const n = ring.length;
        if (n < 2) continue;
        for (let i = 0; i < n; i++) {
            const pKey = pointKey(ring[i]);
            const qKey = pointKey(ring[(i + 1) % n]);
            const undirected = undirectedEdgeKey(pKey, qKey);
            if (undirected === null) continue;
            let list = touching.get(undirected);
            if (!list) {
                list = [];
                touching.set(undirected, list);
            }
            if (!list.includes(cell.siteId)) list.push(cell.siteId);
        }
    }
    for (const siteIds of touching.values()) {
        for (let i = 0; i < siteIds.length; i++) {
            for (let j = i + 1; j < siteIds.length; j++) {
                if (byOwner.get(siteIds[i]) === byOwner.get(siteIds[j])) {
                    union(siteIds[i], siteIds[j]);
                }
            }
        }
    }

    // Materialize sorted member lists, one shared array per component root.
    const membersByRoot = new Map<string, string[]>();
    for (const siteId of [...parent.keys()].sort()) {
        const root = find(siteId);
        let members = membersByRoot.get(root);
        if (!members) {
            members = [];
            membersByRoot.set(root, members);
        }
        members.push(siteId); // insertion is in sorted siteId order
    }
    const bySite = new Map<string, string[]>();
    for (const members of membersByRoot.values()) {
        for (const siteId of members) bySite.set(siteId, members);
    }
    return bySite;
}

/**
 * Build directed half-edges (two per undirected edge) and link `next(h)` using
 * the angular-order rule. Returns the half-edge array.
 *
 * THE next(h) RULE (standard DCEL planar-subdivision face traversal):
 *   Let h go u -> v. Its twin t = twin(h) leaves v heading v -> u at angle θ_t.
 *   Among all half-edges LEAVING v, sort them by outgoing angle. Then
 *       next(h) = the half-edge IMMEDIATELY CLOCKWISE from t in that cyclic order
 *               = predecessor of t in CCW (counter-clockwise) order
 *               = the entry just before t when angles are sorted ascending,
 *                 wrapping around.
 *   This keeps the face interior on the LEFT of every half-edge, so each bounded
 *   face is traced CCW exactly once and the single outer face is traced CW.
 *
 * Why this is correct at a k-way junction (the historical failure mode): at the
 * junction vertex v, the k incident edges partition the neighborhood into k
 * angular wedges. Arriving along h (i.e. via twin t pointing back out along the
 * u-direction), the face we are tracing occupies exactly the wedge immediately
 * clockwise of t. Picking the immediately-clockwise outgoing edge selects the
 * other boundary of that wedge — which is the unique correct continuation of THIS
 * face. There is no "first-unused" guessing; the choice is forced by geometry and
 * is independent of visit order, so 3-, 4-, and higher-way junctions all resolve
 * deterministically and without self-crossing.
 */
function buildHalfEdges(
    graph: SharedEdgeGraph,
    interiorLeftTags: Map<string, LeftCellTag>,
): HalfEdge[] {
    interface RawDir {
        fromKey: string;
        toKey: string;
        fromPt: Point;
        toPt: Point;
        edgeId: string;
        kind: 'shared' | 'world';
        forward: boolean;
    }

    const raw: RawDir[] = [];
    const pushBoth = (
        edgeId: string,
        kind: 'shared' | 'world',
        a: Point,
        b: Point,
    ) => {
        const aKey = pointKey(a);
        const bKey = pointKey(b);
        if (aKey === bKey) return;
        // forward = stored p->q direction (a is pts[0]).
        raw.push({ fromKey: aKey, toKey: bKey, fromPt: a, toPt: b, edgeId, kind, forward: true });
        raw.push({ fromKey: bKey, toKey: aKey, fromPt: b, toPt: a, edgeId, kind, forward: false });
    };

    for (const e of graph.sharedEdges) pushBoth(e.edgeId, 'shared', e.pts[0], e.pts[1]);
    for (const e of graph.worldEdges) pushBoth(e.edgeId, 'world', e.pts[0], e.pts[1]);

    // Assign ids; twins are consecutive (2k, 2k+1). Each half-edge carries the
    // cell that contributed it (interior on the left of its direction).
    const halfEdges: HalfEdge[] = raw.map((r, i) => ({
        id: i,
        fromKey: r.fromKey,
        toKey: r.toKey,
        fromPt: r.fromPt,
        toPt: r.toPt,
        edgeId: r.edgeId,
        kind: r.kind,
        forward: r.forward,
        twinId: i % 2 === 0 ? i + 1 : i - 1,
        angle: Math.atan2(r.toPt[1] - r.fromPt[1], r.toPt[0] - r.fromPt[0]),
        leftCell: interiorLeftTags.get(`${r.fromKey}>${r.toKey}`),
        nextId: -1,
    }));

    // Group OUTGOING half-edges by tail vertex, sorted CCW (ascending angle).
    const outgoing = new Map<string, HalfEdge[]>();
    for (const h of halfEdges) {
        let list = outgoing.get(h.fromKey);
        if (!list) {
            list = [];
            outgoing.set(h.fromKey, list);
        }
        list.push(h);
    }
    for (const list of outgoing.values()) {
        list.sort((p, q) => {
            if (p.angle !== q.angle) return p.angle - q.angle;
            // Tie-break by twin head for determinism on exactly-collinear spokes.
            return p.toKey < q.toKey ? -1 : p.toKey > q.toKey ? 1 : p.id - q.id;
        });
    }

    // Link next(h): twin t leaves head(h); next(h) is the entry IMMEDIATELY
    // CLOCKWISE from t == the predecessor of t in the ascending-angle ring.
    for (const h of halfEdges) {
        const t = halfEdges[h.twinId];
        const ring = outgoing.get(t.fromKey)!; // t leaves head(h) === t.fromKey
        const idx = ring.findIndex((x) => x.id === t.id);
        const prevIdx = (idx - 1 + ring.length) % ring.length;
        h.nextId = ring[prevIdx].id;
    }

    return halfEdges;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Signed area (shoelace). Positive => CCW winding. */
function signedArea(ring: Point[]): number {
    let s = 0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
}

// ---------------------------------------------------------------------------
// Stable loopId hash (sorted starIds set — NOT centroid, NOT order)
// ---------------------------------------------------------------------------

/** Deterministic 53-bit-ish FNV-1a hash over a string, hex-encoded. */
function fnv1aHex(input: string): string {
    // 32-bit FNV-1a, run twice with different offsets for a wider, stable id.
    let h1 = 0x811c9dc5;
    let h2 = 0xcbf29ce4 >>> 0;
    for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i);
        h1 ^= c;
        h1 = Math.imul(h1, 0x01000193) >>> 0;
        h2 ^= c + 0x9e;
        h2 = Math.imul(h2, 0x01000193) >>> 0;
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/** loopId from the SORTED set of member starIds (order-independent). */
function loopIdFromStarIds(starIds: string[]): string {
    const sorted = [...new Set(starIds)].sort();
    return `L:${fnv1aHex(sorted.join(''))}`;
}

// ---------------------------------------------------------------------------
// walkRegionLoops
// ---------------------------------------------------------------------------

/**
 * Trace every bounded face of the border graph with the angular-order walk and
 * keep those with a real (non-WORLD) owner as RegionLoops.
 *
 * Face owner & membership are derived STRUCTURALLY, not geometrically: every
 * half-edge carries the cell that contributed it (the cell whose interior is on
 * its LEFT — see buildInteriorLeftTags), and the walk keeps the face interior
 * on the left, so a face's owner is simply the owner of its half-edges' left
 * cells. Full membership (`starIds`) comes from the same-owner connected
 * component of those boundary cells, which also covers INTERIOR cells whose
 * edges never reached the border graph. The unbounded outer face (CW / negative
 * signed area) and any face with no contributing cell (pure WORLD boundary
 * face) are discarded.
 */
export function walkRegionLoops(
    graph: SharedEdgeGraph,
    cells: PowerCell[],
): RegionLoop[] {
    const interiorLeftTags = buildInteriorLeftTags(cells);
    const componentBySite = buildSameOwnerComponents(cells);
    const ownerBySite = new Map<string, string>();
    for (const cell of cells) ownerBySite.set(cell.siteId, cell.ownerId);

    const halfEdges = buildHalfEdges(graph, interiorLeftTags);
    if (halfEdges.length === 0) return [];

    const visited = new Array<boolean>(halfEdges.length).fill(false);
    const loops: RegionLoop[] = [];

    for (let start = 0; start < halfEdges.length; start++) {
        if (visited[start]) continue;

        // Trace the face containing half-edge `start`.
        const faceHalfEdges: HalfEdge[] = [];
        let cur = start;
        let guard = 0;
        const maxGuard = halfEdges.length + 4;
        while (!visited[cur]) {
            visited[cur] = true;
            const h = halfEdges[cur];
            faceHalfEdges.push(h);
            cur = h.nextId;
            if (++guard > maxGuard) break; // safety; should never trigger
        }

        // Reconstruct the face ring from half-edge tails.
        const ring: Point[] = faceHalfEdges.map((h) => h.fromPt);
        if (ring.length < 3) continue;

        const area = signedArea(ring);
        // Outer (unbounded) face winds CW => negative area. Skip it.
        if (area <= 0) continue;

        // Determine owner + boundary cells from the half-edges' left-cell tags:
        // the walk keeps the face interior on the LEFT, and each tag is the cell
        // whose interior is on the left of that half-edge — so every tagged cell
        // is a member of THIS face's region, by construction.
        const boundarySiteIds = new Set<string>();
        const ownerVotes = new Map<string, number>();
        for (const h of faceHalfEdges) {
            const tag = h.leftCell;
            if (!tag) continue;
            boundarySiteIds.add(tag.siteId);
            ownerVotes.set(tag.ownerId, (ownerVotes.get(tag.ownerId) ?? 0) + 1);
        }

        if (boundarySiteIds.size === 0) continue; // pure WORLD / spurious face

        // Owner = the (single) owner of the contributing cells. If somehow mixed
        // (should not happen for a well-formed power diagram), take the majority
        // then lexicographically-smallest for determinism.
        let ownerId = '';
        let bestVotes = -1;
        for (const [owner, votes] of [...ownerVotes.entries()].sort((a, b) =>
            a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
        )) {
            if (votes > bestVotes) {
                bestVotes = votes;
                ownerId = owner;
            }
        }
        if (ownerId === WORLD_OWNER || ownerId === '') continue;

        // Full membership: expand boundary cells to their same-owner connected
        // component (covers interior cells with no border-graph edges). Only
        // same-owner components count — a stray mixed tag never leaks members.
        const memberSet = new Set<string>();
        for (const siteId of boundarySiteIds) {
            if (ownerBySite.get(siteId) !== ownerId) continue;
            const component = componentBySite.get(siteId);
            if (component) for (const member of component) memberSet.add(member);
            else memberSet.add(siteId);
        }
        const memberSiteIds = [...memberSet].sort();
        if (memberSiteIds.length === 0) continue;

        const orderedEdgeRefs: RegionLoopEdgeRef[] = faceHalfEdges.map((h) => ({
            edgeId: h.edgeId,
            forward: h.forward,
            kind: h.kind,
        }));

        loops.push({
            loopId: loopIdFromStarIds(memberSiteIds),
            ownerId,
            starIds: [...memberSiteIds].sort(),
            orderedEdgeRefs,
        });
    }

    // Deterministic output ordering by loopId.
    loops.sort((a, b) => (a.loopId < b.loopId ? -1 : a.loopId > b.loopId ? 1 : 0));
    return loops;
}

// ---------------------------------------------------------------------------
// reconstructLoopPolygon — derive the closed point ring from edge refs.
// ---------------------------------------------------------------------------

/**
 * Read a loop's polygon from the referenced edges' `smoothedPts`, in traversal
 * order, honoring `forward`. This is the ONLY way fills/borders get their points,
 * which is what makes fill/border divergence impossible: both sides of a
 * SharedEdge read the same `smoothedPts`.
 *
 * Consecutive edges share an endpoint, so each edge after the first contributes
 * all but its first point (de-duplicating the shared junction vertex). The ring
 * is returned WITHOUT an explicit closing duplicate (callers treat it as closed).
 */
export function reconstructLoopPolygon(
    loop: RegionLoop,
    graph: SharedEdgeGraph,
): Point[] {
    const sharedById = new Map<string, SharedEdge>();
    for (const e of graph.sharedEdges) sharedById.set(e.edgeId, e);
    const worldById = new Map<string, WorldEdge>();
    for (const e of graph.worldEdges) worldById.set(e.edgeId, e);

    const ring: Point[] = [];
    for (const ref of loop.orderedEdgeRefs) {
        const pts =
            ref.kind === 'shared'
                ? sharedById.get(ref.edgeId)?.smoothedPts
                : worldById.get(ref.edgeId)?.smoothedPts;
        if (!pts || pts.length < 2) continue;
        const seq = ref.forward ? pts : [...pts].slice().reverse();
        if (ring.length === 0) {
            ring.push(seq[0]);
        }
        for (let i = 1; i < seq.length; i++) {
            ring.push(seq[i]);
        }
    }

    // Drop a trailing point that duplicates the first (closing vertex), so the
    // ring is a clean open list of unique vertices.
    if (ring.length >= 2) {
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (pointKey(first) === pointKey(last)) ring.pop();
    }
    return ring;
}

// ---------------------------------------------------------------------------
// LIMITATIONS (Phase 1)
// ---------------------------------------------------------------------------
// 1. Exactly-collinear / coincident "T" junctions where three+ owner boundaries
//    meet at a single endpoint-pair with identical keys collapse to one edge; the
//    walk handles ordinary k-way junctions (distinct spokes) correctly, but truly
//    degenerate overlapping spokes (zero-area wedges) are tie-broken by toKey and
//    may pick an arbitrary-but-deterministic continuation. None of the 6 spec
//    cases hit this. A robust fix would split such edges at the junction.
// 2. Owner assignment assumes each bounded face is a union of a SINGLE owner's
//    cells (true for a power diagram). Mixed-owner faces (impossible without
//    upstream corruption) are resolved by majority+lexicographic vote, not error.
