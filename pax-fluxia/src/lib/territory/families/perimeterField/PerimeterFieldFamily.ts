import * as PIXI from 'pixi.js';
import { renderMetaball, resetMetaballCache } from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';
import {
    buildPerimeterFieldScene,
    type PerimeterFieldDebugSnapshot,
} from './buildPerimeterFieldScene';
import { buildTransitionPlan } from './perimeterFieldPlanEngine';
import type { TransitionPlan } from './perimeterFieldTransitionTypes';

const PERIMETER_FIELD_TUNABLE_KEYS = [
    'PERIMETER_FIELD_GEOMETRY_SOURCE',
    'PERIMETER_FIELD_SAMPLE_SPACING',
    'PERIMETER_FIELD_INWARD_OFFSET_PX',
    'PERIMETER_FIELD_INFLUENCE_RADIUS',
    'PERIMETER_FIELD_INFLUENCE_WEIGHT',
    'PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY',
    'PERIMETER_FIELD_DEBUG_SHOW_VSTARS',
    'PERIMETER_FIELD_DEBUG_SCRUB_ENABLED',
    'PERIMETER_FIELD_DEBUG_REPLAY_SLOT',
    'PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS',
    'TERRITORY_TRANSITION_MS',
    'TERRITORY_TRANSITION_BIND_TO_TICK',
    'METABALL_FILL_ENABLED',
    'METABALL_ALPHA',
    'METABALL_BLEND_SHARPNESS',
    'METABALL_CELL_SIZE',
    'METABALL_THRESHOLD',
    'METABALL_EDGE_FADE',
    'METABALL_BORDER_ENABLED',
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

export class PerimeterFieldFamily implements RenderFamily {
    readonly id = 'perimeter_field';
    readonly label = 'Perimeter Field';
    readonly tunableKeys: readonly string[] = PERIMETER_FIELD_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly colorUtils: ColorUtils;
    private sessionKey: string | null = null;
    private transitionPlanKey: string | null = null;
    private transitionPlan: TransitionPlan | null = null;
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
        this.transitionPlanKey = null;
        this.transitionPlan = null;
        this.lastDebugSnapshot = null;
    }

    private buildSceneForInput(params: {
        input: RenderFamilyInput;
        displayGeometry: CanonicalGeometrySnapshot;
    }) {
        const truth = params.input.transitionTruth ?? null;
        const builtScene = buildPerimeterFieldScene({
            input: params.input,
            starsForDisplay: params.input.stars,
            geometry: params.displayGeometry,
            previousGeometry: truth?.prevGeometry ?? null,
            transitionTargetGeometry: truth?.nextGeometry ?? null,
            transitionPlan: this.transitionPlan,
            colorUtils: this.colorUtils,
        });
        return { builtScene, displayStars: params.input.stars };
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
        const truth = input.transitionTruth ?? null;
        if (transitionKey && truth) {
            if (this.transitionPlanKey !== truth.conquestKey || !this.transitionPlan) {
                this.transitionPlan = buildTransitionPlan({
                    conquestKey: truth.conquestKey,
                    prevVSet: truth.prevVSet,
                    nextVSet: truth.nextVSet,
                    conquestEvents: input.activeTransition?.events ?? [],
                    prevGeometry: truth.prevGeometry,
                    nextGeometry: truth.nextGeometry,
                    changedFronts: truth.changedFronts,
                });
                this.transitionPlanKey = truth.conquestKey;
            }
        } else {
            this.transitionPlan = null;
            this.transitionPlanKey = null;
        }

        const displayGeometry = truth?.nextGeometry ?? currentGeometry;
        const { builtScene, displayStars } = this.buildSceneForInput({
            input,
            displayGeometry,
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
