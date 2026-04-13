import * as PIXI from 'pixi.js';
import { renderMetaball, resetMetaballCache } from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { RenderFamily, RenderFamilyInput, RenderFamilyOutput } from '../RenderFamilyTypes';
import { buildMetaballScene } from './buildMetaballScene';

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
    'TERRITORY_TRANSITION_MS',
    'TERRITORY_TRANSITION_BIND_TO_TICK',
    'BASE_TICK_MS',
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

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
    }

    /** PIXI root for this family (detach when switching to another render mode). */
    get displayRoot(): PIXI.Container {
        return this.root;
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const sceneInput = buildMetaballScene(input, this.colorUtils);
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
        this.root.removeChildren();
    }
}

export function createMetaballFamily(colorUtils: ColorUtils): MetaballFamily {
    return new MetaballFamily(colorUtils);
}
