import { GAME_CONFIG } from '$lib/config/game.config';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import type {
    GridAdjacency,
    GridDistribution,
    GridFlipTransition,
    GridOriginMode,
    GridWaveGeometry,
    GridWaveSeeding,
} from '../metaballGrid/metaballGridTypes';
import {
    gridGradientFamilyConfigDefaults,
    type GridGradientBorderDotStyle,
    type GridGradientCellShape,
    type GridGradientDrawBackend,
    type GridGradientFillStyle,
    type GridGradientShaderNeighborMode,
} from './config';
import { isGridGradientCellShape } from './gridGradientScene';

export const GRID_GRADIENT_TUNABLE_KEYS = [
    'GRID_GRADIENT_ENABLED',
    'GRID_GRADIENT_DEBUG_TRANSITIONS',
    'GRID_GRADIENT_FILL_STYLE',
    'GRID_GRADIENT_SPACING_PX',
    'GRID_GRADIENT_MAX_CELLS',
    'GRID_GRADIENT_ORIGIN_MODE',
    'GRID_GRADIENT_DISTRIBUTION',
    'GRID_GRADIENT_POSITION_JITTER',
    'GRID_GRADIENT_CENTER_SIZE_PX',
    'GRID_GRADIENT_EDGE_SIZE_PX',
    'GRID_GRADIENT_CURVE_POWER',
    'GRID_GRADIENT_FILL_HUE_SHIFT_DEG',
    'GRID_GRADIENT_BORDER_OFFSET_PX',
    'GRID_GRADIENT_CELL_SHAPE',
    'GRID_GRADIENT_VECTOR_BORDERS_ENABLED',
    'GRID_GRADIENT_BORDER_DOTS_ENABLED',
    'GRID_GRADIENT_BORDER_DOT_SIZE_PX',
    'GRID_GRADIENT_BORDER_DOT_STYLE',
    'GRID_GRADIENT_SHADER_NEIGHBOR_MODE',
    'GRID_GRADIENT_SHADER_MARK_SOFTNESS',
    'GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX',
    'GRID_GRADIENT_SHADER_NOISE_STRENGTH',
    'GRID_GRADIENT_SHADER_PULSE_STRENGTH',
    'GRID_GRADIENT_SHADER_PULSE_SPEED',
    'GRID_GRADIENT_SHADER_FIELD_DRIFT_PX',
    'GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED',
    'GRID_GRADIENT_SHADER_GLOW_STRENGTH',
    'GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST',
    'GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST',
    'TERRITORY_SURFACE_ALPHA',
    'TERRITORY_SURFACE_SATURATION',
    'TERRITORY_SURFACE_LIGHTNESS',
    'TERRITORY_SURFACE_BORDER_WIDTH',
    'TERRITORY_SURFACE_BORDER_ALPHA',
    'TERRITORY_SURFACE_BORDER_SATURATION',
    'TERRITORY_SURFACE_BORDER_LIGHTNESS',
    'CELL_GRID_ADJACENCY',
    'CELL_GRID_WAVE_GEOMETRY',
    'CELL_GRID_WAVE_SEEDING',
    'CELL_GRID_FLIP_TRANSITION',
    'CELL_GRID_FLIP_WINDOW',
] as const;

export interface GridGradientSettings {
    readonly enabled: boolean;
    readonly debugTransitions: boolean;
    readonly drawBackend: GridGradientDrawBackend;
    readonly fillStyle: GridGradientFillStyle;
    readonly spacingPx: number;
    readonly maxCells: number;
    readonly originMode: GridOriginMode;
    readonly distribution: GridDistribution;
    readonly positionJitter: number;
    readonly centerSizePx: number;
    readonly edgeSizePx: number;
    readonly curvePower: number;
    readonly borderOffsetPx: number;
    readonly cellShape: GridGradientCellShape;
    readonly vectorBordersEnabled: boolean;
    readonly borderDotsEnabled: boolean;
    readonly borderDotSizePx: number;
    readonly borderDotStyle: GridGradientBorderDotStyle;
    readonly shaderNeighborMode: GridGradientShaderNeighborMode;
    readonly shaderMarkSoftness: number;
    readonly shaderEdgeSoftnessPx: number;
    readonly shaderNoiseStrength: number;
    readonly shaderPulseStrength: number;
    readonly shaderPulseSpeed: number;
    readonly shaderFieldDriftPx: number;
    readonly shaderFieldDriftSpeed: number;
    readonly shaderGlowStrength: number;
    readonly shaderInteriorAlphaBoost: number;
    readonly shaderEdgeAlphaBoost: number;
    readonly fillHueShiftDeg: number;
    readonly fillAlpha: number;
    readonly fillSaturation: number;
    readonly fillLightness: number;
    readonly borderWidthPx: number;
    readonly borderAlpha: number;
    readonly borderSaturation: number;
    readonly borderLightness: number;
    readonly adjacency: GridAdjacency;
    readonly waveGeometry: GridWaveGeometry;
    readonly waveSeeding: GridWaveSeeding;
    readonly flipTransition: GridFlipTransition;
    readonly flipWindow: number;
}

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function readTunableNumber(
    input: RenderFamilyInput,
    key: string,
    fallback: number,
): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback;
}

function readTunableBoolean(
    input: RenderFamilyInput,
    key: string,
    fallback: boolean,
): boolean {
    const value = input.tunables.get(key);
    return typeof value === 'boolean' ? value : fallback;
}

function readTunableString<T extends string>(
    input: RenderFamilyInput,
    key: string,
    fallback: T,
    allowed: readonly T[],
): T {
    const value = input.tunables.get(key);
    return typeof value === 'string' && (allowed as readonly string[]).includes(value)
        ? value as T
        : fallback;
}

export function resolveGridGradientSettings(input: RenderFamilyInput): GridGradientSettings {
    const defaults = gridGradientFamilyConfigDefaults;
    const requestedCenterSize = readTunableNumber(
        input,
        'GRID_GRADIENT_CENTER_SIZE_PX',
        defaults.GRID_GRADIENT_CENTER_SIZE_PX,
    );
    const edgeSizePx = clamp(
        readTunableNumber(
            input,
            'GRID_GRADIENT_EDGE_SIZE_PX',
            defaults.GRID_GRADIENT_EDGE_SIZE_PX,
        ),
        0.5,
        16,
    );
    const centerSizePx = clamp(
        Math.max(edgeSizePx, requestedCenterSize),
        edgeSizePx,
        48,
    );
    const rawShape = input.tunables.get('GRID_GRADIENT_CELL_SHAPE');
    const cellShape = isGridGradientCellShape(rawShape)
        ? rawShape
        : defaults.GRID_GRADIENT_CELL_SHAPE;

    return {
        enabled: readTunableBoolean(
            input,
            'GRID_GRADIENT_ENABLED',
            defaults.GRID_GRADIENT_ENABLED,
        ),
        debugTransitions: readTunableBoolean(
            input,
            'GRID_GRADIENT_DEBUG_TRANSITIONS',
            defaults.GRID_GRADIENT_DEBUG_TRANSITIONS,
        ),
        drawBackend: readTunableString(
            input,
            'GRID_GRADIENT_DRAW_BACKEND',
            defaults.GRID_GRADIENT_DRAW_BACKEND,
            ['graphics', 'shader_field', 'mesh_quads'],
        ),
        fillStyle: readTunableString(
            input,
            'GRID_GRADIENT_FILL_STYLE',
            defaults.GRID_GRADIENT_FILL_STYLE,
            ['pointillist', 'solid'],
        ),
        spacingPx: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SPACING_PX',
                defaults.GRID_GRADIENT_SPACING_PX,
            ),
            2,
            64,
        ),
        maxCells: Math.max(
            0,
            Math.round(
                readTunableNumber(
                    input,
                    'GRID_GRADIENT_MAX_CELLS',
                    defaults.GRID_GRADIENT_MAX_CELLS,
                ),
            ),
        ),
        originMode: readTunableString(
            input,
            'GRID_GRADIENT_ORIGIN_MODE',
            defaults.GRID_GRADIENT_ORIGIN_MODE,
            ['centered', 'corner'],
        ),
        distribution: readTunableString(
            input,
            'GRID_GRADIENT_DISTRIBUTION',
            defaults.GRID_GRADIENT_DISTRIBUTION,
            ['square', 'hex_offset', 'jittered'],
        ),
        positionJitter: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_POSITION_JITTER',
                defaults.GRID_GRADIENT_POSITION_JITTER,
            ),
            0,
            0.5,
        ),
        centerSizePx,
        edgeSizePx,
        curvePower: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_CURVE_POWER',
                defaults.GRID_GRADIENT_CURVE_POWER,
            ),
            0.1,
            6,
        ),
        fillHueShiftDeg: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_FILL_HUE_SHIFT_DEG',
                defaults.GRID_GRADIENT_FILL_HUE_SHIFT_DEG,
            ),
            -180,
            180,
        ),
        borderOffsetPx: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_BORDER_OFFSET_PX',
                defaults.GRID_GRADIENT_BORDER_OFFSET_PX,
            ),
            0,
            80,
        ),
        cellShape,
        vectorBordersEnabled: readTunableBoolean(
            input,
            'GRID_GRADIENT_VECTOR_BORDERS_ENABLED',
            defaults.GRID_GRADIENT_VECTOR_BORDERS_ENABLED,
        ),
        borderDotsEnabled: readTunableBoolean(
            input,
            'GRID_GRADIENT_BORDER_DOTS_ENABLED',
            defaults.GRID_GRADIENT_BORDER_DOTS_ENABLED,
        ),
        borderDotSizePx: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_BORDER_DOT_SIZE_PX',
                defaults.GRID_GRADIENT_BORDER_DOT_SIZE_PX,
            ),
            0.5,
            20,
        ),
        borderDotStyle: readTunableString(
            input,
            'GRID_GRADIENT_BORDER_DOT_STYLE',
            defaults.GRID_GRADIENT_BORDER_DOT_STYLE,
            ['blended', 'butted'],
        ),
        shaderNeighborMode: readTunableString(
            input,
            'GRID_GRADIENT_SHADER_NEIGHBOR_MODE',
            defaults.GRID_GRADIENT_SHADER_NEIGHBOR_MODE,
            ['center', 'cross', 'eight'],
        ),
        shaderMarkSoftness: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_MARK_SOFTNESS',
                defaults.GRID_GRADIENT_SHADER_MARK_SOFTNESS,
            ),
            0,
            1.5,
        ),
        shaderEdgeSoftnessPx: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX',
                defaults.GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX,
            ),
            0,
            8,
        ),
        shaderNoiseStrength: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_NOISE_STRENGTH',
                defaults.GRID_GRADIENT_SHADER_NOISE_STRENGTH,
            ),
            0,
            2,
        ),
        shaderPulseStrength: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_PULSE_STRENGTH',
                defaults.GRID_GRADIENT_SHADER_PULSE_STRENGTH,
            ),
            0,
            1,
        ),
        shaderPulseSpeed: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_PULSE_SPEED',
                defaults.GRID_GRADIENT_SHADER_PULSE_SPEED,
            ),
            0,
            20,
        ),
        shaderFieldDriftPx: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_FIELD_DRIFT_PX',
                defaults.GRID_GRADIENT_SHADER_FIELD_DRIFT_PX,
            ),
            0,
            12,
        ),
        shaderFieldDriftSpeed: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED',
                defaults.GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED,
            ),
            0,
            8,
        ),
        shaderGlowStrength: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_GLOW_STRENGTH',
                defaults.GRID_GRADIENT_SHADER_GLOW_STRENGTH,
            ),
            0,
            2,
        ),
        shaderInteriorAlphaBoost: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST',
                defaults.GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST,
            ),
            0,
            3,
        ),
        shaderEdgeAlphaBoost: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST',
                defaults.GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST,
            ),
            0,
            3,
        ),
        fillAlpha: clamp(
            readTunableNumber(input, 'TERRITORY_SURFACE_ALPHA', GAME_CONFIG.TERRITORY_SURFACE_ALPHA ?? 0.52),
            0,
            1,
        ),
        fillSaturation: clamp(
            readTunableNumber(input, 'TERRITORY_SURFACE_SATURATION', GAME_CONFIG.TERRITORY_SURFACE_SATURATION ?? 1),
            0,
            3,
        ),
        fillLightness: clamp(
            readTunableNumber(input, 'TERRITORY_SURFACE_LIGHTNESS', GAME_CONFIG.TERRITORY_SURFACE_LIGHTNESS ?? 1),
            0,
            3,
        ),
        borderWidthPx: clamp(
            readTunableNumber(input, 'TERRITORY_SURFACE_BORDER_WIDTH', GAME_CONFIG.TERRITORY_SURFACE_BORDER_WIDTH ?? 2),
            0,
            20,
        ),
        borderAlpha: clamp(
            readTunableNumber(input, 'TERRITORY_SURFACE_BORDER_ALPHA', GAME_CONFIG.TERRITORY_SURFACE_BORDER_ALPHA ?? 0.5),
            0,
            1,
        ),
        borderSaturation: clamp(
            readTunableNumber(input, 'TERRITORY_SURFACE_BORDER_SATURATION', GAME_CONFIG.TERRITORY_SURFACE_BORDER_SATURATION ?? 1),
            0,
            3,
        ),
        borderLightness: clamp(
            readTunableNumber(input, 'TERRITORY_SURFACE_BORDER_LIGHTNESS', GAME_CONFIG.TERRITORY_SURFACE_BORDER_LIGHTNESS ?? 1),
            0,
            3,
        ),
        adjacency: readTunableString(
            input,
            'CELL_GRID_ADJACENCY',
            '8',
            ['4', '8'],
        ),
        waveGeometry: readTunableString(
            input,
            'CELL_GRID_WAVE_GEOMETRY',
            'euclidean_band',
            ['grid_bfs', 'euclidean_band', 'conquered_star_radial', 'pre_to_post_frontier'],
        ),
        waveSeeding: readTunableString(
            input,
            'CELL_GRID_WAVE_SEEDING',
            'winner_natives',
            ['winner_natives', 'conquered_star_center', 'winner_nearest_edge'],
        ),
        flipTransition: readTunableString(
            input,
            'CELL_GRID_FLIP_TRANSITION',
            'dual_pass_blend',
            ['hard', 'lerp_per_cell', 'dual_pass_blend'],
        ),
        flipWindow: clamp(
            readTunableNumber(input, 'CELL_GRID_FLIP_WINDOW', 0.14),
            0,
            0.5,
        ),
    };
}
