import * as PIXI from 'pixi.js';
import { renderMetaball, resetMetaballCache } from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import { buildCanonicalRenderFamilyGeometry } from '../buildFamilyGeometry';
import type { RenderFamily, RenderFamilyInput, RenderFamilyOutput } from '../RenderFamilyTypes';
import { buildPerimeterFieldScene } from './buildPerimeterFieldScene';

const PERIMETER_FIELD_TUNABLE_KEYS = [
    'PERIMETER_FIELD_GEOMETRY_SOURCE',
    'PERIMETER_FIELD_SAMPLE_SPACING',
    'PERIMETER_FIELD_INFLUENCE_RADIUS',
    'PERIMETER_FIELD_INFLUENCE_WEIGHT',
    'PERIMETER_FIELD_TRANSITION_RAY_COUNT',
    'PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION',
    'PERIMETER_FIELD_OLD_BOUNDARY_FADE',
    'PERIMETER_FIELD_NEW_BOUNDARY_GROW',
    'TERRITORY_TRANSITION_MS',
    'TERRITORY_TRANSITION_BIND_TO_TICK',
    'METABALL_ALPHA',
    'METABALL_CELL_SIZE',
    'METABALL_THRESHOLD',
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
] as const;

function buildTransitionKey(input: RenderFamilyInput): string | null {
    const events = input.activeTransition?.events;
    if (!events?.length) return null;
    return events
        .map((entry) =>
            [
                entry.event.tick,
                entry.event.starId,
                entry.event.previousOwner,
                entry.event.newOwner,
                entry.startedAtMs,
            ].join(':'),
        )
        .join('|');
}

function revertStarsForTransition(input: RenderFamilyInput): StarState[] {
    const overrides = new Map<string, string>();
    for (const entry of input.activeTransition?.events ?? []) {
        overrides.set(entry.event.starId, entry.event.previousOwner);
    }
    return input.stars.map((star) => {
        const ownerId = overrides.get(star.id);
        return ownerId === undefined ? { ...star } : { ...star, ownerId };
    });
}

function readFreezeBaseDuringTransition(input: RenderFamilyInput): boolean {
    const value = input.tunables.get(
        'PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION',
    );
    return typeof value === 'boolean' ? value : true;
}

export class PerimeterFieldFamily implements RenderFamily {
    readonly id = 'perimeter_field';
    readonly label = 'Perimeter Field';
    readonly tunableKeys: readonly string[] = PERIMETER_FIELD_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly colorUtils: ColorUtils;
    private oldGeometryKey: string | null = null;
    private oldGeometry: CanonicalGeometrySnapshot | null = null;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const currentGeometry = input.geometry;
        if (!currentGeometry) {
            this.root.visible = false;
            return { container: this.root };
        }

        let displayStars = input.stars;
        let displayGeometry = currentGeometry;
        const transitionKey = buildTransitionKey(input);
        if (transitionKey && readFreezeBaseDuringTransition(input)) {
            if (this.oldGeometryKey !== transitionKey) {
                const revertedStars = revertStarsForTransition(input);
                this.oldGeometry = buildCanonicalRenderFamilyGeometry({
                    stars: revertedStars,
                    lanes: input.lanes,
                    worldWidth: input.world.width,
                    worldHeight: input.world.height,
                    nowMs: input.nowMs,
                });
                this.oldGeometryKey = transitionKey;
            }
            if (this.oldGeometry) {
                displayStars = revertStarsForTransition(input);
                displayGeometry = this.oldGeometry;
            }
        } else {
            this.oldGeometryKey = null;
            this.oldGeometry = null;
        }

        const sceneInput = buildPerimeterFieldScene({
            input,
            starsForDisplay: displayStars,
            geometry: displayGeometry,
            transitionTargetGeometry: transitionKey ? currentGeometry : null,
            colorUtils: this.colorUtils,
        });

        renderMetaball(
            [...displayStars],
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
        this.oldGeometryKey = null;
        this.oldGeometry = null;
        this.root.removeChildren();
    }
}

export function createPerimeterFieldFamily(colorUtils: ColorUtils): PerimeterFieldFamily {
    return new PerimeterFieldFamily(colorUtils);
}
