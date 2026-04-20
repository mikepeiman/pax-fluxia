import { STAR_TYPE_STATS, generateConnections, type StarType } from "@pax/common";
import {
    AUTHORED_NEUTRAL_OWNER_ID,
    buildRepositoryMapManifest,
    createEmptyAuthoredMap,
    generateLaneMeasurements,
    getFixtureMapManifest,
    loadFixtureMapDefinition,
    serializeAuthoredMap,
    validateAuthoredMapDefinition,
    type AuthoredMeasurementAnchor,
    type FixtureMapManifestEntry,
    type MapValidationIssue,
    type RepositoryMapManifestEntry,
} from "@pax/common/maps";
import { loadBuiltinMaps } from "$lib/config/builtinMaps";
import {
    MAP_EDITOR_BOARD_HEIGHT,
    MAP_EDITOR_BOARD_WIDTH,
    MAP_EDITOR_HEX_PADDING,
    MAP_EDITOR_MIN_STAR_SPACING_TILES,
    MAP_EDITOR_MAX_FACTIONS,
    MAP_EDITOR_STAR_TYPE_OPTIONS,
    editorHexTileDistance,
    getEditorHexCell,
    loadStoredHexRadius,
    normalizeEditorFactions,
    normalizeHexRadius,
    persistHexRadius,
    scalePointBetweenHexRadii,
    snapPointToHexCell,
    snapPointToHexCenter,
} from "$lib/editor/mapEditorPresentation";
import {
    buildRotationalSymmetryCandidates,
    type MapEditorSymmetryFold,
} from "$lib/editor/mapEditorSymmetry";
import { gameStore } from "$lib/stores/gameStore.svelte";
import type { MapDefinition } from "$lib/types/map.types";
import { generateMapThumbnail } from "$lib/utils/mapThumbnail";

export type MapEditorTool =
    | "auto"
    | "place-star"
    | "delete-star"
    | "connect-lane"
    | "paint-owner"
    | "paint-force"
    | "measure";

export interface MapEditorSelection {
    starIds: string[];
    laneIds: string[];
    measurementIds: string[];
}

export interface MapEditorViewport {
    panX: number;
    panY: number;
    zoom: number;
}

interface EditorPoint {
    x: number;
    y: number;
}

interface AutosaveRevision {
    id: string;
    savedAt: string;
    name: string;
    map: MapDefinition;
}

type MapMeasurementDefinition = NonNullable<MapDefinition["measurements"]>[number];
type StarBrushKind = "owner" | "force";
type ApplyMapMutationOptions = {
    pushUndo?: boolean;
    clearRedo?: boolean;
    dirty?: boolean;
    autosave?: boolean;
    preserveSelection?: boolean;
};

const AUTOSAVE_STORAGE_KEY = "pax-map-editor-autosaves-v1";
const AUTOSAVE_LIMIT = 10;
const UNDO_LIMIT = 100;

function cloneMap(map: MapDefinition): MapDefinition {
    return structuredClone($state.snapshot(map));
}

function slugify(value: string): string {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || `map-${Date.now()}`;
}

function loadAutosaves(): AutosaveRevision[] {
    if (typeof localStorage === "undefined") {
        return [];
    }

    try {
        const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as AutosaveRevision[];
        return Array.isArray(parsed) ? parsed.map((entry) => ({
            ...entry,
            map: cloneMap(entry.map),
        })) : [];
    } catch {
        return [];
    }
}

function persistAutosaves(revisions: readonly AutosaveRevision[]): void {
    if (typeof localStorage === "undefined") {
        return;
    }

    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(revisions));
}

function createSelection(): MapEditorSelection {
    return {
        starIds: [],
        laneIds: [],
        measurementIds: [],
    };
}

function nextNumericId(
    existingIds: readonly string[],
    prefix: string,
): number {
    return (
        existingIds.reduce((max, id) => {
            const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
            return match ? Math.max(max, Number(match[1])) : max;
        }, 0) + 1
    );
}

let documentState = $state<MapDefinition>(createEmptyAuthoredMap());
let tool = $state<MapEditorTool>("auto");
let selection = $state<MapEditorSelection>(createSelection());
let viewport = $state<MapEditorViewport>({ panX: 0, panY: 0, zoom: 1 });
let hexRadius = $state(loadStoredHexRadius());
let ownerBrush = $state(AUTHORED_NEUTRAL_OWNER_ID);
let starTypeBrush = $state<StarType>("grey");
let forceBrush = $state(40);
let draftLaneSourceId = $state<string | null>(null);
let draftMeasurementStart = $state<AuthoredMeasurementAnchor | null>(null);
let isDirty = $state(false);
let autosaveRevisions = $state<AutosaveRevision[]>(loadAutosaves());
let undoStack = $state<MapDefinition[]>([]);
let redoStack = $state<MapDefinition[]>([]);
let repositoryMaps = $state<MapDefinition[]>([]);
let builtinMaps = $state<MapDefinition[]>([]);
let fixtureManifest = $state<FixtureMapManifestEntry[]>(getFixtureMapManifest());
let lastLoadedSource = $state<string | null>(null);

const validationIssues = $derived(validateAuthoredMapDefinition(documentState));
const validationErrors = $derived(
    validationIssues.filter((issue) => issue.severity === "error"),
);
const validationWarnings = $derived(
    validationIssues.filter((issue) => issue.severity !== "error"),
);
const repositoryManifest = $derived(
    buildRepositoryMapManifest(repositoryMaps) as RepositoryMapManifestEntry[],
);

function snapPoint(point: EditorPoint): EditorPoint {
    return snapPointToHexCenter(point, hexRadius);
}

function inferStarHexRadius(
    star: MapDefinition["stars"][number],
): number | null {
    if (
        !Number.isFinite(star.x)
        || !Number.isFinite(star.y)
        || !Number.isFinite(star.gridQ)
        || !Number.isFinite(star.gridR)
    ) {
        return null;
    }

    const q = star.gridQ!;
    const r = star.gridR!;
    const xDenominator = 1 + q * 1.5;
    const yDenominator = Math.sqrt(3) * (r + 0.5 + (q % 2 === 1 ? 0.5 : 0));
    const candidates = [
        xDenominator > 0 ? (star.x - MAP_EDITOR_HEX_PADDING) / xDenominator : NaN,
        yDenominator > 0 ? (star.y - MAP_EDITOR_HEX_PADDING) / yDenominator : NaN,
    ].filter((value) => Number.isFinite(value) && value > 0);

    if (candidates.length === 0) {
        return null;
    }

    candidates.sort((left, right) => left - right);
    return normalizeHexRadius(candidates[Math.floor(candidates.length / 2)]!);
}

function inferMapHexRadius(map: MapDefinition): number | null {
    const candidates = map.stars
        .map((star) => inferStarHexRadius(star))
        .filter((value): value is number => value !== null);

    if (candidates.length === 0) {
        return null;
    }

    candidates.sort((left, right) => left - right);
    return normalizeHexRadius(candidates[Math.floor(candidates.length / 2)]!);
}

function resolveMapHexRadius(map: MapDefinition): number {
    const metadataHexRadius = map.metadata.editorHexRadius;
    if (Number.isFinite(metadataHexRadius) && metadataHexRadius! > 0) {
        return normalizeHexRadius(metadataHexRadius!);
    }

    return inferMapHexRadius(map) ?? hexRadius;
}

function buildDocumentMap(
    map: MapDefinition,
    targetHexRadius = resolveMapHexRadius(map),
): MapDefinition {
    const normalized = normalizeDocument(map, targetHexRadius);
    normalized.metadata = {
        ...normalized.metadata,
        editorHexRadius: targetHexRadius,
    };
    return normalized;
}

function normalizeStarToGrid(
    star: MapDefinition["stars"][number],
    targetHexRadius: number,
): MapDefinition["stars"][number] {
    const authoredCell =
        Number.isFinite(star.gridQ) && Number.isFinite(star.gridR)
            ? getEditorHexCell(targetHexRadius, star.gridQ!, star.gridR!)
            : null;
    const snappedCell = authoredCell ?? snapPointToHexCell({ x: star.x, y: star.y }, targetHexRadius);

    return {
        ...star,
        x: snappedCell.x,
        y: snappedCell.y,
        gridQ: snappedCell.q,
        gridR: snappedCell.r,
        ownerId: star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID,
    };
}

function syncLaneDistances(map: MapDefinition): void {
    const starsById = new Map(
        map.stars.map((star) => [star.id, { x: star.x, y: star.y }] as const),
    );

    map.connections = map.connections.map((lane) => {
        const source = starsById.get(lane.sourceId);
        const target = starsById.get(lane.targetId);
        return {
            ...lane,
            distance: source && target ? Math.hypot(target.x - source.x, target.y - source.y) : lane.distance,
        };
    });
}

function syncMeasurementAnchors(map: MapDefinition): void {
    const starsById = new Map(
        map.stars.map((star) => [star.id, { x: star.x, y: star.y }] as const),
    );

    map.measurements = (map.measurements ?? []).map((measurement) => ({
        ...measurement,
        start: measurement.start.starId && starsById.has(measurement.start.starId)
            ? {
                ...measurement.start,
                x: starsById.get(measurement.start.starId)!.x,
                y: starsById.get(measurement.start.starId)!.y,
            }
            : measurement.start,
        end: measurement.end.starId && starsById.has(measurement.end.starId)
            ? {
                ...measurement.end,
                x: starsById.get(measurement.end.starId)!.x,
                y: starsById.get(measurement.end.starId)!.y,
            }
            : measurement.end,
    }));
}

function scaleMapGeometryForHexRadius(
    map: MapDefinition,
    previousHexRadius: number,
    nextHexRadius: number,
): MapDefinition {
    if (previousHexRadius === nextHexRadius) {
        return cloneMap(map);
    }

    const scaled = cloneMap(map);
    scaled.stars = scaled.stars.map((star) =>
        normalizeStarToGrid(
            Number.isFinite(star.gridQ) && Number.isFinite(star.gridR)
                ? star
                : {
                    ...star,
                    ...scalePointBetweenHexRadii(
                        { x: star.x, y: star.y },
                        previousHexRadius,
                        nextHexRadius,
                    ),
                },
            nextHexRadius,
        ),
    );
    scaled.connections = scaled.connections.map((lane) => ({
        ...lane,
        laneWaypoints: lane.laneWaypoints?.map(([x, y]) => {
            const scaledPoint = scalePointBetweenHexRadii(
                { x, y },
                previousHexRadius,
                nextHexRadius,
            );
            return [scaledPoint.x, scaledPoint.y] as [number, number];
        }),
    }));
    scaled.measurements = (scaled.measurements ?? []).map((measurement) => ({
        ...measurement,
        start:
            measurement.start.starId
                ? measurement.start
                : {
                    ...measurement.start,
                    ...scalePointBetweenHexRadii(
                        { x: measurement.start.x, y: measurement.start.y },
                        previousHexRadius,
                        nextHexRadius,
                    ),
                },
        end:
            measurement.end.starId
                ? measurement.end
                : {
                    ...measurement.end,
                    ...scalePointBetweenHexRadii(
                        { x: measurement.end.x, y: measurement.end.y },
                        previousHexRadius,
                        nextHexRadius,
                    ),
                },
    }));
    return scaled;
}

function normalizeDocument(
    map: MapDefinition,
    targetHexRadius = hexRadius,
): MapDefinition {
    const normalized = cloneMap(map);
    normalized.factions = normalizeEditorFactions(normalized.factions);
    normalized.stars = normalized.stars.map((star) =>
        normalizeStarToGrid(star, targetHexRadius),
    );
    syncLaneDistances(normalized);
    syncMeasurementAnchors(normalized);
    return normalized;
}

function sanitizeSelection(
    map: MapDefinition,
    currentSelection: MapEditorSelection,
): MapEditorSelection {
    const starIds = new Set(map.stars.map((star) => star.id));
    const laneIds = new Set(map.connections.map((lane) => lane.id));
    const measurementIds = new Set((map.measurements ?? []).map((measurement) => measurement.id));

    return {
        starIds: currentSelection.starIds.filter((id) => starIds.has(id)),
        laneIds: currentSelection.laneIds.filter((id) => laneIds.has(id)),
        measurementIds: currentSelection.measurementIds.filter((id) => measurementIds.has(id)),
    };
}

function getStarGridPosition(star: MapDefinition["stars"][number]): { q: number; r: number } | null {
    if (!Number.isFinite(star.gridQ) || !Number.isFinite(star.gridR)) {
        return null;
    }

    return {
        q: star.gridQ!,
        r: star.gridR!,
    };
}

function hasMinimumStarSpacing(
    map: MapDefinition,
    placements: ReadonlyArray<{ id: string; q: number; r: number }>,
    ignoreIds: ReadonlySet<string> = new Set<string>(),
): boolean {
    for (let index = 0; index < placements.length; index += 1) {
        const left = placements[index]!;

        for (let compareIndex = index + 1; compareIndex < placements.length; compareIndex += 1) {
            const right = placements[compareIndex]!;
            if (
                editorHexTileDistance(left, right)
                < MAP_EDITOR_MIN_STAR_SPACING_TILES
            ) {
                return false;
            }
        }

        for (const star of map.stars) {
            if (ignoreIds.has(star.id) || star.id === left.id) {
                continue;
            }

            const existing = getStarGridPosition(star);
            if (!existing) {
                continue;
            }

            if (
                editorHexTileDistance(left, existing)
                < MAP_EDITOR_MIN_STAR_SPACING_TILES
            ) {
                return false;
            }
        }
    }

    return true;
}

function mapHasMinimumStarSpacing(map: MapDefinition): boolean {
    const placements = map.stars
        .map((star) => {
            const gridPosition = getStarGridPosition(star);
            return gridPosition
                ? {
                    id: star.id,
                    q: gridPosition.q,
                    r: gridPosition.r,
                }
                : null;
        })
        .filter((placement): placement is { id: string; q: number; r: number } => placement !== null);

    for (let index = 0; index < placements.length; index += 1) {
        const left = placements[index]!;
        for (let compareIndex = index + 1; compareIndex < placements.length; compareIndex += 1) {
            const right = placements[compareIndex]!;
            if (
                editorHexTileDistance(left, right)
                < MAP_EDITOR_MIN_STAR_SPACING_TILES
            ) {
                return false;
            }
        }
    }

    return true;
}

function syncRepositoryMaps(): void {
    const maps = gameStore.savedMaps.map((map) => buildDocumentMap(map));
    const runtimeBuiltins = maps.filter((map) => Boolean((map as { builtIn?: boolean }).builtIn));
    repositoryMaps = maps.filter((map) => !(map as { builtIn?: boolean }).builtIn);
    if (runtimeBuiltins.length > 0) {
        builtinMaps = runtimeBuiltins;
    }
}

function recordAutosave(map: MapDefinition): MapDefinition {
    const savedAt = new Date().toISOString();
    const revisionId = `autosave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const revisionMap: MapDefinition = {
        ...cloneMap(map),
        metadata: {
            ...map.metadata,
            updatedAt: savedAt,
            autosaveRevisionId: revisionId,
            autosaveSequence: (map.metadata.autosaveSequence ?? 0) + 1,
        },
    };

    autosaveRevisions = [
        {
            id: revisionId,
            savedAt,
            name: revisionMap.metadata.name,
            map: cloneMap(revisionMap),
        },
        ...autosaveRevisions,
    ].slice(0, AUTOSAVE_LIMIT);
    persistAutosaves(autosaveRevisions);
    return revisionMap;
}

function applyMap(
    nextMap: MapDefinition,
    options?: ApplyMapMutationOptions,
): MapDefinition {
    const {
        pushUndo = true,
        clearRedo = true,
        dirty = true,
        autosave = true,
        preserveSelection = true,
    } = options ?? {};

    if (pushUndo) {
        undoStack = [cloneMap(documentState), ...undoStack].slice(0, UNDO_LIMIT);
    }
    if (clearRedo) {
        redoStack = [];
    }

    const normalizedMap = buildDocumentMap(nextMap, hexRadius);
    const normalized = autosave ? recordAutosave(normalizedMap) : normalizedMap;
    documentState = normalized;
    selection = preserveSelection
        ? sanitizeSelection(normalized, selection)
        : createSelection();
    isDirty = dirty;
    return normalized;
}

function finalizeTransientEdit(): void {
    applyMap(cloneMap(documentState), {
        pushUndo: false,
        clearRedo: false,
        dirty: true,
        autosave: true,
    });
}

function buildLaneId(
    map: MapDefinition,
    sourceId: string,
    targetId: string,
): string {
    const sortedPair = [sourceId, targetId].sort().join("-");
    const index = nextNumericId(map.connections.map((lane) => lane.id), "lane");
    return `lane-${index}-${sortedPair}`;
}

function buildStarId(map: MapDefinition): string {
    return `star-${nextNumericId(map.stars.map((star) => star.id), "star")}`;
}

function buildMeasurementId(map: MapDefinition): string {
    return `measurement-${nextNumericId((map.measurements ?? []).map((measurement) => measurement.id), "measurement")}`;
}

function syncBrushesFromSelection(): void {
    const star = documentState.stars.find((entry) => entry.id === selection.starIds[0]);
    if (!star) return;
    ownerBrush = star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID;
    starTypeBrush = star.starType;
    forceBrush = star.activeShips ?? forceBrush;
}

function loadMap(map: MapDefinition, sourceLabel?: string): void {
    hexRadius = resolveMapHexRadius(map);
    persistHexRadius(hexRadius);
    documentState = buildDocumentMap(map, hexRadius);
    selection = createSelection();
    viewport = { panX: 0, panY: 0, zoom: 1 };
    tool = "auto";
    draftLaneSourceId = null;
    draftMeasurementStart = null;
    undoStack = [];
    redoStack = [];
    isDirty = false;
    lastLoadedSource = sourceLabel ?? map.metadata.name;
}

async function refreshSources(): Promise<void> {
    builtinMaps = (await loadBuiltinMaps().catch(() => [])).map((map) => buildDocumentMap(map));
    syncRepositoryMaps();
    fixtureManifest = getFixtureMapManifest();
}

async function loadFixture(fixtureId: string): Promise<void> {
    const map = await loadFixtureMapDefinition(fixtureId, async (resourcePath) => {
        const response = await fetch(
            `/__fixture-maps?path=${encodeURIComponent(resourcePath)}`,
        );
        if (!response.ok) {
            throw new Error(`Failed to load fixture map "${fixtureId}"`);
        }
        return response.text();
    });
    loadMap(map, `fixture:${fixtureId}`);
}

function updateMetadata(
    patch: Partial<MapDefinition["metadata"]>,
): void {
    applyMap({
        ...cloneMap(documentState),
        metadata: {
            ...documentState.metadata,
            ...patch,
        },
    });
}

function setSelection(nextSelection: MapEditorSelection): void {
    selection = sanitizeSelection(documentState, nextSelection);
    syncBrushesFromSelection();
}

function selectStar(id: string, append = false): void {
    setSelection({
        starIds: append
            ? Array.from(new Set([...selection.starIds, id]))
            : [id],
        laneIds: [],
        measurementIds: [],
    });
}

function selectLane(id: string, append = false): void {
    setSelection({
        starIds: append ? selection.starIds : [],
        laneIds: append
            ? Array.from(new Set([...selection.laneIds, id]))
            : [id],
        measurementIds: [],
    });
}

function selectMeasurement(id: string, append = false): void {
    setSelection({
        starIds: append ? selection.starIds : [],
        laneIds: append ? selection.laneIds : [],
        measurementIds: append
            ? Array.from(new Set([...selection.measurementIds, id]))
            : [id],
    });
}

function clearSelection(): void {
    selection = createSelection();
}

function cancelDraftInteractions(): void {
    draftLaneSourceId = null;
    draftMeasurementStart = null;
}

function setTool(nextTool: MapEditorTool): void {
    tool = nextTool;
    cancelDraftInteractions();
}

function setViewport(nextViewport: MapEditorViewport): void {
    viewport = nextViewport;
}

function setHexRadius(nextHexRadius: number): void {
    const normalizedRadius = normalizeHexRadius(nextHexRadius);
    if (normalizedRadius === hexRadius) {
        return;
    }

    const previousHexRadius = hexRadius;
    hexRadius = normalizedRadius;
    persistHexRadius(hexRadius);
    applyMap(
        scaleMapGeometryForHexRadius(documentState, previousHexRadius, normalizedRadius),
        {
            dirty: true,
            autosave: true,
        },
    );
}

function placeStar(x: number, y: number): boolean {
    const snappedCell = snapPointToHexCell({ x, y }, hexRadius);
    if (!hasMinimumStarSpacing(documentState, [{
        id: "__new-star__",
        q: snappedCell.q,
        r: snappedCell.r,
    }])) {
        return false;
    }

    const starId = buildStarId(documentState);
    const nextMap = cloneMap(documentState);
    nextMap.stars.push({
        id: starId,
        x: snappedCell.x,
        y: snappedCell.y,
        gridQ: snappedCell.q,
        gridR: snappedCell.r,
        ownerId: ownerBrush,
        starType: starTypeBrush,
        activeShips: forceBrush,
        damagedShips: 0,
    });
    applyMap(nextMap, { preserveSelection: false });
    selection = { starIds: [starId], laneIds: [], measurementIds: [] };
    return true;
}

function updateStarPosition(id: string, x: number, y: number): boolean {
    const nextMap = cloneMap(documentState);
    const star = nextMap.stars.find((entry) => entry.id === id);
    if (!star) return false;
    const snappedCell = snapPointToHexCell({ x, y }, hexRadius);
    if (!hasMinimumStarSpacing(nextMap, [{
        id,
        q: snappedCell.q,
        r: snappedCell.r,
    }], new Set([id]))) {
        return false;
    }
    star.x = snappedCell.x;
    star.y = snappedCell.y;
    star.gridQ = snappedCell.q;
    star.gridR = snappedCell.r;
    applyMap(nextMap);
    return true;
}

function moveStars(
    updates: ReadonlyArray<{ id: string; x: number; y: number }>,
): boolean {
    if (updates.length === 0) return false;
    const snappedPlacements = updates.map((entry) => {
        const snappedCell = snapPointToHexCell(entry, hexRadius);
        return {
            id: entry.id,
            x: snappedCell.x,
            y: snappedCell.y,
            q: snappedCell.q,
            r: snappedCell.r,
        };
    });
    const movedIds = new Set(snappedPlacements.map((entry) => entry.id));
    if (!hasMinimumStarSpacing(documentState, snappedPlacements, movedIds)) {
        return false;
    }

    const updateById = new Map(snappedPlacements.map((entry) => [entry.id, entry]));
    const nextMap = cloneMap(documentState);
    let changed = false;
    nextMap.stars.forEach((star) => {
        const update = updateById.get(star.id);
        if (!update) return;
        if (star.x === update.x && star.y === update.y) return;
        star.x = update.x;
        star.y = update.y;
        star.gridQ = update.q;
        star.gridR = update.r;
        changed = true;
    });
    if (!changed) return false;
    applyMap(nextMap);
    return true;
}

function deleteSelection(): void {
    if (
        selection.starIds.length === 0
        && selection.laneIds.length === 0
        && selection.measurementIds.length === 0
    ) {
        return;
    }

    const starIds = new Set(selection.starIds);
    const laneIds = new Set(selection.laneIds);
    const measurementIds = new Set(selection.measurementIds);
    const nextMap = cloneMap(documentState);

    nextMap.stars = nextMap.stars.filter((star) => !starIds.has(star.id));
    nextMap.connections = nextMap.connections.filter(
        (lane) =>
            !laneIds.has(lane.id)
            && !starIds.has(lane.sourceId)
            && !starIds.has(lane.targetId),
    );
    nextMap.measurements = (nextMap.measurements ?? []).filter((measurement) => {
        if (measurementIds.has(measurement.id)) return false;
        if (measurement.start.starId && starIds.has(measurement.start.starId)) return false;
        if (measurement.end.starId && starIds.has(measurement.end.starId)) return false;
        if (measurement.relatedLaneId && laneIds.has(measurement.relatedLaneId)) return false;
        if (
            measurement.relatedLaneId
            && !nextMap.connections.some((lane) => lane.id === measurement.relatedLaneId)
        ) {
            return false;
        }
        return true;
    });
    nextMap.stars.forEach((star) => {
        if (star.targetId && starIds.has(star.targetId)) {
            delete star.targetId;
        }
    });

    applyMap(nextMap, { preserveSelection: false });
}

function sortLanePair(sourceId: string, targetId: string): {
    sourceId: string;
    targetId: string;
} {
    return sourceId <= targetId
        ? { sourceId, targetId }
        : { sourceId: targetId, targetId: sourceId };
}

function removeLaneById(
    map: MapDefinition,
    laneId: string,
): boolean {
    const lane = map.connections.find((entry) => entry.id === laneId);
    if (!lane) return false;
    map.connections = map.connections.filter((entry) => entry.id !== laneId);
    map.measurements = (map.measurements ?? []).filter(
        (measurement) => measurement.relatedLaneId !== laneId,
    );
    return true;
}

function setLaneConnection(
    sourceId: string,
    targetId: string,
    connected: boolean,
): boolean {
    if (sourceId === targetId) return false;
    const {
        sourceId: sortedSourceId,
        targetId: sortedTargetId,
    } = sortLanePair(sourceId, targetId);
    const existingLane = documentState.connections.find(
        (lane) =>
            lane.sourceId === sortedSourceId && lane.targetId === sortedTargetId,
    );

    if (connected && existingLane) {
        return false;
    }
    if (!connected && !existingLane) {
        return false;
    }

    const nextMap = cloneMap(documentState);

    if (!connected && existingLane) {
        removeLaneById(nextMap, existingLane.id);
        applyMap(nextMap, { preserveSelection: false });
        return true;
    }

    const source = nextMap.stars.find((star) => star.id === sortedSourceId);
    const target = nextMap.stars.find((star) => star.id === sortedTargetId);
    if (!source || !target) return false;

    nextMap.connections.push({
        id: buildLaneId(nextMap, sortedSourceId, sortedTargetId),
        sourceId: sortedSourceId,
        targetId: sortedTargetId,
        distance: Math.hypot(target.x - source.x, target.y - source.y),
        pathMode: "auto",
    });
    applyMap(nextMap, { preserveSelection: false });
    return true;
}

function removeLatestLaneForStar(starId: string): string | null {
    const latestLane = [...documentState.connections]
        .reverse()
        .find((lane) => lane.sourceId === starId || lane.targetId === starId);

    if (!latestLane) {
        return null;
    }

    const nextMap = cloneMap(documentState);
    if (!removeLaneById(nextMap, latestLane.id)) {
        return null;
    }

    applyMap(nextMap, { preserveSelection: false });
    return latestLane.id;
}

function toggleLane(sourceId: string, targetId: string): void {
    const {
        sourceId: sortedSourceId,
        targetId: sortedTargetId,
    } = sortLanePair(sourceId, targetId);
    const existingLane = documentState.connections.find(
        (lane) =>
            lane.sourceId === sortedSourceId && lane.targetId === sortedTargetId,
    );
    void setLaneConnection(sourceId, targetId, !existingLane);
}

function setLaneDraftSource(starId: string | null): void {
    draftLaneSourceId = starId;
    if (starId) {
        selectStar(starId);
    }
}

function startOrAdvanceLaneDraft(
    starId: string,
    connected = true,
): boolean {
    if (!draftLaneSourceId) {
        draftLaneSourceId = starId;
        selectStar(starId);
        return false;
    }

    if (draftLaneSourceId === starId) {
        selectStar(starId);
        return false;
    }

    const changed = setLaneConnection(draftLaneSourceId, starId, connected);
    draftLaneSourceId = starId;
    selectStar(starId);
    return changed;
}

function startOrToggleLaneDraft(starId: string): void {
    void startOrAdvanceLaneDraft(starId, true);
}

function clearLaneDraft(): void {
    draftLaneSourceId = null;
}

function autoConnectSelection(): number {
    const selectedIds =
        selection.starIds.length >= 2
            ? selection.starIds
            : documentState.stars.map((star) => star.id);
    const targetIdSet = new Set(selectedIds);
    const targetStars = documentState.stars.filter((star) => targetIdSet.has(star.id));
    if (targetStars.length < 2) {
        return 0;
    }

    const minLinks = Math.max(1, gameStore.settings.minLinksPerStar ?? 1);
    const maxLinks = Math.max(minLinks, gameStore.settings.maxLinksPerStar ?? 6);
    const generated = generateConnections(targetStars, Infinity, minLinks, maxLinks, 75, 0);

    const nextMap = cloneMap(documentState);
    const removedLaneIds = new Set(
        nextMap.connections
            .filter(
                (lane) =>
                    targetIdSet.has(lane.sourceId)
                    && targetIdSet.has(lane.targetId),
            )
            .map((lane) => lane.id),
    );

    nextMap.connections = nextMap.connections.filter(
        (lane) =>
            !targetIdSet.has(lane.sourceId)
            || !targetIdSet.has(lane.targetId),
    );
    nextMap.measurements = (nextMap.measurements ?? []).filter(
        (measurement) =>
            !measurement.relatedLaneId
            || !removedLaneIds.has(measurement.relatedLaneId),
    );

    const createdLaneIds: string[] = [];
    for (const connection of generated) {
        const source = nextMap.stars.find((star) => star.id === connection.sourceId);
        const target = nextMap.stars.find((star) => star.id === connection.targetId);
        if (!source || !target) {
            continue;
        }

        const laneId = buildLaneId(nextMap, connection.sourceId, connection.targetId);
        createdLaneIds.push(laneId);
        nextMap.connections.push({
            id: laneId,
            sourceId: connection.sourceId,
            targetId: connection.targetId,
            distance: connection.distance,
            laneWaypoints: connection.laneWaypoints,
            pathMode: "auto",
        });
    }

    applyMap(nextMap, { preserveSelection: false });
    selection = {
        starIds: [...selectedIds],
        laneIds: createdLaneIds,
        measurementIds: [],
    };
    draftLaneSourceId = null;
    return createdLaneIds.length;
}

function applyStarsPatch(
    starIds: readonly string[],
    patch: Partial<MapDefinition["stars"][number]>,
    options?: ApplyMapMutationOptions,
): boolean {
    if (starIds.length === 0) return false;
    const nextMap = cloneMap(documentState);
    let changed = false;
    nextMap.stars.forEach((star) => {
        if (starIds.includes(star.id)) {
            const nextStar = {
                ...star,
                ...patch,
            };
            if (JSON.stringify(nextStar) !== JSON.stringify(star)) {
                Object.assign(star, nextStar);
                changed = true;
            }
        }
    });
    if (!changed) return false;
    applyMap(nextMap, options);
    return true;
}

function applyOwnerBrush(
    starIds = selection.starIds,
    options?: ApplyMapMutationOptions,
): boolean {
    return applyStarsPatch(starIds, {
        ownerId: ownerBrush,
    }, options);
}

function applyStarTypeBrush(starIds = selection.starIds): void {
    if (starIds.length === 0) return;
    const nextMap = cloneMap(documentState);
    nextMap.stars.forEach((star) => {
        if (starIds.includes(star.id)) {
            star.starType = starTypeBrush;
        }
    });
    applyMap(nextMap);
}

function applyForceBrush(
    starIds = selection.starIds,
    options?: ApplyMapMutationOptions,
): boolean {
    return applyStarsPatch(starIds, {
        activeShips: forceBrush,
    }, options);
}

function updateSelectedStars(
    patch: Partial<MapDefinition["stars"][number]>,
    starIds = selection.starIds,
): void {
    if (starIds.length === 0) return;
    const nextMap = cloneMap(documentState);
    let changed = false;

    nextMap.stars = nextMap.stars.map((star) => {
        if (!starIds.includes(star.id)) {
            return star;
        }

        changed = true;
        return {
            ...star,
            ...patch,
        };
    });

    if (!changed) return;
    applyMap(nextMap);
}

function wipeAllOwnership(): void {
    applyStarsPatch(
        documentState.stars.map((star) => star.id),
        { ownerId: AUTHORED_NEUTRAL_OWNER_ID },
    );
    ownerBrush = AUTHORED_NEUTRAL_OWNER_ID;
}

function wipeAllFleets(): void {
    applyStarsPatch(
        documentState.stars.map((star) => star.id),
        { activeShips: 0, damagedShips: 0 },
    );
    forceBrush = 0;
}

function wipeAllConnections(): void {
    if (documentState.connections.length === 0 && (documentState.measurements ?? []).length === 0) {
        return;
    }

    const nextMap = cloneMap(documentState);
    nextMap.connections = [];
    nextMap.measurements = (nextMap.measurements ?? []).filter((measurement) => (
        measurement.relatedLaneId == null
        && measurement.start.snapKind !== "lane"
        && measurement.end.snapKind !== "lane"
    ));
    applyMap(nextMap, { preserveSelection: false });
    draftLaneSourceId = null;
}

function addManualMeasurement(
    start: AuthoredMeasurementAnchor,
    end: AuthoredMeasurementAnchor,
): void {
    const nextMap = cloneMap(documentState);
    nextMap.measurements = [...(nextMap.measurements ?? []), {
        id: buildMeasurementId(nextMap),
        mode: "manual",
        label: "",
        visibleByDefault: true,
        start,
        end,
    }];
    applyMap(nextMap);
}

function startOrCompleteMeasurement(anchor: AuthoredMeasurementAnchor): void {
    if (!draftMeasurementStart) {
        draftMeasurementStart = anchor;
        return;
    }
    addManualMeasurement(draftMeasurementStart, anchor);
    draftMeasurementStart = null;
}

function generateLaneMeasurementsForSelection(): void {
    const targetLaneIds = selection.laneIds.length > 0 ? selection.laneIds : undefined;
    const nextMap = cloneMap(documentState);
    const keep = (nextMap.measurements ?? []).filter((measurement) => {
        if (measurement.mode !== "generated") return true;
        if (!targetLaneIds) return false;
        return !targetLaneIds.includes(measurement.relatedLaneId ?? "");
    });
    nextMap.measurements = [
        ...keep,
        ...generateLaneMeasurements(nextMap, targetLaneIds),
    ];
    applyMap(nextMap);
}

function duplicateSelection(): void {
    if (selection.starIds.length === 0) return;
    const nextMap = cloneMap(documentState);
    const selectedStars = nextMap.stars.filter((star) => selection.starIds.includes(star.id));
    const selectedStarIdSet = new Set(selectedStars.map((star) => star.id));
    const idMap = new Map<string, string>();

    for (const star of selectedStars) {
        const newId = buildStarId(nextMap);
        idMap.set(star.id, newId);
        const snapped = snapPointToHexCenter(
            {
                x: star.x + 220,
                y: star.y,
            },
            hexRadius,
        );
        nextMap.stars.push({
            ...star,
            id: newId,
            x: snapped.x,
            y: snapped.y,
            targetId: star.targetId && idMap.has(star.targetId)
                ? idMap.get(star.targetId)
                : undefined,
        });
    }

    const clonedLaneIds: string[] = [];
    nextMap.connections
        .filter(
            (lane) =>
                selectedStarIdSet.has(lane.sourceId)
                && selectedStarIdSet.has(lane.targetId),
        )
        .forEach((lane) => {
            const laneId = buildLaneId(
                nextMap,
                idMap.get(lane.sourceId)!,
                idMap.get(lane.targetId)!,
            );
            clonedLaneIds.push(laneId);
            nextMap.connections.push({
                ...lane,
                id: laneId,
                sourceId: idMap.get(lane.sourceId)!,
                targetId: idMap.get(lane.targetId)!,
                laneWaypoints: lane.laneWaypoints?.map(([x, y]) => [x + 220, y]),
            });
        });

    if (!mapHasMinimumStarSpacing(normalizeDocument(nextMap))) return;
    applyMap(nextMap, { preserveSelection: false });
    selection = {
        starIds: [...idMap.values()],
        laneIds: clonedLaneIds,
        measurementIds: [],
    };
}

function mirrorSelection(axis: "horizontal" | "vertical"): void {
    const starIds = selection.starIds.length > 0
        ? selection.starIds
        : documentState.stars.map((star) => star.id);
    const stars = documentState.stars.filter((star) => starIds.includes(star.id));
    if (stars.length === 0) return;

    const xs = stars.map((star) => star.x);
    const ys = stars.map((star) => star.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) * 0.5;
    const centerY = (Math.min(...ys) + Math.max(...ys)) * 0.5;
    const nextMap = cloneMap(documentState);
    nextMap.stars.forEach((star) => {
        if (!starIds.includes(star.id)) return;
        const snapped = snapPoint(
            axis === "horizontal"
                ? { x: centerX - (star.x - centerX), y: star.y }
                : { x: star.x, y: centerY - (star.y - centerY) },
        );
        if (axis === "horizontal") {
            star.x = snapped.x;
        } else {
            star.y = snapped.y;
        }
    });
    if (!mapHasMinimumStarSpacing(normalizeDocument(nextMap))) return;
    applyMap(nextMap);
}

function applyRotationalSymmetry(fold: MapEditorSymmetryFold): number {
    const sourceStars = documentState.stars.filter((star) => selection.starIds.includes(star.id));
    if (sourceStars.length === 0) {
        return 0;
    }

    const nextMap = cloneMap(documentState);
    const createdStarIds: string[] = [];
    const candidates = buildRotationalSymmetryCandidates({
        stars: sourceStars.map((star) => ({
            id: star.id,
            x: star.x,
            y: star.y,
        })),
        fold,
        hexRadius,
        centerX: MAP_EDITOR_BOARD_WIDTH * 0.5,
        centerY: MAP_EDITOR_BOARD_HEIGHT * 0.5,
    });

    for (const candidate of candidates) {
        if (!hasMinimumStarSpacing(nextMap, [{
            id: "__symmetry-candidate__",
            q: candidate.gridQ,
            r: candidate.gridR,
        }])) {
            continue;
        }

        const sourceStar = sourceStars.find((star) => star.id === candidate.sourceId);
        if (!sourceStar) {
            continue;
        }

        const newId = buildStarId(nextMap);
        nextMap.stars.push({
            ...sourceStar,
            id: newId,
            x: candidate.x,
            y: candidate.y,
            gridQ: candidate.gridQ,
            gridR: candidate.gridR,
            targetId: undefined,
        });
        createdStarIds.push(newId);
    }

    if (createdStarIds.length === 0) {
        return 0;
    }

    applyMap(nextMap, { preserveSelection: false });
    selection = {
        starIds: Array.from(new Set([...sourceStars.map((star) => star.id), ...createdStarIds])),
        laneIds: [],
        measurementIds: [],
    };
    return createdStarIds.length;
}

function insertTemplate(template: "triangle" | "line" | "ring"): void {
    const nextMap = cloneMap(documentState);
    const centerX = 800;
    const centerY = 450;
    const stars =
        template === "triangle"
            ? [
                [centerX, centerY - 210],
                [centerX - 180, centerY + 120],
                [centerX + 180, centerY + 120],
            ]
            : template === "line"
              ? [
                  [centerX - 220, centerY],
                  [centerX, centerY],
                  [centerX + 220, centerY],
                ]
              : [
                  [centerX, centerY - 220],
                  [centerX + 220, centerY],
                  [centerX, centerY + 220],
                  [centerX - 220, centerY],
                ];

    const newIds: string[] = [];
    for (const [x, y] of stars) {
        const starId = buildStarId(nextMap);
        newIds.push(starId);
        const snapped = snapPointToHexCenter({ x, y }, hexRadius);
        nextMap.stars.push({
            id: starId,
            x: snapped.x,
            y: snapped.y,
            ownerId: ownerBrush,
            starType: starTypeBrush,
            activeShips: forceBrush,
        });
    }

    const lanePairs =
        template === "triangle"
            ? [[0, 1], [1, 2], [2, 0]]
            : template === "line"
              ? [[0, 1], [1, 2]]
              : [[0, 1], [1, 2], [2, 3], [3, 0]];

    for (const [sourceIndex, targetIndex] of lanePairs) {
        const sourceId = newIds[sourceIndex];
        const targetId = newIds[targetIndex];
        const source = nextMap.stars.find((star) => star.id === sourceId)!;
        const target = nextMap.stars.find((star) => star.id === targetId)!;
        nextMap.connections.push({
            id: buildLaneId(nextMap, sourceId, targetId),
            sourceId,
            targetId,
            distance: Math.hypot(target.x - source.x, target.y - source.y),
            pathMode: "auto",
        });
    }

    if (!mapHasMinimumStarSpacing(normalizeDocument(nextMap))) return;
    applyMap(nextMap, { preserveSelection: false });
    selection = { starIds: newIds, laneIds: [], measurementIds: [] };
}

function addFactionSlot(): void {
    if (documentState.factions.length >= MAP_EDITOR_MAX_FACTIONS) return;
    const nextMap = cloneMap(documentState);
    const index = nextNumericId(nextMap.factions.map((faction) => faction.id), "slot");
    nextMap.factions.push({
        id: `slot-${index}`,
        label: `Faction ${nextMap.factions.length + 1}`,
        order: nextMap.factions.length,
    });
    applyMap(nextMap);
}

function updateFactionSlot(
    id: string,
    patch: Partial<MapDefinition["factions"][number]>,
): void {
    const nextMap = cloneMap(documentState);
    const faction = nextMap.factions.find((entry) => entry.id === id);
    if (!faction) return;
    Object.assign(faction, patch);
    applyMap(nextMap);
}

function removeFactionSlot(id: string): void {
    if (documentState.factions.length <= 1) return;
    const nextMap = cloneMap(documentState);
    nextMap.factions = nextMap.factions.filter((faction) => faction.id !== id);
    nextMap.stars.forEach((star) => {
        if (star.ownerId === id) {
            star.ownerId = AUTHORED_NEUTRAL_OWNER_ID;
        }
    });
    applyMap(nextMap);
}

function updateMeasurement(
    id: string,
    patch: Partial<MapMeasurementDefinition>,
): void {
    const nextMap = cloneMap(documentState);
    nextMap.measurements = (nextMap.measurements ?? []).map((measurement) =>
        measurement.id === id ? { ...measurement, ...patch } : measurement,
    );
    applyMap(nextMap);
}

function updateStar(
    id: string,
    patch: Partial<MapDefinition["stars"][number]>,
): void {
    const nextMap = cloneMap(documentState);
    nextMap.stars = nextMap.stars.map((star) => {
        if (star.id !== id) return star;
        const merged = { ...star, ...patch };
        if (
            patch.x !== undefined
            || patch.y !== undefined
            || patch.gridQ !== undefined
            || patch.gridR !== undefined
        ) {
            const authoredCell =
                Number.isFinite(merged.gridQ) && Number.isFinite(merged.gridR)
                    ? getEditorHexCell(hexRadius, merged.gridQ!, merged.gridR!)
                    : null;
            const snappedCell = authoredCell ?? snapPointToHexCell({
                x: merged.x,
                y: merged.y,
            }, hexRadius);

            if (!hasMinimumStarSpacing(nextMap, [{
                id,
                q: snappedCell.q,
                r: snappedCell.r,
            }], new Set([id]))) {
                return star;
            }

            merged.x = snappedCell.x;
            merged.y = snappedCell.y;
            merged.gridQ = snappedCell.q;
            merged.gridR = snappedCell.r;
        }
        return merged;
    });
    applyMap(nextMap);
}

function updateLane(
    id: string,
    patch: Partial<MapDefinition["connections"][number]>,
): void {
    const nextMap = cloneMap(documentState);
    nextMap.connections = nextMap.connections.map((lane) =>
        lane.id === id ? { ...lane, ...patch } : lane,
    );
    applyMap(nextMap);
}

function undo(): void {
    const previous = undoStack[0];
    if (!previous) return;
    redoStack = [cloneMap(documentState), ...redoStack].slice(0, UNDO_LIMIT);
    undoStack = undoStack.slice(1);
    documentState = cloneMap(previous);
    selection = sanitizeSelection(documentState, selection);
    isDirty = true;
}

function redo(): void {
    const next = redoStack[0];
    if (!next) return;
    undoStack = [cloneMap(documentState), ...undoStack].slice(0, UNDO_LIMIT);
    redoStack = redoStack.slice(1);
    documentState = cloneMap(next);
    selection = sanitizeSelection(documentState, selection);
    isDirty = true;
}

function restoreAutosave(id: string): void {
    const revision = autosaveRevisions.find((entry) => entry.id === id);
    if (!revision) return;
    loadMap(revision.map, `autosave:${revision.name}`);
}

function newMap(): void {
    loadMap(createEmptyAuthoredMap("Untitled Map"), "new");
}

function duplicateMap(): void {
    const baseName = documentState.metadata.name || "Untitled Map";
    const duplicate = cloneMap(documentState);
    duplicate.metadata = {
        ...duplicate.metadata,
        mapId: slugify(`${baseName}-copy-${Date.now()}`),
        name: `${baseName} Copy`,
        updatedAt: new Date().toISOString(),
    };
    loadMap(duplicate, "duplicate");
    isDirty = true;
}

function coerceUnownedStarsForOutput(map: MapDefinition): void {
    const validOwnerIds = new Set([
        AUTHORED_NEUTRAL_OWNER_ID,
        ...map.factions.map((faction) => faction.id),
    ]);

    map.stars = map.stars.map((star) => {
        const ownerId = star.ownerId?.trim();
        if (ownerId && validOwnerIds.has(ownerId)) {
            return star;
        }

        return {
            ...star,
            ownerId: AUTHORED_NEUTRAL_OWNER_ID,
            activeShips: 0,
            damagedShips: 0,
        };
    });
}

function buildPersistedMap(options?: {
    coerceUnownedStars?: boolean;
}): MapDefinition {
    const now = new Date().toISOString();
    const map = buildDocumentMap(documentState, hexRadius);
    if (options?.coerceUnownedStars) {
        coerceUnownedStarsForOutput(map);
    }
    map.metadata = {
        ...map.metadata,
        mapId: map.metadata.mapId || slugify(map.metadata.name),
        editorHexRadius: hexRadius,
        updatedAt: now,
        importedFrom: { kind: "editor" },
        thumbnailDataUrl:
            typeof document !== "undefined"
                ? generateMapThumbnail(
                    map.stars.map((star) => ({
                        id: star.id,
                        x: star.x,
                        y: star.y,
                        ownerId: star.ownerId ?? AUTHORED_NEUTRAL_OWNER_ID,
                        starType: star.starType,
                    })),
                    map.connections.map((lane) => ({
                        sourceId: lane.sourceId,
                        targetId: lane.targetId,
                        laneWaypoints: lane.laneWaypoints,
                    })),
                  )
                : map.metadata.thumbnailDataUrl,
    };
    return map;
}

function saveDocument(
    name?: string,
    options?: {
        coerceUnownedStars?: boolean;
    },
): MapDefinition {
    const persisted = buildPersistedMap(options);
    if (name?.trim()) {
        persisted.metadata.name = name.trim();
    }
    const saved = gameStore.upsertSavedMapDefinition(persisted);
    documentState = cloneMap(saved);
    isDirty = false;
    syncRepositoryMaps();
    return saved;
}

function exportDocument(options?: {
    coerceUnownedStars?: boolean;
}): string {
    return serializeAuthoredMap(buildPersistedMap(options));
}

export const mapEditorStore = {
    get document() { return documentState; },
    get tool() { return tool; },
    get selection() { return selection; },
    get viewport() { return viewport; },
    get hexRadius() { return hexRadius; },
    get ownerBrush() { return ownerBrush; },
    set hexRadius(value: number) { setHexRadius(value); },
    set ownerBrush(value: string) { ownerBrush = value; },
    get starTypeBrush() { return starTypeBrush; },
    set starTypeBrush(value: StarType) { starTypeBrush = value; },
    get forceBrush() { return forceBrush; },
    set forceBrush(value: number) { forceBrush = Math.max(0, Math.round(value)); },
    get isDirty() { return isDirty; },
    get draftLaneSourceId() { return draftLaneSourceId; },
    get draftMeasurementStart() { return draftMeasurementStart; },
    get validationIssues() { return validationIssues as MapValidationIssue[]; },
    get validationErrors() { return validationErrors as MapValidationIssue[]; },
    get validationWarnings() { return validationWarnings as MapValidationIssue[]; },
    get canLaunch() { return validationErrors.length === 0; },
    get autosaveRevisions() { return autosaveRevisions; },
    get repositoryMaps() { return repositoryMaps; },
    get repositoryManifest() { return repositoryManifest; },
    get builtinMaps() { return builtinMaps; },
    get fixtureManifest() { return fixtureManifest; },
    get lastLoadedSource() { return lastLoadedSource; },
    get canUndo() { return undoStack.length > 0; },
    get canRedo() { return redoStack.length > 0; },
    get boardWidth() { return MAP_EDITOR_BOARD_WIDTH; },
    get boardHeight() { return MAP_EDITOR_BOARD_HEIGHT; },
    get gridPadding() { return MAP_EDITOR_HEX_PADDING; },
    get starTypeOptions() {
        return Object.keys(STAR_TYPE_STATS) as StarType[];
    },
    get starTypePalette() {
        return MAP_EDITOR_STAR_TYPE_OPTIONS;
    },

    refreshSources,
    loadMap,
    loadFixture,
    newMap,
    duplicateMap,
    saveDocument,
    exportDocument,
    updateMetadata,
    setSelection,
    selectStar,
    selectLane,
    selectMeasurement,
    clearSelection,
    cancelDraftInteractions,
    setTool,
    setViewport,
    placeStar,
    updateStarPosition,
    moveStars,
    deleteSelection,
    toggleLane,
    setLaneConnection,
    removeLatestLaneForStar,
    setLaneDraftSource,
    startOrAdvanceLaneDraft,
    startOrToggleLaneDraft,
    clearLaneDraft,
    autoConnectSelection,
    applyOwnerBrush,
    applyStarTypeBrush,
    applyForceBrush,
    finalizeTransientEdit,
    updateSelectedStars,
    wipeAllOwnership,
    wipeAllFleets,
    wipeAllConnections,
    startOrCompleteMeasurement,
    generateLaneMeasurementsForSelection,
    duplicateSelection,
    mirrorSelection,
    applyRotationalSymmetry,
    insertTemplate,
    addFactionSlot,
    updateFactionSlot,
    removeFactionSlot,
    updateMeasurement,
    updateStar,
    updateLane,
    undo,
    redo,
    restoreAutosave,
};
