import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { OwnershipSnapshot, TerritoryConquestEvent } from '../contracts/OwnershipContracts';
import type { TerritoryTunables } from '../contracts/TerritoryFrameInput';
import type { TerritoryModeSelection } from '../contracts/TerritoryModeSelection';
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
    RegionLoop,
} from '../contracts/FrontierTopologyContracts';

export const TEST_TUNABLES: TerritoryTunables = {
    transitionDurationMs: 600,
    borderWidth: 2,
    fillAlpha: 0.3,
    borderAlpha: 0.5,
    geometrySmoothingPasses: 0,
    frontierResolution: 8,
    boundaryPad: 40,
    boundaryEps: 6,
    starMargin: 45,
    msrStarBias: 0,
    corridorEnabled: true,
    corridorSpacing: 60,
    corridorCount: 0,
    corridorWeight: 0.5,
    cxContestMidpointVstars: true,
    cxContestPairCount: 1,
    cxContestPairWeight: 0.5,
    cxContestPairSpacing: 45,
    disconnectEnabled: false,
    disconnectDistance: 400,
    disconnectWeight: 0.3,
    clusterSplitThreshold: 0,
};

export const TEST_PV_FRONTLINE_SELECTION: TerritoryModeSelection = {
    ownershipMode: 'star_ownership_snapshot',
    geometryMode: 'canonical_power_voronoi',
    fillTransitionMode: 'pv_frontline',
    borderTransitionMode: 'off',
    styleMode: 'canonical',
};

export const TEST_CONQUEST_EVENT: TerritoryConquestEvent = {
    starId: 'alpha',
    previousOwner: 'red',
    newOwner: 'blue',
    atMs: 100,
};

function buildVertex(id: string, point: [number, number]): FrontierVertex {
    return {
        id,
        kind: 'world_corner',
        point,
        incidentSectionIds: [],
        ownerIds: ['red', 'blue'],
    };
}

function buildSection(
    id: string,
    ownerPairKey: string,
    startVertexId: string,
    endVertexId: string,
    points: [number, number][],
    leftOwnerId: string,
    rightOwnerId: string,
): FrontierSection {
    return {
        id,
        kind:
            ownerPairKey === 'red|world' || ownerPairKey === 'blue|world'
                ? 'world_border'
                : 'owner_border',
        startVertexId,
        endVertexId,
        leftOwnerId,
        rightOwnerId,
        points,
        length: points.length,
        ownerPairKey,
        leftInfluence: {
            ownerId: leftOwnerId,
            primaryStarId: `${leftOwnerId}-star`,
            primaryScore: 1,
        },
        rightInfluence: {
            ownerId: rightOwnerId,
            primaryStarId: `${rightOwnerId}-star`,
            primaryScore: 1,
        },
    };
}

export function buildTestTopology(
    frontierPoints: [number, number][],
    version: string,
): FrontierTopology {
    const vertices = new Map<string, FrontierVertex>([
        ['tl', buildVertex('tl', [0, 0])],
        ['tr', buildVertex('tr', [10, 0])],
        ['br', buildVertex('br', [10, 10])],
        ['bl', buildVertex('bl', [0, 10])],
    ]);
    const sharedFrontier = buildSection(
        'frontier',
        'blue|red',
        'tl',
        'br',
        frontierPoints,
        'red',
        'blue',
    );
    const top = buildSection(
        'top',
        'red|world',
        'tl',
        'tr',
        [
            [0, 0],
            [10, 0],
        ],
        'red',
        'world',
    );
    const right = buildSection(
        'right',
        'red|world',
        'tr',
        'br',
        [
            [10, 0],
            [10, 10],
        ],
        'red',
        'world',
    );
    const bottom = buildSection(
        'bottom',
        'blue|world',
        'br',
        'bl',
        [
            [10, 10],
            [0, 10],
        ],
        'blue',
        'world',
    );
    const left = buildSection(
        'left',
        'blue|world',
        'bl',
        'tl',
        [
            [0, 10],
            [0, 0],
        ],
        'blue',
        'world',
    );
    const sections = new Map<string, FrontierSection>([
        ['frontier', sharedFrontier],
        ['top', top],
        ['right', right],
        ['bottom', bottom],
        ['left', left],
    ]);

    vertices.get('tl')!.incidentSectionIds = ['frontier', 'top', 'left'];
    vertices.get('tr')!.incidentSectionIds = ['top', 'right'];
    vertices.get('br')!.incidentSectionIds = ['frontier', 'right', 'bottom'];
    vertices.get('bl')!.incidentSectionIds = ['bottom', 'left'];

    const loops: RegionLoop[] = [
        {
            id: 'red-loop',
            ownerId: 'red',
            componentId: 'red:0',
            sectionRefs: [
                { sectionId: 'top', direction: 'forward' },
                { sectionId: 'right', direction: 'forward' },
                { sectionId: 'frontier', direction: 'reverse' },
            ],
            signedArea: 50,
        },
        {
            id: 'blue-loop',
            ownerId: 'blue',
            componentId: 'blue:0',
            sectionRefs: [
                { sectionId: 'frontier', direction: 'forward' },
                { sectionId: 'bottom', direction: 'forward' },
                { sectionId: 'left', direction: 'forward' },
            ],
            signedArea: 50,
        },
    ];

    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { width: 10, height: 10 },
        vertices,
        sections,
        loops,
        sectionsByOwnerPair: new Map<string, readonly string[]>([
            ['blue|red', ['frontier']],
            ['red|world', ['top', 'right']],
            ['blue|world', ['bottom', 'left']],
        ]),
        sectionsByVertex: new Map<string, readonly string[]>([
            ['tl', ['frontier', 'top', 'left']],
            ['tr', ['top', 'right']],
            ['br', ['frontier', 'right', 'bottom']],
            ['bl', ['bottom', 'left']],
        ]),
        sectionsByOwner: new Map<string, readonly string[]>([
            ['red', ['frontier', 'top', 'right']],
            ['blue', ['frontier', 'bottom', 'left']],
        ]),
    };
}

export function buildTestGeometry(
    version: string,
    frontierPoints: [number, number][],
): GeometrySnapshot {
    const topology = buildTestTopology(frontierPoints, version);
    return {
        version,
        sourceMode: 'canonical_power_voronoi',
        sourceStyle: 'canonical',
        ownershipVersion: `ownership:${version}`,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: [
            {
                regionId: 'red-region',
                ownerId: 'red',
                points: [[0, 0], [10, 0], [10, 10], ...[...frontierPoints].reverse()],
                confidence: 1,
            },
            {
                regionId: 'blue-region',
                ownerId: 'blue',
                points: [...frontierPoints, [10, 10], [0, 10], [0, 0]],
                confidence: 1,
            },
        ],
        frontierPolylines: [
            {
                frontierId: 'frontier',
                ownerA: 'blue',
                ownerB: 'red',
                ownerPairKey: 'blue|red',
                points: frontierPoints,
                confidence: 1,
            },
        ],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map([
            [
                'blue|red',
                [
                    {
                        frontierId: 'frontier',
                        ownerA: 'blue',
                        ownerB: 'red',
                        ownerPairKey: 'blue|red',
                        points: frontierPoints,
                        confidence: 1,
                    },
                ],
            ],
        ]),
        frontierTopology: topology,
        shells: [],
        shellLoops: [],
        provenance: {
            derivedFromField: false,
            notes: [],
        },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: [],
        },
    };
}

export function buildTestOwnership(
    version: string,
    conquestEvents: readonly TerritoryConquestEvent[] = [TEST_CONQUEST_EVENT],
): OwnershipSnapshot {
    return {
        version,
        starOwners: new Map([
            ['alpha', 'red'],
            ['beta', 'blue'],
        ]),
        contestedLaneIds: [],
        conquestEvents,
        virtualStars: [],
    };
}
