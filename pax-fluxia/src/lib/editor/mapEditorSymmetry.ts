import {
    MAP_EDITOR_BOARD_HEIGHT,
    MAP_EDITOR_BOARD_WIDTH,
    snapPointToHexCell,
} from "$lib/editor/mapEditorPresentation";

export const MAP_EDITOR_SYMMETRY_FOLDS = [2, 3, 4, 5, 6] as const;

export type MapEditorSymmetryFold = (typeof MAP_EDITOR_SYMMETRY_FOLDS)[number];

interface SymmetryStarPoint {
    id: string;
    x: number;
    y: number;
}

export interface SymmetryCandidate {
    sourceId: string;
    x: number;
    y: number;
    gridQ: number;
    gridR: number;
}

function rotatePointAroundCenter(
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    angleRad: number,
): { x: number; y: number } {
    const dx = x - centerX;
    const dy = y - centerY;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    return {
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos,
    };
}

export function buildRotationalSymmetryCandidates(params: {
    stars: readonly SymmetryStarPoint[];
    fold: MapEditorSymmetryFold;
    hexRadius: number;
    centerX?: number;
    centerY?: number;
}): SymmetryCandidate[] {
    const {
        stars,
        fold,
        hexRadius,
        centerX = MAP_EDITOR_BOARD_WIDTH * 0.5,
        centerY = MAP_EDITOR_BOARD_HEIGHT * 0.5,
    } = params;

    const seenGridKeys = new Set<string>();
    const candidates: SymmetryCandidate[] = [];

    for (const star of stars) {
        for (let step = 1; step < fold; step += 1) {
            const rotated = rotatePointAroundCenter(
                star.x,
                star.y,
                centerX,
                centerY,
                (Math.PI * 2 * step) / fold,
            );
            const snapped = snapPointToHexCell(rotated, hexRadius);
            const gridKey = `${snapped.q}:${snapped.r}`;
            if (seenGridKeys.has(gridKey)) {
                continue;
            }
            seenGridKeys.add(gridKey);
            candidates.push({
                sourceId: star.id,
                x: snapped.x,
                y: snapped.y,
                gridQ: snapped.q,
                gridR: snapped.r,
            });
        }
    }

    return candidates;
}
