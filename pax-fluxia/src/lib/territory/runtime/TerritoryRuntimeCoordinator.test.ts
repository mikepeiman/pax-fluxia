import { describe, expect, it, vi } from 'vitest';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import { TerritoryRuntimeCoordinator } from './TerritoryRuntimeCoordinator';
import { buildCanonicalPowerVoronoiTransitionRuntime } from '../pvCanonical/planner';
import { sampleCanonicalPowerVoronoiTransition } from '../pvCanonical/sampler';
import {
    buildTestGeometry,
    buildTestOwnership,
    TEST_TUNABLES,
} from '../pvCanonical/testFixtures';

function buildFrameInput(
    overrides: Partial<TerritoryFrameInput> = {},
): TerritoryFrameInput {
    return {
        tickId: 1,
        nowMs: 100,
        stars: [
            { id: 'alpha', x: 1, y: 1 },
            { id: 'beta', x: 9, y: 9 },
        ] as unknown as TerritoryFrameInput['stars'],
        lanes: [] as unknown as TerritoryFrameInput['lanes'],
        players: [{ id: 'red' }, { id: 'blue' }],
        world: { width: 10, height: 10 },
        selection: {
            ownershipMode: 'star_ownership_snapshot',
            geometryMode: 'unified_vector',
            fillTransitionMode: 'pv_frontline',
            borderTransitionMode: 'optimal_transport',
            styleMode: 'pixel',
        },
        tunables: TEST_TUNABLES,
        ...overrides,
    };
}

describe('TerritoryRuntimeCoordinator', () => {
    it('recompiles paired PRE/POST canonical PV geometry on conquest with normalized selection', () => {
        const initialOwnership = buildTestOwnership('ownership:pre', []);
        const conquestOwnership = buildTestOwnership('ownership:post');
        const initialGeometry = buildTestGeometry('steady-pre', [[0, 0], [5, 5], [10, 10]]);
        const conquestGeometry = buildTestGeometry('post', [[0, 0], [4, 6], [10, 10]]);
        const rebuiltPreGeometry = buildTestGeometry('rebuilt-pre', [[0, 0], [5, 5], [10, 10]]);

        const ownershipLayer = {
            compute: vi
                .fn()
                .mockReturnValueOnce(initialOwnership)
                .mockReturnValueOnce(conquestOwnership),
        };

        const geometryCalls: unknown[] = [];
        const worker = {
            computeGeometrySync: vi.fn((request: unknown) => {
                geometryCalls.push(request);
                const callIndex = geometryCalls.length;
                const geometry =
                    callIndex === 1
                        ? initialGeometry
                        : callIndex === 2
                          ? conquestGeometry
                          : rebuiltPreGeometry;
                return {
                    requestId: (request as { requestId: string }).requestId,
                    geometry,
                    fromCache: false,
                };
            }),
        };

        const transitionInputs: unknown[] = [];
        const transitionLayer = {
            compute: vi.fn((input: unknown) => {
                transitionInputs.push(input);
                const typedInput = input as {
                    geometry: { version: string };
                    tunables: typeof TEST_TUNABLES;
                    canonicalPowerVoronoiPair: {
                        preGeometry: ReturnType<typeof buildTestGeometry>;
                        postGeometry: ReturnType<typeof buildTestGeometry>;
                        previousOwnership: ReturnType<typeof buildTestOwnership>;
                        nextOwnership: ReturnType<typeof buildTestOwnership>;
                    } | null;
                };
                const runtime = typedInput.canonicalPowerVoronoiPair
                    ? buildCanonicalPowerVoronoiTransitionRuntime({
                          ...typedInput.canonicalPowerVoronoiPair,
                          tunables: typedInput.tunables,
                      })
                    : null;
                if (runtime) {
                    sampleCanonicalPowerVoronoiTransition(runtime, 0);
                }
                return {
                    snapshot: {
                        geometryVersion: typedInput.geometry.version,
                        envelope: null,
                        fillFrame: { regions: [] },
                        borderFrame: { frontiers: [] },
                    },
                    activeFillPlan: null,
                    activeFrontPlan: runtime?.activeFrontPlan ?? null,
                    activeCanonicalPvTransition: runtime,
                    transitionPrevTopology: runtime?.preGeometry.frontierTopology ?? null,
                };
            }),
        };

        const presentationLayer = {
            compute: vi.fn(() => ({
                fills: [],
                borders: [],
                debug: [],
            })),
        };

        const runtime = new TerritoryRuntimeCoordinator(
            ownershipLayer as never,
            {} as never,
            transitionLayer as never,
            presentationLayer as never,
            worker as never,
        );
        (runtime as unknown as { geometryDumped: boolean }).geometryDumped = true;

        runtime.update(buildFrameInput());
        const conquestResult = runtime.update(
            buildFrameInput({ tickId: 2, nowMs: 200 }),
        );

        expect(geometryCalls).toHaveLength(3);
        const normalizedRequests = geometryCalls as {
            selection: TerritoryFrameInput['selection'];
            ownership: { version: string };
            tunables: TerritoryFrameInput['tunables'];
        }[];

        for (const request of normalizedRequests) {
            expect(request.selection.ownershipMode).toBe('star_ownership_snapshot');
            expect(request.selection.geometryMode).toBe('canonical_power_voronoi');
            expect(request.selection.fillTransitionMode).toBe('pv_frontline');
            expect(request.selection.borderTransitionMode).toBe('off');
            expect(request.selection.styleMode).toBe('canonical');
            expect(request.tunables).toEqual(TEST_TUNABLES);
        }

        expect(normalizedRequests[1]?.ownership.version).toBe('ownership:post');
        expect(normalizedRequests[2]?.ownership.version).toBe('ownership:pre');

        const secondTransitionInput = transitionInputs[1] as {
            selection: TerritoryFrameInput['selection'];
            canonicalPowerVoronoiPair: {
                preGeometry: { version: string };
                postGeometry: { version: string };
                previousOwnership: { version: string };
                nextOwnership: { version: string };
            } | null;
        };

        expect(secondTransitionInput.selection.geometryMode).toBe(
            'canonical_power_voronoi',
        );
        expect(secondTransitionInput.canonicalPowerVoronoiPair).not.toBeNull();
        expect(secondTransitionInput.canonicalPowerVoronoiPair?.preGeometry.version).toBe(
            'rebuilt-pre',
        );
        expect(secondTransitionInput.canonicalPowerVoronoiPair?.postGeometry.version).toBe(
            'post',
        );
        expect(
            secondTransitionInput.canonicalPowerVoronoiPair?.previousOwnership.version,
        ).toBe('ownership:pre');
        expect(secondTransitionInput.canonicalPowerVoronoiPair?.nextOwnership.version).toBe(
            'ownership:post',
        );
        expect(conquestResult.diagnostics.modeDiagnostics).toMatchObject({
            kind: 'power_voronoi_canonical',
            ownershipStage: {
                summary: {
                    conquestCount: 1,
                },
            },
            geometryStage: {
                summary: {
                    preRegionCount: 2,
                    postRegionCount: 2,
                },
            },
        });
    });
});
