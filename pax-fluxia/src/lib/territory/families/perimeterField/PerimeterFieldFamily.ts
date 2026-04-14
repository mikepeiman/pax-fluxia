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
    RenderFamilyTransitionEvent,
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

const MAX_REPLAY_HISTORY = 3;

interface PerimeterFieldReplayCapture {
    key: string;
    label: string;
    stars: ReadonlyArray<StarState>;
    oldGeometry: CanonicalGeometrySnapshot;
    newGeometry: CanonicalGeometrySnapshot;
    events: ReadonlyArray<RenderFamilyTransitionEvent>;
}

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

function cloneTransitionEvents(
    events: ReadonlyArray<RenderFamilyTransitionEvent>,
): RenderFamilyTransitionEvent[] {
    return events.map((entry) => ({
        ...entry,
        event: {
            ...entry.event,
            attackerStarIds: [...entry.event.attackerStarIds],
            attackerShipTransfers: [...entry.event.attackerShipTransfers],
        },
    }));
}

function buildReplayLabel(
    events: ReadonlyArray<RenderFamilyTransitionEvent>,
): string {
    const first = events[0];
    if (!first) return 'Replay';
    const { previousOwner, newOwner, starId } = first.event;
    if (events.length === 1) {
        return `${previousOwner} -> ${newOwner} @ ${starId}`;
    }
    return `${previousOwner} -> ${newOwner} @ ${starId} (+${events.length - 1})`;
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

function readReplaySlot(input: RenderFamilyInput): number {
    return Math.max(
        0,
        Math.min(
            MAX_REPLAY_HISTORY,
            Math.round(
                readNumberTunable(input, 'PERIMETER_FIELD_DEBUG_REPLAY_SLOT', 0),
            ),
        ),
    );
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
    private sessionKey: string | null = null;
    private oldGeometryKey: string | null = null;
    private oldGeometry: CanonicalGeometrySnapshot | null = null;
    private lastDebugSnapshot: PerimeterFieldDebugSnapshot | null = null;
    private replayHistory: PerimeterFieldReplayCapture[] = [];

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    get debugSnapshot(): PerimeterFieldDebugSnapshot | null {
        return this.lastDebugSnapshot;
    }

    private resetReplayState(): void {
        this.oldGeometryKey = null;
        this.oldGeometry = null;
        this.lastDebugSnapshot = null;
        this.replayHistory = [];
    }

    private captureReplay(params: {
        key: string;
        input: RenderFamilyInput;
        oldGeometry: CanonicalGeometrySnapshot;
        newGeometry: CanonicalGeometrySnapshot;
    }): void {
        if (this.replayHistory.some((entry) => entry.key === params.key)) {
            return;
        }

        const capture: PerimeterFieldReplayCapture = {
            key: params.key,
            label: buildReplayLabel(params.input.activeTransition?.events ?? []),
            stars: params.input.stars.map((star) => ({ ...star })),
            oldGeometry: params.oldGeometry,
            newGeometry: params.newGeometry,
            events: cloneTransitionEvents(params.input.activeTransition?.events ?? []),
        };

        this.replayHistory = [capture, ...this.replayHistory].slice(
            0,
            MAX_REPLAY_HISTORY,
        );
    }

    private buildReplayDebugSnapshot(
        input: RenderFamilyInput,
    ): PerimeterFieldDebugSnapshot | null {
        if (!input.paused) return null;

        const replaySlot = readReplaySlot(input);
        if (replaySlot <= 0) return null;

        const replay = this.replayHistory[replaySlot - 1];
        if (!replay || replay.events.length === 0) return null;

        const scrubProgress = clamp01(
            readNumberTunable(
                input,
                'PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS',
                0,
            ),
        );
        const firstEvent = replay.events[0]!;
        const activeTransition: RenderFamilyActiveTransition = {
            conquestEvents: replay.events.map((entry) => entry.event),
            events: replay.events.map((entry) => ({
                ...entry,
                progress: scrubProgress,
                rawProgress: scrubProgress,
            })),
            startedAtMs: firstEvent.startedAtMs,
            durationMs: firstEvent.durationMs,
            progress: scrubProgress,
            rawProgress: scrubProgress,
        };

        return buildPerimeterFieldScene({
            input: {
                ...input,
                stars: replay.stars,
                geometry: replay.oldGeometry,
                activeTransition,
            },
            starsForDisplay: replay.stars,
            geometry: replay.oldGeometry,
            transitionTargetGeometry: replay.newGeometry,
            colorUtils: this.colorUtils,
        }).debug;
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const nextSessionKey = buildSessionKey(input);
        if (this.sessionKey !== nextSessionKey) {
            this.sessionKey = nextSessionKey;
            this.resetReplayState();
        }

        const effectiveInput = withDebugScrubTransition(input);
        const currentGeometry = effectiveInput.geometry;
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
                this.captureReplay({
                    key: transitionKey,
                    input,
                    oldGeometry: this.oldGeometry,
                    newGeometry: currentGeometry,
                });
            }
        } else {
            this.oldGeometryKey = null;
            this.oldGeometry = null;
        }

        let displayStars = effectiveInput.stars;
        let displayGeometry = currentGeometry;
        if (
            transitionKey &&
            readFreezeBaseDuringTransition(effectiveInput) &&
            this.oldGeometry
        ) {
            displayStars = revertStarsForTransition(effectiveInput);
            displayGeometry = this.oldGeometry;
        }

        const builtScene = buildPerimeterFieldScene({
            input: effectiveInput,
            starsForDisplay: displayStars,
            geometry: displayGeometry,
            transitionTargetGeometry: transitionKey ? currentGeometry : null,
            colorUtils: this.colorUtils,
        });
        this.lastDebugSnapshot =
            this.buildReplayDebugSnapshot(input) ?? builtScene.debug;

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
        this.sessionKey = null;
        this.resetReplayState();
        this.root.removeChildren();
    }
}

export function createPerimeterFieldFamily(colorUtils: ColorUtils): PerimeterFieldFamily {
    return new PerimeterFieldFamily(colorUtils);
}
