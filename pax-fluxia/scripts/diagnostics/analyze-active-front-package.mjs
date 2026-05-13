#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const packagePath = args[0] ? path.resolve(args[0]) : null;
const asJson = args.includes('--json');

if (!packagePath) {
    console.error('Usage: bun pax-fluxia/scripts/diagnostics/analyze-active-front-package.mjs <transition-package-dir> [--json]');
    process.exit(1);
}

function isDirectory(value) {
    try {
        return fs.statSync(value).isDirectory();
    } catch {
        return false;
    }
}

function findDebugDir(root) {
    const direct = path.join(root, 'debug');
    if (isDirectory(direct)) return direct;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const nested = path.join(root, entry.name, 'debug');
        if (isDirectory(nested)) return nested;
    }
    throw new Error(`No debug directory found under ${root}`);
}

const debugDir = findDebugDir(packagePath);

function findDebugFile(suffix) {
    const file = fs
        .readdirSync(debugDir)
        .find((name) => name.endsWith(`_${suffix}.json`) || name === `${suffix}.json`);
    if (!file) throw new Error(`Missing ${suffix}.json in ${debugDir}`);
    return path.join(debugDir, file);
}

function readJson(suffix) {
    return JSON.parse(fs.readFileSync(findDebugFile(suffix), 'utf8'));
}

const plan = readJson('05_active_front_plan');
const truth = readJson('05_transition_truth');
const prevTopology = readJson('04_topology_prev_full');
const nextTopology = readJson('04_topology_next_full');

function point(value) {
    if (!value) return null;
    if (Array.isArray(value)) return [Number(value[0]), Number(value[1])];
    if (typeof value === 'object' && Number.isFinite(value.x) && Number.isFinite(value.y)) {
        return [Number(value.x), Number(value.y)];
    }
    return null;
}

function fmt(value) {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function formatPoint(value) {
    const p = point(value);
    return p ? `(${fmt(p[0])},${fmt(p[1])})` : '(?,?)';
}

function distance(a, b) {
    const pa = point(a);
    const pb = point(b);
    if (!pa || !pb) return Number.POSITIVE_INFINITY;
    return Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
}

function sectionsObject(topology) {
    return topology.sections && typeof topology.sections === 'object'
        ? topology.sections
        : {};
}

function sectionById(topology, id) {
    return sectionsObject(topology)[id] ?? null;
}

function sectionPair(section) {
    if (!section) return 'unknown';
    if (section.ownerPairKey) return section.ownerPairKey;
    const left = section.leftOwnerId ?? section.leftOwner ?? section.leftInfluence?.ownerId;
    const right = section.rightOwnerId ?? section.rightOwner ?? section.rightInfluence?.ownerId;
    return [left, right].filter(Boolean).sort().join('|') || 'unknown';
}

function sectionInfluences(section) {
    if (!section) return 'unknown';
    const left = section.leftInfluence?.primaryStarId ?? section.leftInfluenceId;
    const right = section.rightInfluence?.primaryStarId ?? section.rightInfluenceId;
    return [left, right].filter(Boolean).sort().join('|') || 'unknown';
}

function sectionPoints(section) {
    return (section?.points ?? [])
        .map(point)
        .filter(Boolean);
}

function orientSectionPoints(section, currentVertexId) {
    const points = sectionPoints(section);
    if (!currentVertexId || currentVertexId === section?.startVertexId) return points;
    if (currentVertexId === section?.endVertexId) return [...points].reverse();
    return points;
}

function appendPolyline(out, points) {
    for (const p of points) {
        if (out.length > 0 && distance(out[out.length - 1], p) <= 1e-6) continue;
        out.push(p);
    }
}

function buildPathPoints(topology, chainPath) {
    const out = [];
    let currentVertexId = chainPath?.anchorStartId ?? null;
    for (const sectionId of chainPath?.sectionIds ?? []) {
        const section = sectionById(topology, sectionId);
        if (!section) continue;
        const oriented = orientSectionPoints(section, currentVertexId);
        appendPolyline(out, oriented);
        currentVertexId =
            currentVertexId === section.endVertexId
                ? section.startVertexId
                : section.endVertexId;
    }
    return out;
}

function distancePointToSegment(p, a, b) {
    const px = p[0];
    const py = p[1];
    const ax = a[0];
    const ay = a[1];
    const bx = b[0];
    const by = b[1];
    const abx = bx - ax;
    const aby = by - ay;
    const abLen2 = abx * abx + aby * aby;
    if (abLen2 <= 1e-9) return distance(p, a);
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLen2));
    return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

function distancePointToPolyline(p, polyline) {
    const pp = point(p);
    if (!pp || polyline.length === 0) return Number.POSITIVE_INFINITY;
    if (polyline.length === 1) return distance(pp, polyline[0]);
    let best = Number.POSITIVE_INFINITY;
    for (let i = 1; i < polyline.length; i += 1) {
        best = Math.min(best, distancePointToSegment(pp, polyline[i - 1], polyline[i]));
    }
    return best;
}

function average(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function canonicalSectionKey(section) {
    if (!section) return 'unknown';
    const endpoints = [section.startVertexId, section.endVertexId].sort().join('<->');
    return `${endpoints}:${sectionPair(section)}`;
}

function summarizeFront(front, frontIndex) {
    const trace = plan.tvTrace?.[frontIndex] ?? null;
    const traceFrame0 = trace?.traceFrames?.[0] ?? null;
    const prevFront = (traceFrame0?.prevFront ?? []).map(point).filter(Boolean);
    const postFront = (traceFrame0?.postFront ?? []).map(point).filter(Boolean);
    const activeFront0 = (traceFrame0?.activeFront ?? []).map(point).filter(Boolean);
    const currentVectorLengths = prevFront.map((prevPoint, index) => distance(prevPoint, postFront[index]));
    const endpointPinLengths = prevFront.map((prevPoint, index) => distance(prevPoint, activeFront0[index]));
    const prevSourcePaths = (front.prevPaths ?? []).map((chainPath) => buildPathPoints(prevTopology, chainPath));
    const postPaths = (front.nextPaths ?? []).map((chainPath) => buildPathPoints(nextTopology, chainPath));
    const prevSource = prevSourcePaths.flat();
    const postTarget = postPaths.flat();
    const nearestPrevToPost = postFront.map((postPoint) => distancePointToPolyline(postPoint, prevSource));
    const nearestPostToPrev = prevFront.map((prevPoint) => distancePointToPolyline(prevPoint, postTarget));
    const activeSectionData = (front.activeSectionIds ?? []).map((sectionId) => {
        const section = sectionById(nextTopology, sectionId);
        return {
            sectionId,
            ownerPair: sectionPair(section),
            influencePair: sectionInfluences(section),
            canonicalKey: canonicalSectionKey(section),
            pointCount: sectionPoints(section).length,
        };
    });
    const repeatedCanonicalKeys = [...activeSectionData
        .reduce((counts, section) => counts.set(section.canonicalKey, (counts.get(section.canonicalKey) ?? 0) + 1), new Map())
        .entries()]
        .filter(([, count]) => count > 1)
        .map(([key, count]) => ({ key, count }));

    return {
        frontIndex,
        anchors: {
            start: front.anchorStartId,
            end: front.anchorEndId,
            startPoint: front.changeAnchors?.startPoint ?? null,
            endPoint: front.changeAnchors?.endPoint ?? null,
        },
        activeSectionCount: front.activeSectionIds?.length ?? 0,
        activeSections: activeSectionData,
        ownerPairs: [...new Set(activeSectionData.map((section) => section.ownerPair))],
        influencePairs: [...new Set(activeSectionData.map((section) => section.influencePair))],
        repeatedCanonicalKeys,
        prevSource: {
            pathCount: front.prevPaths?.length ?? 0,
            sectionIds: (front.prevPaths ?? []).flatMap((chainPath) => chainPath.sectionIds ?? []),
            pointCount: prevSource.length,
        },
        postTarget: {
            pathCount: front.nextPaths?.length ?? 0,
            sectionIds: (front.nextPaths ?? []).flatMap((chainPath) => chainPath.sectionIds ?? []),
            pointCount: postTarget.length,
        },
        activeFrontWindow: front.activeFrontWindow ?? null,
        tv: {
            requested: trace?.requestedTransitionVertexCount ?? null,
            used: trace?.usedTransitionVertexCount ?? null,
            count: currentVectorLengths.length,
            currentPaired: {
                average: fmt(average(currentVectorLengths)),
                max: fmt(Math.max(0, ...currentVectorLengths)),
                top: currentVectorLengths
                    .map((length, index) => ({
                        index,
                        length: fmt(length),
                        prev: prevFront[index],
                        post: postFront[index],
                    }))
                    .sort((a, b) => b.length - a.length)
                    .slice(0, 5),
            },
            nearestLocalBaseline: {
                postToPrevAverage: fmt(average(nearestPrevToPost)),
                postToPrevMax: fmt(Math.max(0, ...nearestPrevToPost)),
                prevToPostAverage: fmt(average(nearestPostToPrev)),
                prevToPostMax: fmt(Math.max(0, ...nearestPostToPrev)),
            },
            endpointPinAtProgress0: {
                average: fmt(average(endpointPinLengths)),
                max: fmt(Math.max(0, ...endpointPinLengths)),
            },
        },
    };
}

const result = {
    packagePath,
    debugDir,
    summary: plan.diagnostics?.summary ?? null,
    tunables: plan.diagnostics?.tunables ?? null,
    conquestEvents: truth.conquestEvents ?? [],
    fronts: (plan.fronts ?? []).map(summarizeFront),
};

if (asJson) {
    console.log(JSON.stringify(result, null, 2));
} else {
    console.log(`Active-front package: ${path.basename(packagePath)}`);
    console.log(`classification: ${result.summary?.classification ?? 'unknown'} | fronts=${result.summary?.frontCount ?? result.fronts.length} | defects=${result.summary?.defectSectionCount ?? 'unknown'}`);
    console.log(`tunables: TVs=${result.tunables?.transitionVertexCount ?? 'unknown'} stableAnchorEps=${result.tunables?.stableAnchorEps ?? 'unknown'} changeSpanEps=${result.tunables?.changeSpanEps ?? 'unknown'}`);
    console.log('conquests:');
    for (const event of result.conquestEvents) {
        console.log(`  ${event.starId}: ${event.previousOwner} -> ${event.newOwner} via ${event.attackerStarId}`);
    }
    for (const front of result.fronts) {
        console.log('');
        console.log(`front ${front.frontIndex}: CA ${front.anchors.start} -> ${front.anchors.end}`);
        console.log(`  active sections=${front.activeSectionCount} ownerPairs=${front.ownerPairs.join(', ')}`);
        console.log(`  influence pairs=${front.influencePairs.join(', ')}`);
        if (front.repeatedCanonicalKeys.length > 0) {
            console.log(`  repeated section geometry=${front.repeatedCanonicalKeys.map((entry) => `${entry.key} x${entry.count}`).join('; ')}`);
        }
        console.log(`  prev source sections=${front.prevSource.sectionIds.join(' | ') || 'none'}`);
        console.log(`  post target sections=${front.postTarget.sectionIds.join(' | ') || 'none'}`);
        console.log(`  TV paired travel avg=${front.tv.currentPaired.average} max=${front.tv.currentPaired.max}`);
        console.log(`  nearest-local baseline post->prev avg=${front.tv.nearestLocalBaseline.postToPrevAverage} max=${front.tv.nearestLocalBaseline.postToPrevMax}`);
        console.log(`  nearest-local baseline prev->post avg=${front.tv.nearestLocalBaseline.prevToPostAverage} max=${front.tv.nearestLocalBaseline.prevToPostMax}`);
        console.log(`  progress-0 endpoint pin travel avg=${front.tv.endpointPinAtProgress0.average} max=${front.tv.endpointPinAtProgress0.max}`);
        for (const vector of front.tv.currentPaired.top) {
            console.log(`    TV ${vector.index}: ${vector.length}px ${formatPoint(vector.prev)} -> ${formatPoint(vector.post)}`);
        }
    }
}
