import { log } from "../utils/logger";
import { recordPerfEvent } from "./perfProbe";

type PipelineChannel = "sys" | "state" | "data" | "renderer" | "input";

interface PipelineStageLogParams {
    channel?: PipelineChannel;
    context: string;
    stage: string;
    from: string;
    to: string;
    purpose: string;
    summary?: string;
    detail?: Record<string, unknown>;
    logDetail?: Record<string, unknown>;
    perfDetail?: Record<string, unknown>;
    perfEventName?: string;
}

interface StarLike {
    id: string;
    ownerId?: string | null;
    activeShips?: number;
    damagedShips?: number;
}

interface ConnectionLike {
    sourceId: string;
    targetId: string;
}

interface OwnershipLike {
    version?: string;
    starOwners?: ReadonlyMap<string, string>;
    contestedLaneIds?: readonly string[];
    conquestEvents?: readonly unknown[];
    virtualStars?: readonly unknown[];
}

interface GeometryLike {
    version?: string;
    territoryRegions?: readonly { ownerId: string; points: readonly unknown[] }[];
    frontierPolylines?: readonly unknown[];
    worldBorderPolylines?: readonly unknown[];
    shellLoops?: readonly unknown[];
}

interface SceneLike {
    sceneFingerprint?: string;
    staticFingerprint?: string;
    dynamicFingerprint?: string;
    ownedStars?: readonly unknown[];
    staticSamples?: readonly unknown[];
    dynamicSamples?: readonly unknown[];
    samples?: readonly unknown[];
    clusterShips?: readonly number[];
}

interface RendererMetricsLike {
    solveMs?: number;
    textureUploadMs?: number;
    borderMs?: number;
    totalMs?: number;
    reusedFingerprint?: boolean;
    workerRequestMs?: number;
    workerPostMs?: number;
    workerCommitMs?: number;
    workerStaticCacheHit?: boolean;
    workerStaticBuildMs?: number;
    workerDynamicBuildMs?: number;
    workerClassificationMs?: number;
    workerStrokeBuildMs?: number;
}

interface MapDefinitionLike {
    metadata?: {
        name?: string;
        version?: string | number;
    };
    stars?: readonly unknown[];
    connections?: readonly unknown[];
}

interface BaseContextLike {
    ownedStars?: readonly unknown[];
    clusterMap?: ReadonlyMap<string, { clusterIdx: number; ownerId: string }>;
    starStrengthById?: ReadonlyMap<string, number>;
    playerColors?: ReadonlyArray<readonly [number, number, number]>;
    clusterShips?: readonly number[];
    samples?: readonly {
        corridorVirtual?: boolean;
        disconnectVirtual?: boolean;
    }[];
}

interface PerimeterSourceDataLike {
    sources?: readonly unknown[];
    sampleSets?: readonly unknown[];
    flattenedSamples?: readonly unknown[];
}

interface PerimeterVLike {
    ownerId: string;
    loopId: string;
    sectionId: string;
}

interface TransitionPlanLike {
    prevVSet?: readonly PerimeterVLike[];
    nextVSet?: readonly PerimeterVLike[];
    preservedVIds?: ReadonlySet<string>;
    preservedMatchKeys?: ReadonlySet<string>;
    movers?: readonly unknown[];
    appearing?: readonly unknown[];
    disappearing?: readonly unknown[];
    changedSections?: {
        removedSectionIds?: ReadonlySet<string>;
        addedSectionIds?: ReadonlySet<string>;
        unchangedSectionIds?: ReadonlySet<string>;
    };
}

function logByChannel(
    channel: PipelineChannel,
    context: string,
    message: string,
    detail?: Record<string, unknown>,
): void {
    switch (channel) {
        case "sys":
            log.sys(context, message, detail);
            break;
        case "state":
            log.state(context, message, detail);
            break;
        case "renderer":
            log.renderer(context, message, detail);
            break;
        case "input":
            log.input(`[${context}] ${message}`, detail);
            break;
        case "data":
        default:
            log.data(context, message, detail);
            break;
    }
}

export function logPipelineStage(params: PipelineStageLogParams): void {
    const channel = params.channel ?? "data";
    const summarySuffix = params.summary ? ` | ${params.summary}` : "";
    const message =
        `${params.stage}: ${params.from} -> ${params.to}` +
        ` | ${params.purpose}${summarySuffix}`;
    logByChannel(
        channel,
        params.context,
        message,
        params.logDetail ?? params.detail,
    );
    if (params.perfEventName) {
        recordPerfEvent(params.perfEventName, {
            stage: params.stage,
            from: params.from,
            to: params.to,
            purpose: params.purpose,
            summary: params.summary,
            ...(params.perfDetail ?? params.detail ?? {}),
        });
    }
}

export function summarizeStars(stars: ReadonlyArray<StarLike>): string {
    const owners = new Set<string>();
    let neutralCount = 0;
    let totalShips = 0;
    for (const star of stars) {
        const ownerId = star.ownerId ?? "";
        if (ownerId) {
            owners.add(ownerId);
        } else {
            neutralCount += 1;
        }
        totalShips += (star.activeShips ?? 0) + (star.damagedShips ?? 0);
    }
    return [
        `stars=${stars.length}`,
        `owners=${owners.size}`,
        `neutral=${neutralCount}`,
        `ships=${Math.round(totalShips)}`,
    ].join(" ");
}

export function summarizeConnections(
    connections: ReadonlyArray<ConnectionLike>,
): string {
    return `connections=${connections.length}`;
}

export function summarizeMapDefinition(map: MapDefinitionLike): string {
    return [
        `name=${map.metadata?.name ?? 'unknown'}`,
        `version=${map.metadata?.version ?? 'unknown'}`,
        `stars=${map.stars?.length ?? 0}`,
        `connections=${map.connections?.length ?? 0}`,
    ].join(' ');
}

export function summarizeSavedMapRemap(params: {
    factions: ReadonlyArray<string>;
    playerIds: ReadonlyArray<string>;
    remap: ReadonlyMap<string, string>;
    isMidGameSave: boolean;
}): string {
    return [
        `factions=${params.factions.length}`,
        `players=${params.playerIds.length}`,
        `midGame=${params.isMidGameSave ? 1 : 0}`,
        `remapEntries=${params.remap.size}`,
    ].join(' ');
}

export function summarizeOwnership(ownership: OwnershipLike): string {
    return [
        `version=${ownership.version ?? "unknown"}`,
        `owners=${ownership.starOwners?.size ?? 0}`,
        `contested=${ownership.contestedLaneIds?.length ?? 0}`,
        `conquests=${ownership.conquestEvents?.length ?? 0}`,
        `virtualStars=${ownership.virtualStars?.length ?? 0}`,
    ].join(" ");
}

export function summarizeGeometry(geometry: GeometryLike | null | undefined): string {
    if (!geometry) return "geometry=null";
    return [
        `version=${geometry.version ?? "unknown"}`,
        `regions=${geometry.territoryRegions?.length ?? 0}`,
        `frontiers=${geometry.frontierPolylines?.length ?? 0}`,
        `worldBorders=${geometry.worldBorderPolylines?.length ?? 0}`,
        `shellLoops=${geometry.shellLoops?.length ?? 0}`,
    ].join(" ");
}

export function summarizeScene(scene: SceneLike): string {
    const sampleCount = scene.samples?.length ?? 0;
    const clusterShips = scene.clusterShips ?? [];
    const totalClusterShips = clusterShips.reduce(
        (sum, ships) => sum + ships,
        0,
    );
    return [
        `fingerprint=${scene.sceneFingerprint ?? "none"}`,
        `staticSamples=${scene.staticSamples?.length ?? 0}`,
        `dynamicSamples=${scene.dynamicSamples?.length ?? 0}`,
        `samples=${sampleCount}`,
        `ownedStars=${scene.ownedStars?.length ?? 0}`,
        `clusterShips=${Math.round(totalClusterShips)}`,
    ].join(" ");
}

export function summarizeMetaballBaseContext(context: BaseContextLike): string {
    const samples = context.samples ?? [];
    let corridorSamples = 0;
    let disconnectSamples = 0;
    for (const sample of samples) {
        if (sample.corridorVirtual) corridorSamples += 1;
        if (sample.disconnectVirtual) disconnectSamples += 1;
    }
    return [
        `ownedStars=${context.ownedStars?.length ?? 0}`,
        `clusters=${context.clusterMap?.size ?? 0}`,
        `starStrengths=${context.starStrengthById?.size ?? 0}`,
        `palette=${context.playerColors?.length ?? 0}`,
        `samples=${samples.length}`,
        `corridor=${corridorSamples}`,
        `disconnect=${disconnectSamples}`,
    ].join(' ');
}

export function summarizePerimeterSourceData(
    data: PerimeterSourceDataLike,
): string {
    return [
        `sources=${data.sources?.length ?? 0}`,
        `sampleSets=${data.sampleSets?.length ?? 0}`,
        `flattened=${data.flattenedSamples?.length ?? 0}`,
    ].join(' ');
}

export function summarizePerimeterVSet(vs: readonly PerimeterVLike[]): string {
    const owners = new Set<string>();
    const loops = new Set<string>();
    const sections = new Set<string>();
    for (const v of vs) {
        owners.add(v.ownerId);
        loops.add(v.loopId);
        sections.add(v.sectionId);
    }
    return [
        `samples=${vs.length}`,
        `owners=${owners.size}`,
        `loops=${loops.size}`,
        `sections=${sections.size}`,
    ].join(' ');
}

export function summarizeTransitionPlan(plan: TransitionPlanLike): string {
    return [
        `prevV=${plan.prevVSet?.length ?? 0}`,
        `nextV=${plan.nextVSet?.length ?? 0}`,
        `preservedV=${plan.preservedVIds?.size ?? 0}`,
        `preservedKeys=${plan.preservedMatchKeys?.size ?? 0}`,
        `movers=${plan.movers?.length ?? 0}`,
        `appearing=${plan.appearing?.length ?? 0}`,
        `disappearing=${plan.disappearing?.length ?? 0}`,
        `removedSections=${plan.changedSections?.removedSectionIds?.size ?? 0}`,
        `addedSections=${plan.changedSections?.addedSectionIds?.size ?? 0}`,
        `unchangedSections=${plan.changedSections?.unchangedSectionIds?.size ?? 0}`,
    ].join(' ');
}

export function summarizeRendererMetrics(
    metrics: RendererMetricsLike,
): string {
    const parts = [
        `solveMs=${(metrics.solveMs ?? 0).toFixed(3)}`,
        `uploadMs=${(metrics.textureUploadMs ?? 0).toFixed(3)}`,
        `borderMs=${(metrics.borderMs ?? 0).toFixed(3)}`,
        `totalMs=${(metrics.totalMs ?? 0).toFixed(3)}`,
        `reused=${metrics.reusedFingerprint ? 1 : 0}`,
    ];
    if (
        metrics.workerRequestMs !== undefined ||
        metrics.workerPostMs !== undefined ||
        metrics.workerCommitMs !== undefined
    ) {
        parts.push(`workerReqMs=${(metrics.workerRequestMs ?? 0).toFixed(3)}`);
        parts.push(`workerPostMs=${(metrics.workerPostMs ?? 0).toFixed(3)}`);
        parts.push(`workerCommitMs=${(metrics.workerCommitMs ?? 0).toFixed(3)}`);
        parts.push(`workerStaticHit=${metrics.workerStaticCacheHit ? 1 : 0}`);
        parts.push(`workerStaticBuildMs=${(metrics.workerStaticBuildMs ?? 0).toFixed(3)}`);
        parts.push(`workerDynamicBuildMs=${(metrics.workerDynamicBuildMs ?? 0).toFixed(3)}`);
        parts.push(`workerClassifyMs=${(metrics.workerClassificationMs ?? 0).toFixed(3)}`);
        parts.push(`workerStrokeMs=${(metrics.workerStrokeBuildMs ?? 0).toFixed(3)}`);
    }
    return parts.join(" ");
}

