import { STAR_TYPE_STATS, generateIndexedHexGrid, type StarType } from "@pax/common";
import type { AuthoredFactionSlot } from "@pax/common/maps";
import { GAME_CONFIG } from "$lib/config/game.config";
import { defaultPlayerPaletteHex } from "$lib/utils/playerPalette";

export const MAP_EDITOR_BOARD_WIDTH = 1600;
export const MAP_EDITOR_BOARD_HEIGHT = 900;
export const MAP_EDITOR_HEX_PADDING = GAME_CONFIG.HEX_PADDING ?? 50;
export const MAP_EDITOR_DEFAULT_HEX_RADIUS = 54;
export const MAP_EDITOR_MIN_HEX_RADIUS = 10;
export const MAP_EDITOR_MAX_HEX_RADIUS = 100;
export const MAP_EDITOR_MAX_FACTIONS = 6;
export const MAP_EDITOR_MIN_STAR_SPACING_TILES = 2;
export const MAP_EDITOR_HEX_RADIUS_STORAGE_KEY = "pax-map-editor-hex-radius-v1";

const STAR_TYPE_SIDES: Record<StarType, number> = {
    green: 3,
    red: 4,
    yellow: 5,
    purple: 6,
    blue: 7,
    grey: 0,
};

export interface EditorPoint {
    x: number;
    y: number;
}

export interface EditorHexCell extends EditorPoint {
    q: number;
    r: number;
    key: string;
}

export interface MapEditorStarTypeOption {
    id: StarType;
    label: string;
    color: string;
    sides: number;
}

interface EditorHexGridCache {
    cells: EditorHexCell[];
    byKey: Map<string, EditorHexCell>;
}

const editorHexCache = new Map<number, EditorHexGridCache>();

function toCssHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

export const MAP_EDITOR_STAR_TYPE_OPTIONS: MapEditorStarTypeOption[] = (
    Object.keys(STAR_TYPE_STATS) as StarType[]
).map((starType) => ({
    id: starType,
    label: starType,
    color: toCssHex(STAR_TYPE_STATS[starType].color),
    sides: STAR_TYPE_SIDES[starType],
}));

export const MAP_EDITOR_OWNER_PALETTE = defaultPlayerPaletteHex().slice(
    0,
    MAP_EDITOR_MAX_FACTIONS,
);

export function buildDefaultEditorFactions(): AuthoredFactionSlot[] {
    return MAP_EDITOR_OWNER_PALETTE.map((color, index) => ({
        id: `slot-${index + 1}`,
        label: `Faction ${index + 1}`,
        color,
        order: index,
    }));
}

export function loadStoredHexRadius(): number {
    if (typeof localStorage === "undefined") {
        return MAP_EDITOR_DEFAULT_HEX_RADIUS;
    }

    const raw = localStorage.getItem(MAP_EDITOR_HEX_RADIUS_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return normalizeHexRadius(parsed);
}

export function persistHexRadius(hexRadius: number): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
        MAP_EDITOR_HEX_RADIUS_STORAGE_KEY,
        String(normalizeHexRadius(hexRadius)),
    );
}

export function normalizeHexRadius(hexRadius: number): number {
    if (!Number.isFinite(hexRadius)) {
        return MAP_EDITOR_DEFAULT_HEX_RADIUS;
    }

    return Math.max(
        MAP_EDITOR_MIN_HEX_RADIUS,
        Math.min(MAP_EDITOR_MAX_HEX_RADIUS, Math.round(hexRadius)),
    );
}

export function getOwnerPaletteColor(
    factions: readonly AuthoredFactionSlot[],
    ownerId?: string | null,
): string {
    if (!ownerId || ownerId === "neutral") {
        return "#94a3b8";
    }

    const ordered = [...factions].sort((left, right) => left.order - right.order);
    const slotIndex = ordered.findIndex((faction) => faction.id === ownerId);
    if (slotIndex < 0) {
        return "#60a5fa";
    }

    return ordered[slotIndex]?.color
        ?? MAP_EDITOR_OWNER_PALETTE[slotIndex % MAP_EDITOR_OWNER_PALETTE.length]
        ?? "#60a5fa";
}

export function normalizeEditorFactions(
    factions: readonly AuthoredFactionSlot[],
): AuthoredFactionSlot[] {
    const source = factions.length > 0 ? [...factions] : buildDefaultEditorFactions();
    return source
        .sort((left, right) => left.order - right.order)
        .slice(0, MAP_EDITOR_MAX_FACTIONS)
        .map((faction, index) => ({
            ...faction,
            order: index,
            color: faction.color ?? MAP_EDITOR_OWNER_PALETTE[index],
        }));
}

function buildCellKey(q: number, r: number): string {
    return `${q}:${r}`;
}

function oddQToCube(q: number, r: number): { x: number; y: number; z: number } {
    const x = q;
    const z = r - (q - (q & 1)) / 2;
    const y = -x - z;
    return { x, y, z };
}

function getEditorHexGridCache(hexRadius: number): EditorHexGridCache {
    const normalizedRadius = normalizeHexRadius(hexRadius);
    const existing = editorHexCache.get(normalizedRadius);
    if (existing) {
        return existing;
    }

    const cells = generateIndexedHexGrid(
        MAP_EDITOR_BOARD_WIDTH - MAP_EDITOR_HEX_PADDING * 2,
        MAP_EDITOR_BOARD_HEIGHT - MAP_EDITOR_HEX_PADDING * 2,
        normalizedRadius,
    ).map((hex) => ({
        q: hex.q,
        r: hex.r,
        x: hex.x + MAP_EDITOR_HEX_PADDING,
        y: hex.y + MAP_EDITOR_HEX_PADDING,
        key: buildCellKey(hex.q, hex.r),
    }));

    const cache: EditorHexGridCache = {
        cells,
        byKey: new Map(cells.map((cell) => [cell.key, cell])),
    };
    editorHexCache.set(normalizedRadius, cache);
    return cache;
}

export function generateEditorHexGrid(hexRadius: number): EditorHexCell[] {
    return getEditorHexGridCache(hexRadius).cells;
}

export function generateEditorHexCenters(hexRadius: number): EditorPoint[] {
    return generateEditorHexGrid(hexRadius).map(({ x, y }) => ({ x, y }));
}

export function getEditorHexCell(
    hexRadius: number,
    q: number,
    r: number,
): EditorHexCell | null {
    return getEditorHexGridCache(hexRadius).byKey.get(buildCellKey(q, r)) ?? null;
}

export function snapPointToHexCell(
    point: EditorPoint,
    hexRadius: number,
): EditorHexCell {
    const centers = generateEditorHexGrid(hexRadius);
    let best = centers[0] ?? {
        q: 0,
        r: 0,
        x: point.x,
        y: point.y,
        key: buildCellKey(0, 0),
    };
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of centers) {
        const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
        if (distance < bestDistance) {
            best = candidate;
            bestDistance = distance;
        }
    }

    return best;
}

export function scalePointBetweenHexRadii(
    point: EditorPoint,
    previousHexRadius: number,
    nextHexRadius: number,
): EditorPoint {
    const fromRadius = normalizeHexRadius(previousHexRadius);
    const toRadius = normalizeHexRadius(nextHexRadius);
    if (fromRadius === toRadius || fromRadius <= 0) {
        return { x: point.x, y: point.y };
    }

    const scale = toRadius / fromRadius;
    return {
        x: MAP_EDITOR_HEX_PADDING + (point.x - MAP_EDITOR_HEX_PADDING) * scale,
        y: MAP_EDITOR_HEX_PADDING + (point.y - MAP_EDITOR_HEX_PADDING) * scale,
    };
}

export function editorHexTileDistance(
    left: Pick<EditorHexCell, "q" | "r">,
    right: Pick<EditorHexCell, "q" | "r">,
): number {
    const leftCube = oddQToCube(left.q, left.r);
    const rightCube = oddQToCube(right.q, right.r);
    return Math.max(
        Math.abs(leftCube.x - rightCube.x),
        Math.abs(leftCube.y - rightCube.y),
        Math.abs(leftCube.z - rightCube.z),
    );
}

export function snapPointToHexCenter(
    point: EditorPoint,
    hexRadius: number,
): EditorPoint {
    const cell = snapPointToHexCell(point, hexRadius);
    return { x: cell.x, y: cell.y };
}

export function buildRegularPolygonPoints(
    size: number,
    sides: number,
): string {
    if (sides <= 0) {
        return "";
    }

    const vertices: string[] = [];
    const startAngle = -Math.PI / 2;
    for (let index = 0; index < sides; index += 1) {
        const angle = startAngle + (Math.PI * 2 * index) / sides;
        const x = 12 + size * Math.cos(angle);
        const y = 12 + size * Math.sin(angle);
        vertices.push(`${x},${y}`);
    }
    return vertices.join(" ");
}

export function buildGameBoardHexPointsAt(
    centerX: number,
    centerY: number,
    radius: number,
): string {
    const vertices: string[] = [];
    for (let index = 0; index < 6; index += 1) {
        const angle = (index * Math.PI) / 3;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        vertices.push(`${x},${y}`);
    }
    return vertices.join(" ");
}

export function buildPolygonPointsAt(
    centerX: number,
    centerY: number,
    radius: number,
    sides: number,
): string {
    if (sides <= 0) {
        return "";
    }

    const vertices: string[] = [];
    const startAngle = -Math.PI / 2;
    for (let index = 0; index < sides; index += 1) {
        const angle = startAngle + (Math.PI * 2 * index) / sides;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        vertices.push(`${x},${y}`);
    }
    return vertices.join(" ");
}
