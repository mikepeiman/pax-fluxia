import * as PIXI from 'pixi.js';
import { renderMetaball, resetMetaballCache } from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import { buildPerimeterFieldRenderFamilyGeometry } from '../buildFamilyGeometry';
import { buildOwnershipSnapshotFromStars } from '../buildFamilyGeometry';
import type {
    RenderFamily,
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyOutput,
    RenderFamilyTransitionEvent,
} from '../RenderFamilyTypes';
import {
    buildPerimeterFieldScene,
    type PerimeterFieldBuiltScene,
    type PerimeterFieldDebugSnapshot,
} from './buildPerimeterFieldScene';
import {
    compactPerimeterFieldDebugSnapshot,
    renderPerimeterFieldDiagnosticCanvas,
} from './perimeterFieldDiagnostics';

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
const DIAGNOSTIC_CAPTURE_PROGRESS_VALUES = [
    0,
    1 / 6,
    2 / 6,
    3 / 6,
    4 / 6,
    5 / 6,
    1,
] as const;

interface PerimeterFieldReplayCapture {
    key: string;
    label: string;
    stars: ReadonlyArray<StarState>;
    oldGeometry: CanonicalGeometrySnapshot;
    newGeometry: CanonicalGeometrySnapshot;
    events: ReadonlyArray<RenderFamilyTransitionEvent>;
}

export interface PerimeterFieldTransitionDiagnosticCapture {
    previousGeometry: CanonicalGeometrySnapshot;
    nextGeometry: CanonicalGeometrySnapshot;
    previousOwnership: ReturnType<typeof buildOwnershipSnapshotFromStars>;
    nextOwnership: ReturnType<typeof buildOwnershipSnapshotFromStars>;
    prevCanvas: HTMLCanvasElement;
    nextCanvas: HTMLCanvasElement;
    transitionFrames: { progress: number; canvas: HTMLCanvasElement }[];
    extraDiagnostics: Record<string, unknown>;
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

function buildDebugScrubTransition(
    input: RenderFamilyInput,
): RenderFamilyActiveTransition | null {
    if (!input.paused || !input.activeTransition) {
        return null;
    }
    const scrubEnabled = readBooleanTunable(
        input,
        'PERIMETER_FIELD_DEBUG_SCRUB_ENABLED',
        false,
    );
    if (!scrubEnabled) {
        return null;
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
    return activeTransition;
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
    private lastDiagnosticCaptureKey: string | null = null;

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
        this.lastDiagnosticCaptureKey = null;
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

    private buildLiveScrubDebugSnapshot(params: {
        input: RenderFamilyInput;
        currentGeometry: CanonicalGeometrySnapshot;
    }): PerimeterFieldDebugSnapshot | null {
        const scrubbedTransition = buildDebugScrubTransition(params.input);
        if (!scrubbedTransition) return null;

        const scrubbedInput: RenderFamilyInput = {
            ...params.input,
            activeTransition: scrubbedTransition,
        };

        const transitionKey = buildTransitionKey(scrubbedInput);
        let displayStars = scrubbedInput.stars;
        let displayGeometry = params.currentGeometry;
        if (
            transitionKey &&
            readFreezeBaseDuringTransition(scrubbedInput) &&
            this.oldGeometry
        ) {
            displayStars = revertStarsForTransition(scrubbedInput);
            displayGeometry = this.oldGeometry;
        }

        return buildPerimeterFieldScene({
            input: scrubbedInput,
            starsForDisplay: displayStars,
            geometry: displayGeometry,
            transitionTargetGeometry: transitionKey ? params.currentGeometry : null,
            colorUtils: this.colorUtils,
        }).debug;
    }

    private buildSceneForInput(params: {
        input: RenderFamilyInput;
        currentGeometry: CanonicalGeometrySnapshot;
    }): {
        builtScene: PerimeterFieldBuiltScene;
        displayStars: ReadonlyArray<StarState>;
    } {
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

    private cloneActiveTransitionAtProgress(
        transition: RenderFamilyActiveTransition,
        progress: number,
    ): RenderFamilyActiveTransition {
        const clamped = clamp01(progress);
        return {
            ...transition,
            progress: clamped,
            rawProgress: clamped,
            events: transition.events.map((entry) => ({
                ...entry,
                progress: clamped,
                rawProgress: clamped,
            })),
        };
    }

    private renderSceneToDiagnosticCanvas(params: {
        input: RenderFamilyInput;
        displayStars: ReadonlyArray<StarState>;
        builtScene: PerimeterFieldBuiltScene;
    }): HTMLCanvasElement | null {
        if (!params.input.renderer) return null;

        const tempRoot = new PIXI.Container();
        try {
            renderMetaball(
                [...params.displayStars],
                tempRoot,
                this.colorUtils,
                params.input.world.width,
                params.input.world.height,
                [...params.input.lanes],
                {
                    gameTick: params.input.gameTick,
                    sceneInput: params.builtScene.sceneInput,
                },
            );

            const baseCanvas = params.input.renderer.extract.canvas({
                target: tempRoot,
                frame: new PIXI.Rectangle(
                    0,
                    0,
                    params.input.world.width,
                    params.input.world.height,
                ),
                clearColor: '#000000',
            }) as HTMLCanvasElement;

            return renderPerimeterFieldDiagnosticCanvas({
                width: params.input.world.width,
                height: params.input.world.height,
                baseCanvas,
                snapshot: params.builtScene.debug,
                showGeometry: true,
                showVstars: true,
            });
        } finally {
            tempRoot.destroy({ children: true });
        }
    }

    buildTransitionDiagnosticCapture(
        input: RenderFamilyInput,
    ): PerimeterFieldTransitionDiagnosticCapture | null {
        const transitionKey = buildTransitionKey(input);
        if (
            !transitionKey ||
            !input.activeTransition ||
            !input.renderer ||
            !this.oldGeometry ||
            this.lastDiagnosticCaptureKey === transitionKey
        ) {
            return null;
        }

        const prevStars = revertStarsForTransition(input);
        const previousOwnership = buildOwnershipSnapshotFromStars(prevStars);
        const nextOwnership = buildOwnershipSnapshotFromStars(input.stars);
        if (!input.geometry) {
            return null;
        }
        const currentGeometry = input.geometry;

        const prevInput: RenderFamilyInput = {
            ...input,
            stars: prevStars,
            ownership: previousOwnership,
            activeTransition: null,
        };
        const prevBuiltScene = buildPerimeterFieldScene({
            input: prevInput,
            starsForDisplay: prevStars,
            geometry: this.oldGeometry,
            transitionTargetGeometry: null,
            colorUtils: this.colorUtils,
        });
        const prevCanvas = this.renderSceneToDiagnosticCanvas({
            input: prevInput,
            displayStars: prevStars,
            builtScene: prevBuiltScene,
        });

        const nextInput: RenderFamilyInput = {
            ...input,
            ownership: nextOwnership,
            activeTransition: null,
        };
        const nextBuiltScene = buildPerimeterFieldScene({
            input: nextInput,
            starsForDisplay: input.stars,
            geometry: currentGeometry,
            transitionTargetGeometry: null,
            colorUtils: this.colorUtils,
        });
        const nextCanvas = this.renderSceneToDiagnosticCanvas({
            input: nextInput,
            displayStars: input.stars,
            builtScene: nextBuiltScene,
        });

        if (!prevCanvas || !nextCanvas) {
            return null;
        }

        const transitionFrames = DIAGNOSTIC_CAPTURE_PROGRESS_VALUES.map(
            (progress) => {
                const frameInput: RenderFamilyInput = {
                    ...input,
                    activeTransition: this.cloneActiveTransitionAtProgress(
                        input.activeTransition!,
                        progress,
                    ),
                };
                const { builtScene, displayStars } = this.buildSceneForInput({
                    input: frameInput,
                    currentGeometry,
                });
                const canvas = this.renderSceneToDiagnosticCanvas({
                    input: frameInput,
                    displayStars,
                    builtScene,
                });

                return canvas
                    ? {
                          progress,
                          canvas,
                          debug: compactPerimeterFieldDebugSnapshot(
                              builtScene.debug,
                          ),
                      }
                    : null;
            },
        ).filter(
            (
                frame,
            ): frame is {
                progress: number;
                canvas: HTMLCanvasElement;
                debug: Record<string, unknown> | null;
            } => frame !== null,
        );

        this.lastDiagnosticCaptureKey = transitionKey;

        return {
            previousGeometry: this.oldGeometry,
            nextGeometry: currentGeometry,
            previousOwnership,
            nextOwnership,
            prevCanvas,
            nextCanvas,
            transitionFrames: transitionFrames.map(({ progress, canvas }) => ({
                progress,
                canvas,
            })),
            extraDiagnostics: {
                kind: 'perimeter_field',
                previousFrame: compactPerimeterFieldDebugSnapshot(
                    prevBuiltScene.debug,
                ),
                nextFrame: compactPerimeterFieldDebugSnapshot(nextBuiltScene.debug),
                transitionFrames: transitionFrames.map((frame) => ({
                    progress: frame.progress,
                    snapshot: frame.debug,
                })),
            },
        };
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const nextSessionKey = buildSessionKey(input);
        if (this.sessionKey !== nextSessionKey) {
            this.sessionKey = nextSessionKey;
            this.resetReplayState();
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
            this.lastDiagnosticCaptureKey = null;
        }

        const { builtScene, displayStars } = this.buildSceneForInput({
            input,
            currentGeometry,
        });
        this.lastDebugSnapshot =
            this.buildReplayDebugSnapshot(input) ??
            this.buildLiveScrubDebugSnapshot({ input, currentGeometry }) ??
            builtScene.debug;

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
        this.resetReplayState();
        this.root.removeChildren();
    }
}

export function createPerimeterFieldFamily(colorUtils: ColorUtils): PerimeterFieldFamily {
    return new PerimeterFieldFamily(colorUtils);
}
