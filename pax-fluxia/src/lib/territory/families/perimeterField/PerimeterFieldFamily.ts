import * as PIXI from 'pixi.js';
import { renderMetaball, resetMetaballCache } from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import { buildPerimeterFieldRenderFamilyGeometry } from '../buildFamilyGeometry';
import type {
    RenderFamily,
    RenderFamilyActiveTransition,
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
    'PERIMETER_FIELD_DEBUG_SCRUB_ENABLED',
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

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

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

function readBooleanTunable(
    input: RenderFamilyInput,
    key: string,
    fallback: boolean,
): boolean {
    const value = input.tunables.get(key);
    return typeof value === 'boolean' ? value : fallback;
}

function readNumberTunable(
    input: RenderFamilyInput,
    key: string,
    fallback: number,
): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function withDebugScrubTransition(
    input: RenderFamilyInput,
): RenderFamilyInput {
    if (!input.paused || !input.activeTransition) {
        return input;
    }
    const scrubEnabled = readBooleanTunable(
        input,
        'PERIMETER_FIELD_DEBUG_SCRUB_ENABLED',
        false,
    );
    if (!scrubEnabled) {
        return input;
    }
    const scrubProgress = clamp01(
        readNumberTunable(
            input,
            'PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS',
            input.activeTransition.progress,
        ),
    );
    const activeTransition: RenderFamilyActiveTransition = {
        ...input.activeTransition,
        progress: scrubProgress,
        rawProgress: scrubProgress,
        events: input.activeTransition.events.map((entry) => ({
            ...entry,
            progress: scrubProgress,
            rawProgress: scrubProgress,
        })),
    };
    return {
        ...input,
        activeTransition,
    };
}

export class PerimeterFieldFamily implements RenderFamily {
    readonly id = 'perimeter_field';
    readonly label = 'Perimeter Field';
    readonly tunableKeys: readonly string[] = PERIMETER_FIELD_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly colorUtils: ColorUtils;
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

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const effectiveInput = withDebugScrubTransition(input);
        const currentGeometry = effectiveInput.geometry;
        if (!currentGeometry) {
            this.root.visible = false;
            this.lastDebugSnapshot = null;
            return { container: this.root };
        }

        let displayStars = effectiveInput.stars;
        let displayGeometry = currentGeometry;
        const transitionKey = buildTransitionKey(effectiveInput);
        if (transitionKey && readFreezeBaseDuringTransition(effectiveInput)) {
            if (this.oldGeometryKey !== transitionKey) {
                const revertedStars = revertStarsForTransition(effectiveInput);
                this.oldGeometry = buildPerimeterFieldRenderFamilyGeometry({
                    stars: revertedStars,
                    lanes: effectiveInput.lanes,
                    worldWidth: effectiveInput.world.width,
                    worldHeight: effectiveInput.world.height,
                    nowMs: effectiveInput.nowMs,
                    geometrySource:
                        (effectiveInput.tunables.get(
                            'PERIMETER_FIELD_GEOMETRY_SOURCE',
                        ) as string | undefined) ?? null,
                });
                this.oldGeometryKey = transitionKey;
            }
            if (this.oldGeometry) {
                displayStars = revertStarsForTransition(effectiveInput);
                displayGeometry = this.oldGeometry;
            }
        } else {
            this.oldGeometryKey = null;
            this.oldGeometry = null;
        }

        const builtScene = buildPerimeterFieldScene({
            input: effectiveInput,
            starsForDisplay: displayStars,
            geometry: displayGeometry,
            transitionTargetGeometry: transitionKey ? currentGeometry : null,
            colorUtils: this.colorUtils,
        });
        this.lastDebugSnapshot = builtScene.debug;

        renderMetaball(
            [...displayStars],
            this.root,
            this.colorUtils,
            effectiveInput.world.width,
            effectiveInput.world.height,
            [...effectiveInput.lanes],
            {
                gameTick: effectiveInput.gameTick,
                sceneInput: builtScene.sceneInput,
            },
        );

        return { container: this.root };
    }

    dispose(): void {
        resetMetaballCache();
        this.oldGeometryKey = null;
        this.oldGeometry = null;
        this.lastDebugSnapshot = null;
        this.root.removeChildren();
    }
}

export function createPerimeterFieldFamily(colorUtils: ColorUtils): PerimeterFieldFamily {
    return new PerimeterFieldFamily(colorUtils);
}
