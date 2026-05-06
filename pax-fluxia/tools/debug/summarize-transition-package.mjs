import { promises as fs } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const STAGE_FILES = {
    frameInput: '01_frame_input.json',
    ownershipPrev: '02_ownership_prev.json',
    ownershipNext: '02_ownership_next.json',
    geometryPrevFull: '03_geometry_prev_full.json',
    geometryNextFull: '03_geometry_next_full.json',
    topologyPrevFull: '04_topology_prev_full.json',
    topologyNextFull: '04_topology_next_full.json',
    transitionSnapshot: '05_transition_snapshot.json',
    transitionTruth: '05_transition_truth.json',
    activeFrontPlan: '05_active_front_plan.json',
};

const COMPACT_FILES = {
    diagnostic: 'compact_diag.json',
    topology: 'compact_topology.json',
    geometry: 'compact_geometry.json',
};

const LEGACY_FILES = {
    diagnostic: 'diagnostic.json',
    geometrySnapshot: 'geometry_snapshot.json',
    topology: 'topology.json',
};

function usage() {
    console.log(
        [
            'Usage:',
            '  node tools/debug/summarize-transition-package.mjs <package-dir-or-zip> [--json]',
            '',
            'Examples:',
            '  node tools/debug/summarize-transition-package.mjs "C:\\Users\\mikep\\Downloads\\19-07-58---665"',
            '  node tools/debug/summarize-transition-package.mjs "C:\\Users\\mikep\\Downloads\\19-07-58---665_tdp.zip" --json',
        ].join('\n'),
    );
}

function parseArgs(argv) {
    const flags = new Set();
    const positional = [];
    for (const arg of argv) {
        if (arg.startsWith('--')) {
            flags.add(arg);
        } else {
            positional.push(arg);
        }
    }
    return {
        inputPath: positional[0] ?? null,
        asJson: flags.has('--json'),
        help: flags.has('--help') || flags.has('-h'),
    };
}

async function statOrNull(filePath) {
    try {
        return await fs.stat(filePath);
    } catch {
        return null;
    }
}

async function createReader(inputPath) {
    const stat = await statOrNull(inputPath);
    if (!stat) {
        throw new Error(`Path not found: ${inputPath}`);
    }

    if (stat.isDirectory()) {
        const inputBasename = path.basename(inputPath).toLowerCase();
        const debugDirStat = await statOrNull(path.join(inputPath, 'debug'));
        const rootDir =
            debugDirStat?.isDirectory()
                ? inputPath
                : inputBasename === 'debug'
                  ? path.dirname(inputPath)
                  : null;
        if (!rootDir) {
            throw new Error(
                `Directory does not look like a transition package root or debug folder: ${inputPath}`,
            );
        }
        return {
            sourceKind: 'directory',
            sourcePath: rootDir,
            async readText(relativePath) {
                return await fs.readFile(path.join(rootDir, relativePath), 'utf8');
            },
            async exists(relativePath) {
                return Boolean(await statOrNull(path.join(rootDir, relativePath)));
            },
            async list(relativeDir) {
                const target = path.join(rootDir, relativeDir);
                const dirStat = await statOrNull(target);
                if (!dirStat?.isDirectory()) return [];
                const entries = await fs.readdir(target);
                return entries.sort();
            },
        };
    }

    if (path.extname(inputPath).toLowerCase() !== '.zip') {
        throw new Error(`Expected a directory or .zip file: ${inputPath}`);
    }

    const zip = await JSZip.loadAsync(await fs.readFile(inputPath));
    return {
        sourceKind: 'zip',
        sourcePath: inputPath,
        async readText(relativePath) {
            const file = zip.file(relativePath);
            if (!file) {
                throw new Error(`Missing file in zip: ${relativePath}`);
            }
            return await file.async('text');
        },
        async exists(relativePath) {
            return zip.file(relativePath) !== null;
        },
        async list(relativeDir) {
            const prefix = relativeDir.endsWith('/') ? relativeDir : `${relativeDir}/`;
            return Object.keys(zip.files)
                .filter((name) => name.startsWith(prefix) && !name.endsWith('/'))
                .map((name) => name.slice(prefix.length))
                .filter((name) => name.length > 0 && !name.includes('/'))
                .sort();
        },
    };
}

async function readJsonIfExists(reader, relativePath) {
    if (!(await reader.exists(relativePath))) return null;
    return JSON.parse(await reader.readText(relativePath));
}

function pickDebugFile(debugEntries, exactNames, suffixes = []) {
    for (const exactName of exactNames) {
        if (debugEntries.includes(exactName)) {
            return `debug/${exactName}`;
        }
    }

    for (const suffix of suffixes) {
        const match = debugEntries.find((entry) => entry.endsWith(suffix));
        if (match) {
            return `debug/${match}`;
        }
    }

    return null;
}

async function discoverExportLayout(reader) {
    const debugEntries = await reader.list('debug');

    return {
        manifestPath: pickDebugFile(
            debugEntries,
            [COMPACT_FILES.diagnostic, LEGACY_FILES.diagnostic],
            ['_diagnostic.json'],
        ),
        frameInputPath: pickDebugFile(debugEntries, [STAGE_FILES.frameInput]),
        ownershipPrevPath: pickDebugFile(debugEntries, [STAGE_FILES.ownershipPrev]),
        ownershipNextPath: pickDebugFile(debugEntries, [STAGE_FILES.ownershipNext]),
        geometryPrevFullPath: pickDebugFile(debugEntries, [STAGE_FILES.geometryPrevFull]),
        geometryNextFullPath: pickDebugFile(debugEntries, [STAGE_FILES.geometryNextFull]),
        geometrySnapshotPath: pickDebugFile(
            debugEntries,
            [LEGACY_FILES.geometrySnapshot, COMPACT_FILES.geometry],
            ['_geometry_snapshot.json'],
        ),
        topologyPrevFullPath: pickDebugFile(debugEntries, [STAGE_FILES.topologyPrevFull]),
        topologyNextFullPath: pickDebugFile(debugEntries, [STAGE_FILES.topologyNextFull]),
        topologySnapshotPath: pickDebugFile(
            debugEntries,
            [LEGACY_FILES.topology, COMPACT_FILES.topology],
            ['_topology.json'],
        ),
        transitionSnapshotPath: pickDebugFile(debugEntries, [STAGE_FILES.transitionSnapshot]),
        transitionTruthPath: pickDebugFile(debugEntries, [STAGE_FILES.transitionTruth]),
        activeFrontPlanPath: pickDebugFile(debugEntries, [STAGE_FILES.activeFrontPlan]),
    };
}

function arrayCount(value) {
    return Array.isArray(value) ? value.length : 0;
}

function objectSize(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? Object.keys(value).length
        : 0;
}

function summarizeGeometry(geometry) {
    if (!geometry || typeof geometry !== 'object') return null;
    return {
        version: geometry.version ?? null,
        regionCount: arrayCount(geometry.territoryRegions),
        frontierCount: arrayCount(geometry.frontierPolylines),
        shellLoopCount:
            arrayCount(geometry.shellLoops) ||
            arrayCount(geometry.loops),
    };
}

function summarizeTopology(topology) {
    if (!topology || typeof topology !== 'object') return null;
    return {
        version: topology.version ?? null,
        vertexCount:
            topology.vertexCount ??
            arrayCount(topology.vertices),
        sectionCount:
            topology.sectionCount ??
            arrayCount(topology.sections),
        loopCount:
            topology.loopCount ??
            arrayCount(topology.loops),
    };
}

function summarizeOwnership(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    return {
        version: snapshot.version ?? null,
        starOwnerCount:
            objectSize(snapshot.starOwners) ||
            arrayCount(snapshot.starOwners),
        contestedLaneCount: arrayCount(snapshot.contestedLaneIds),
        conquestEventCount: arrayCount(snapshot.conquestEvents),
    };
}

function pluckActiveFrontDiagnostics(manifest, transitionTruth, activeFrontPlan) {
    const compactCapture = manifest?.captureDiagnostics;
    const extraDiagnostics = transitionTruth?.extraDiagnostics;
    const activeFrontCapture =
        extraDiagnostics?.activeFrontDebug
            ? extraDiagnostics
            : compactCapture?.activeFrontDebug
              ? compactCapture
              : null;
    const activeFrontDebug = activeFrontCapture?.activeFrontDebug ?? null;
    const planSummary =
        activeFrontDebug?.planSummary ??
        activeFrontPlan?.diagnostics?.summary ??
        activeFrontPlan?.summary ??
        null;

    return {
        evaluation:
            activeFrontDebug?.evaluation ??
            planSummary?.classification ??
            null,
        pathUsed:
            activeFrontDebug?.pathUsed ??
            manifest?.modes?.fillTransition ??
            null,
        frontCount: activeFrontDebug?.frontCount ?? arrayCount(activeFrontPlan?.fronts),
        collapseTargetCount:
            activeFrontDebug?.collapseTargetCount ??
            arrayCount(activeFrontPlan?.collapseTargets),
        sampledProgress: activeFrontDebug?.sampledProgress ?? null,
        stableAnchorCount: planSummary?.stableAnchorCount ?? null,
        pairKeyCount:
            planSummary?.pairKeyCount ??
            planSummary?.pairCount ??
            null,
        plannedPairCount: planSummary?.plannedPairCount ?? null,
        topologyGapCount:
            planSummary?.defectTopologyGapCount ??
            planSummary?.skippedTopologyGapCount ??
            null,
        unsupportedSplitCount:
            planSummary?.defectUnsupportedSplitCount ??
            planSummary?.skippedUnsupportedSplitCount ??
            null,
        noChangeSpanCount:
            planSummary?.defectNoChangeSpanCount ??
            planSummary?.skippedNoChangeSpanCount ??
            null,
        activeSectionCount:
            planSummary?.defectSectionCount ??
            planSummary?.activeSectionCount ??
            null,
    };
}

function buildCaseHints(manifest, activeFrontPlan, activeFront) {
    const eventCount = arrayCount(manifest?.conquestEvents);
    const splitModes = new Set(
        (activeFrontPlan?.fronts ?? [])
            .map((front) => front?.splitMode)
            .filter(Boolean),
    );
    const hints = [];

    if (eventCount === 1 && activeFront.frontCount === 1 && splitModes.size === 0) {
        hints.push('TC-01 simple 1:1 conquest');
    }
    if (eventCount > 1) {
        hints.push('TC-02 dual conquest or multi-conquest');
    }
    if (splitModes.has('1to2')) {
        hints.push('TC-03 split 1:2');
    }
    if (splitModes.has('2to1')) {
        hints.push('TC-04 merge 2:1');
    }
    if ((activeFront.collapseTargetCount ?? 0) > 0) {
        hints.push('TC-05/TC-06 final-region disappearance');
    }
    if ((activeFront.topologyGapCount ?? 0) > 0) {
        hints.push('TC-07 topology gap');
    }

    return hints;
}

async function buildSummary(inputPath) {
    const reader = await createReader(inputPath);
    const exportLayout = await discoverExportLayout(reader);
    const manifest = exportLayout.manifestPath
        ? await readJsonIfExists(reader, exportLayout.manifestPath)
        : null;
    if (!manifest) {
        throw new Error('Missing recognizable diagnostic manifest in debug/');
    }
    const frameInput = exportLayout.frameInputPath
        ? await readJsonIfExists(reader, exportLayout.frameInputPath)
        : null;
    const ownershipPrev = exportLayout.ownershipPrevPath
        ? await readJsonIfExists(reader, exportLayout.ownershipPrevPath)
        : null;
    const ownershipNext = exportLayout.ownershipNextPath
        ? await readJsonIfExists(reader, exportLayout.ownershipNextPath)
        : null;
    const geometrySnapshot = exportLayout.geometrySnapshotPath
        ? await readJsonIfExists(reader, exportLayout.geometrySnapshotPath)
        : null;
    const geometryPrevStaged = exportLayout.geometryPrevFullPath
        ? await readJsonIfExists(reader, exportLayout.geometryPrevFullPath)
        : null;
    const geometryNextStaged = exportLayout.geometryNextFullPath
        ? await readJsonIfExists(reader, exportLayout.geometryNextFullPath)
        : null;
    const geometryPrev =
        geometryPrevStaged ??
        geometrySnapshot?.prevGeometry ??
        geometrySnapshot?.previousGeometry ??
        manifest?.previousGeometry ??
        null;
    const geometryNext =
        geometryNextStaged ??
        geometrySnapshot?.nextGeometry ??
        manifest?.nextGeometry ??
        null;
    const topologySnapshot = exportLayout.topologySnapshotPath
        ? await readJsonIfExists(reader, exportLayout.topologySnapshotPath)
        : null;
    const topologyPrevStaged = exportLayout.topologyPrevFullPath
        ? await readJsonIfExists(reader, exportLayout.topologyPrevFullPath)
        : null;
    const topologyNextStaged = exportLayout.topologyNextFullPath
        ? await readJsonIfExists(reader, exportLayout.topologyNextFullPath)
        : null;
    const topologyPrev =
        topologyPrevStaged ??
        topologySnapshot?.prevTopology ??
        topologySnapshot?.previousTopology ??
        manifest?.previousTopology ??
        null;
    const topologyNext =
        topologyNextStaged ??
        topologySnapshot?.nextTopology ??
        manifest?.nextTopology ??
        null;
    const transitionTruth = exportLayout.transitionTruthPath
        ? await readJsonIfExists(reader, exportLayout.transitionTruthPath)
        : null;
    const activeFrontPlan = exportLayout.activeFrontPlanPath
        ? await readJsonIfExists(reader, exportLayout.activeFrontPlanPath)
        : manifest?.captureDiagnostics?.activeFrontPlan ?? null;
    const renderFiles = await reader.list('render');

    const activeFront = pluckActiveFrontDiagnostics(
        manifest,
        transitionTruth,
        activeFrontPlan,
    );

    return {
        sourceKind: reader.sourceKind,
        sourcePath: reader.sourcePath,
        package: {
            bundleId: manifest.bundleId ?? null,
            conquestLabel: manifest.conquestLabel ?? null,
            timestamp: manifest.timestamp ?? null,
            transitionId: manifest.transitionId ?? null,
            modes: manifest.modes ?? null,
            exportKind: manifest.exportKind ?? null,
            selectedFrames: manifest.selectedFrames ?? [],
            renderFiles,
        },
        conquestEvents: manifest.conquestEvents ?? [],
        frameInput: frameInput
            ? {
                  tickId: frameInput.tickId ?? null,
                  nowMs: frameInput.nowMs ?? null,
                  starCount: arrayCount(frameInput.stars),
                  laneCount: arrayCount(frameInput.lanes),
              }
            : null,
        ownership: {
            previous: summarizeOwnership(ownershipPrev),
            next: summarizeOwnership(ownershipNext),
        },
        geometry: {
            previous: summarizeGeometry(geometryPrev),
            next: summarizeGeometry(geometryNext),
        },
        topology: {
            previous: summarizeTopology(topologyPrev),
            next: summarizeTopology(topologyNext),
        },
        activeFront,
        caseHints: buildCaseHints(manifest, activeFrontPlan, activeFront),
    };
}

function formatEvent(event) {
    return `${event.starId}: ${event.previousOwner} -> ${event.newOwner} @ ${event.atMs}`;
}

function printSummary(summary) {
    const lines = [];
    lines.push('Transition Package Summary');
    lines.push(`Source: ${summary.sourcePath} (${summary.sourceKind})`);
    lines.push(`Conquest: ${summary.package.conquestLabel ?? 'n/a'}`);
    lines.push(`Bundle: ${summary.package.bundleId ?? 'n/a'}`);
    lines.push(`Transition: ${summary.package.transitionId ?? 'n/a'}`);
    lines.push(`Timestamp: ${summary.package.timestamp ?? 'n/a'}`);
    lines.push(`Export kind: ${summary.package.exportKind ?? 'n/a'}`);
    lines.push('');

    lines.push(`Events (${summary.conquestEvents.length})`);
    for (const event of summary.conquestEvents) {
        lines.push(`- ${formatEvent(event)}`);
    }
    lines.push('');

    if (summary.frameInput) {
        lines.push(
            `Frame input: tick=${summary.frameInput.tickId ?? 'n/a'} nowMs=${summary.frameInput.nowMs ?? 'n/a'} stars=${summary.frameInput.starCount} lanes=${summary.frameInput.laneCount}`,
        );
    }

    const ownPrev = summary.ownership.previous;
    const ownNext = summary.ownership.next;
    lines.push(
        `Ownership: prev owners=${ownPrev?.starOwnerCount ?? 'n/a'} contested=${ownPrev?.contestedLaneCount ?? 'n/a'} version=${ownPrev?.version ?? 'n/a'}`,
    );
    lines.push(
        `           next owners=${ownNext?.starOwnerCount ?? 'n/a'} contested=${ownNext?.contestedLaneCount ?? 'n/a'} version=${ownNext?.version ?? 'n/a'}`,
    );

    const geoPrev = summary.geometry.previous;
    const geoNext = summary.geometry.next;
    lines.push(
        `Geometry: prev regions=${geoPrev?.regionCount ?? 'n/a'} frontiers=${geoPrev?.frontierCount ?? 'n/a'} loops=${geoPrev?.shellLoopCount ?? 'n/a'}`,
    );
    lines.push(
        `          next regions=${geoNext?.regionCount ?? 'n/a'} frontiers=${geoNext?.frontierCount ?? 'n/a'} loops=${geoNext?.shellLoopCount ?? 'n/a'}`,
    );

    const topoPrev = summary.topology.previous;
    const topoNext = summary.topology.next;
    lines.push(
        `Topology: prev vertices=${topoPrev?.vertexCount ?? 'n/a'} sections=${topoPrev?.sectionCount ?? 'n/a'} loops=${topoPrev?.loopCount ?? 'n/a'}`,
    );
    lines.push(
        `          next vertices=${topoNext?.vertexCount ?? 'n/a'} sections=${topoNext?.sectionCount ?? 'n/a'} loops=${topoNext?.loopCount ?? 'n/a'}`,
    );
    lines.push('');

    lines.push('PVV4 active-front');
    lines.push(`- evaluation: ${summary.activeFront.evaluation ?? 'n/a'}`);
    lines.push(`- path: ${summary.activeFront.pathUsed ?? 'n/a'}`);
    lines.push(`- fronts: ${summary.activeFront.frontCount ?? 'n/a'}`);
    lines.push(`- collapse targets: ${summary.activeFront.collapseTargetCount ?? 'n/a'}`);
    lines.push(`- sampled progress: ${summary.activeFront.sampledProgress ?? 'n/a'}`);
    lines.push(`- stable anchors: ${summary.activeFront.stableAnchorCount ?? 'n/a'}`);
    lines.push(`- pair keys: ${summary.activeFront.pairKeyCount ?? 'n/a'}`);
    lines.push(`- planned pairs: ${summary.activeFront.plannedPairCount ?? 'n/a'}`);
    lines.push(`- topology gaps: ${summary.activeFront.topologyGapCount ?? 'n/a'}`);
    lines.push(`- unsupported splits: ${summary.activeFront.unsupportedSplitCount ?? 'n/a'}`);
    lines.push(`- no-change-span pairs: ${summary.activeFront.noChangeSpanCount ?? 'n/a'}`);
    lines.push(`- active sections: ${summary.activeFront.activeSectionCount ?? 'n/a'}`);
    lines.push('');

    lines.push(
        `Render files (${summary.package.renderFiles.length}): ${summary.package.renderFiles.join(', ')}`,
    );
    lines.push(
        `Selected frames: ${(summary.package.selectedFrames ?? []).map((frame) => frame.filename).join(', ') || 'n/a'}`,
    );
    lines.push(
        `Casebook hints: ${summary.caseHints.length ? summary.caseHints.join('; ') : 'no automatic hint'}`,
    );

    console.log(lines.join('\n'));
}

const { inputPath, asJson, help } = parseArgs(process.argv.slice(2));

if (help || !inputPath) {
    usage();
    process.exit(help ? 0 : 1);
}

try {
    const summary = await buildSummary(inputPath);
    if (asJson) {
        console.log(JSON.stringify(summary, null, 2));
    } else {
        printSummary(summary);
    }
} catch (error) {
    console.error(
        error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
}
