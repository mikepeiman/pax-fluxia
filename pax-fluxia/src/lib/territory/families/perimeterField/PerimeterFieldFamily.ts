import * as PIXI from 'pixi.js';
import { renderMetaball, resetMetaballCache } from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import { buildPerimeterFieldRenderFamilyGeometry } from '../buildFamilyGeometry';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';
import {
    buildPerimeterFieldScene,
    type PerimeterFieldDebugSnapshot,
} from './buildPerimeterFieldScene';

const PERIMETER_FIELD_TUNABLE_KEYS = [
    'PERIMETER_FIELD_GEOMETRY_SOURCE',
    'PERIMETER_FIELD_SAMPLE_SPACING',
    'PERIMETER_FIELD_INWARD_OFFSET_PX',
    'PERIMETER_FIELD_INFLUENCE_RADIUS',
    'PERIMETER_FIELD_INFLUENCE_WEIGHT',
    'PERIMETER_FIELD_TRANSITION_RAY_COUNT',
    'PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION',
    'PERIMETER_FIELD_OLD_BOUNDARY_FADE',
    'PERIMETER_FIELD_NEW_BOUNDARY_GROW',
    'PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY',
    'PERIMETER_FIELD_DEBUG_SHOW_VSTARS',
    'PERIMETER_FIELD_DEBUG_SCRUB_ENABLED',
    'PERIMETER_FIELD_DEBUG_REPLAY_SLOT',
    'PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS',
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

function buildSessionKey(input: RenderFamilyInput): string {
    const starIds = [...input.stars]
        .map((star) => star.id)
        .sort((a, b) => a.localeCompare(b))
        .join('|');
    return `${input.world.width}x${input.world.height}:${starIds}`;
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
    if (typeof value === 'boolean' && value === false) {
        // This mode currently requires PREV-base rendering for visible fill/frontier motion.
        // Allowing NEXT-base here collapses the transition into a snap plus moving diagnostics.
        return true;
    }
    return true;
}


export class PerimeterFieldFamily implements RenderFamily {
    readonly id = 'perimeter_field';
    readonly label = 'Perimeter Field';
    readonly tunableKeys: readonly string[] = PERIMETER_FIELD_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly colorUtils: ColorUtils;
    private sessionKey: string | null = null;
    private oldGeometryKey: string | null = null;
    private oldGeometry: CanonicalGeometrySnapshot | null = null;
    private lastDebugSnapshot: PerimeterFieldDebugSnapshot | null = null;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    get debugSnapshot(): PerimeterFieldDebugSnapshot | null {
        return this.lastDebugSnapshot;
    }

    private resetState(): void {
        this.oldGeometryKey = null;
        this.oldGeometry = null;
        this.lastDebugSnapshot = null;
    }

    private buildSceneForInput(params: {
        input: RenderFamilyInput;
        currentGeometry: CanonicalGeometrySnapshot;
    }) {
        const transitionKey = buildTransitionKey(params.input);
        let displayStars = params.input.stars;
        let displayGeometry = params.currentGeometry;
        if (
            transitionKey &&
            readFreezeBaseDuringTransition(params.input) &&
            this.oldGeometry
        ) {
            displayStars = revertStarsForTransition(params.input);
            displayGeometry = this.oldGeometry;
        }

        const builtScene = buildPerimeterFieldScene({
            input: params.input,
            starsForDisplay: displayStars,
            geometry: displayGeometry,
            transitionTargetGeometry: transitionKey ? params.currentGeometry : null,
            colorUtils: this.colorUtils,
        });

        return { builtScene, displayStars };
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const nextSessionKey = buildSessionKey(input);
        if (this.sessionKey !== nextSessionKey) {
            this.sessionKey = nextSessionKey;
            this.resetState();
        }

        const currentGeometry = input.geometry;
        if (!currentGeometry) {
            this.root.visible = false;
            this.lastDebugSnapshot = null;
            return { container: this.root };
        }

        const transitionKey = buildTransitionKey(input);
        if (transitionKey) {
            if (this.oldGeometryKey !== transitionKey || !this.oldGeometry) {
                const revertedStars = revertStarsForTransition(input);
                this.oldGeometry = buildPerimeterFieldRenderFamilyGeometry({
                    stars: revertedStars,
                    lanes: input.lanes,
                    worldWidth: input.world.width,
                    worldHeight: input.world.height,
                    nowMs: input.nowMs,
                    geometrySource:
                        (input.tunables.get(
                            'PERIMETER_FIELD_GEOMETRY_SOURCE',
                        ) as string | undefined) ?? null,
                });
                this.oldGeometryKey = transitionKey;
            }
        } else {
            this.oldGeometryKey = null;
            this.oldGeometry = null;
        }

        const { builtScene, displayStars } = this.buildSceneForInput({
            input,
            currentGeometry,
        });
        this.lastDebugSnapshot = builtScene.debug;

        renderMetaball(
            [...displayStars],
            this.root,
            this.colorUtils,
            input.world.width,
            input.world.height,
            [...input.lanes],
            {
                gameTick: input.gameTick,
                sceneInput: builtScene.sceneInput,
            },
        );

        return { container: this.root };
    }

    dispose(): void {
        resetMetaballCache();
        this.sessionKey = null;
        this.resetState();
        this.root.removeChildren();
    }
}

export function createPerimeterFieldFamily(colorUtils: ColorUtils): PerimeterFieldFamily {
    return new PerimeterFieldFamily(colorUtils);
}
