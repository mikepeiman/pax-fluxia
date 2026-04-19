import * as PIXI from 'pixi.js';
import { renderMetaball, resetMetaballCache } from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { RenderFamily, RenderFamilyInput, RenderFamilyOutput } from '../RenderFamilyTypes';
import { buildMetaballScene } from './buildMetaballScene';
import {
    reconcileMetaballConquestCache,
    type MetaballConquestCacheEntry,
} from './metaballConquestTransitions';

const METABALL_TUNABLE_KEYS = [
    'MODIFIED_VORONOI_STAR_MARGIN',
    'MODIFIED_VORONOI_CORRIDOR_ENABLED',
    'MODIFIED_VORONOI_CORRIDOR_SPACING',
    'MODIFIED_VORONOI_DISCONNECT_ENABLED',
    'MODIFIED_VORONOI_DISCONNECT_DISTANCE',
    'TERRITORY_CX_COUNT',
    'TERRITORY_CX_WEIGHT',
    'TERRITORY_DX_WEIGHT',
    'TERRITORY_CX_CONTEST_MIDPOINT_VSTARS',
    'TERRITORY_CX_CONTEST_PAIR_COUNT',
    'TERRITORY_CX_CONTEST_PAIR_WEIGHT',
    'TERRITORY_TRANSITION_MS',
    'TERRITORY_TRANSITION_BIND_TO_TICK',
    'BASE_TICK_MS',
    'VS_VICTOR_TRAVEL_MS',
    'VS_LOSER_TRAVEL_MS',
    'VS_POWER_LERP_START',
    'VS_POWER_LERP_END',
    'VS_POWER_LERP_DURATION_MS',
    'VS_BIND_TO_TICK',
    'VS_TRANSITION_MODE',
    'METABALL_BURST_BOUNDARY_BASIS',
    'METABALL_INFLUENCE_RADIUS',
    'METABALL_FALLOFF',
    'METABALL_BLEND_SHARPNESS',
    'METABALL_ALPHA',
    'METABALL_CELL_SIZE',
    'METABALL_THRESHOLD',
    'METABALL_STRENGTH_MULT',
    'METABALL_EDGE_FADE',
    'METABALL_BORDER_WIDTH',
    'METABALL_BORDER_ALPHA',
    'METABALL_BLUR',
    'METABALL_BLUR_AFFECTS_BORDERS',
    'METABALL_COVERAGE',
    'METABALL_SATURATION',
    'METABALL_LIGHTNESS',
    'METABALL_BORDER_SATURATION',
    'METABALL_BORDER_LIGHTNESS',
    'METABALL_CHAIKIN_PASSES',
    'METABALL_FILL_FOLLOWS_GEOM',
    'METABALL_COMBAT_BORDER_TICKS',
    'METABALL_COMBAT_BORDER_PROXIMITY_PX',
    'METABALL_COMBAT_BORDER_WIDTH_BOOST',
    'METABALL_COMBAT_BORDER_ALPHA_BOOST',
    'METABALL_BORDER_FORCE_RATIO',
] as const;

/**
 * RenderFamily adapter that assembles the metaball influence scene, then hands
 * the explicit sample field to the low-level CPU grid renderer.
 */
export class MetaballFamily implements RenderFamily {
    readonly id = 'metaball';
    readonly label = 'Metaball';
    readonly tunableKeys: readonly string[] = METABALL_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly colorUtils: ColorUtils;
    private readonly conquestCache = new Map<string, MetaballConquestCacheEntry>();

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
    }

    /** PIXI root for this family (detach when switching to another render mode). */
    get displayRoot(): PIXI.Container {
        return this.root;
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        reconcileMetaballConquestCache({
            input,
            colorUtils: this.colorUtils,
            conquestCache: this.conquestCache,
        });
        const sceneInput = buildMetaballScene(
            input,
            this.colorUtils,
            this.conquestCache,
        );
        renderMetaball(
            [...input.stars],
            this.root,
            this.colorUtils,
            input.world.width,
            input.world.height,
            [...input.lanes],
            {
                gameTick: input.gameTick,
                sceneInput,
            },
        );
        return { container: this.root };
    }

    dispose(): void {
        resetMetaballCache();
        this.conquestCache.clear();
        this.root.removeChildren();
    }
}

export function createMetaballFamily(colorUtils: ColorUtils): MetaballFamily {
    return new MetaballFamily(colorUtils);
}
