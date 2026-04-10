import * as PIXI from 'pixi.js';
import { renderMetaball, resetMetaballCache } from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { RenderFamily, RenderFamilyInput, RenderFamilyOutput } from '../RenderFamilyTypes';

const METABALL_TUNABLE_KEYS = [
    'MODIFIED_VORONOI_DISCONNECT_ENABLED',
    'MODIFIED_VORONOI_DISCONNECT_DISTANCE',
    'TERRITORY_DX_WEIGHT',
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
    'METABALL_COMBAT_BORDER_TICKS',
    'METABALL_COMBAT_BORDER_PROXIMITY_PX',
    'METABALL_COMBAT_BORDER_WIDTH_BOOST',
    'METABALL_COMBAT_BORDER_ALPHA_BOOST',
    'METABALL_BORDER_FORCE_RATIO',
] as const;

/**
 * Thin RenderFamily adapter over legacy `renderMetaball` (CPU grid + PIXI.Graphics).
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
        renderMetaball(
            [...input.stars],
            this.root,
            this.colorUtils,
            input.world.width,
            input.world.height,
            [...input.lanes],
            { gameTick: input.gameTick },
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
