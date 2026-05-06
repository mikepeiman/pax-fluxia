import { describe, expect, it } from "vitest";

import type { ResolvedGeometrySnapshot } from "$lib/territory/contracts/GeometryContracts";
import type { FrontierTopology } from "$lib/territory/contracts/FrontierTopologyContracts";
import {
    buildTerritoryPresentationFrameKey,
    localizeResolvedGeometrySnapshot,
    localizeTerritoryPresentationStars,
} from "$lib/components/game/territoryPresentationSpace";

function buildGeometry(): ResolvedGeometrySnapshot {
    const topology: FrontierTopology = {
        version: "topology-v1",
        ownershipVersion: "ownership-v1",
        worldBounds: { width: 1600, height: 900 },
        vertices: new Map([
            [
                "v0",
                {
                    id: "v0",
                    kind: "junction_3way",
                    point: [200, 300],
                    incidentSectionIds: ["s0"],
                    ownerIds: ["a", "b", "c"],
                },
            ],
            [
                "v1",
                {
                    id: "v1",
                    kind: "world_intersection",
                    point: [500, 300],
                    incidentSectionIds: ["s0"],
                    ownerIds: ["a", "b"],
                },
            ],
        ]),
        sections: new Map([
            [
                "s0",
                {
                    id: "s0",
                    kind: "owner_border",
                    startVertexId: "v0",
                    endVertexId: "v1",
                    leftOwnerId: "a",
                    rightOwnerId: "b",
                    points: [
                        [200, 300],
                        [350, 280],
                        [500, 300],
                    ],
                    length: 301,
                    ownerPairKey: "a|b",
                    leftInfluence: {
                        ownerId: "a",
                        primaryStarId: "star-a",
                        primaryScore: 1,
                    },
                    rightInfluence: {
                        ownerId: "b",
                        primaryStarId: "star-b",
                        primaryScore: 1,
                    },
                },
            ],
        ]),
        loops: [
            {
                id: "loop-0",
                ownerId: "a",
                componentId: "component-0",
                sectionRefs: [{ sectionId: "s0", direction: "forward" }],
                signedArea: 9000,
            },
        ],
        sectionsByOwnerPair: new Map([["a|b", ["s0"]]]),
        sectionsByVertex: new Map([
            ["v0", ["s0"]],
            ["v1", ["s0"]],
        ]),
        sectionsByOwner: new Map([
            ["a", ["s0"]],
            ["b", ["s0"]],
        ]),
    };

    return {
        version: "geometry-v1",
        sourceMode: "power_voronoi",
        sourceStyle: "vector",
        ownershipVersion: "ownership-v1",
        geometryFamily: "vector-native",
        sourceMethod: "power_voronoi",
        territoryRegions: [
            {
                regionId: "region-0",
                ownerId: "a",
                points: [
                    [200, 300],
                    [500, 300],
                    [500, 600],
                ],
                confidence: 1,
            },
        ],
        frontierPolylines: [
            {
                frontierId: "frontier-0",
                ownerA: "a",
                ownerB: "b",
                ownerPairKey: "a|b",
                points: [
                    [200, 300],
                    [350, 280],
                    [500, 300],
                ],
                confidence: 1,
            },
        ],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: topology,
        shells: [
            {
                shellId: "shell-0",
                ownerId: "a",
                points: [
                    [200, 300],
                    [500, 300],
                    [500, 600],
                ],
                area: 1000,
                absArea: 1000,
                confidence: 1,
                holeLoopIds: [],
            },
        ],
        shellLoops: [
            {
                shellLoopId: "shell-loop-0",
                ownerId: "a",
                points: [
                    [200, 300],
                    [500, 300],
                    [500, 600],
                ],
                classification: "outer",
                confidence: 1,
            },
        ],
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

describe("territoryPresentationSpace", () => {
    it("builds a stable frame key for the viewport-aligned territory frame", () => {
        expect(
            buildTerritoryPresentationFrameKey({
                minX: -123.45678,
                minY: 45.67891,
                width: 1920,
                height: 1080,
            }),
        ).toBe("-123.457:45.679:1920:1080");
    });

    it("localizes territory stars into the viewport frame", () => {
        const localized = localizeTerritoryPresentationStars(
            [
                {
                    id: "star-0",
                    x: 450,
                    y: 600,
                    ownerId: "a",
                    shipCount: 20,
                    productionRate: 5,
                    radius: 12,
                    totalShips: 20,
                    availableShips: 20,
                    isCapital: false,
                },
            ],
            {
                minX: 200,
                minY: 100,
                width: 1600,
                height: 900,
            },
        );

        expect(localized[0].x).toBe(250);
        expect(localized[0].y).toBe(500);
    });

    it("localizes resolved geometry into the same frame and caches by frame key", () => {
        const geometry = buildGeometry();
        const frame = {
            minX: 200,
            minY: 100,
            width: 2200,
            height: 1200,
        };

        const localizedA = localizeResolvedGeometrySnapshot(geometry, frame);
        const localizedB = localizeResolvedGeometrySnapshot(geometry, frame);

        expect(localizedA).toBe(localizedB);
        expect(localizedA.version).toBe(
            "geometry-v1@presentation:200:100:2200:1200",
        );
        expect(localizedA.territoryRegions[0].points[0]).toEqual([0, 200]);
        expect(localizedA.frontierPolylines[0].points[1]).toEqual([150, 180]);
        expect(localizedA.shells[0].points[2]).toEqual([300, 500]);
        expect(localizedA.frontierTopology.worldBounds).toEqual({
            width: 2200,
            height: 1200,
        });
        expect(localizedA.frontierTopology.vertices.get("v0")?.point).toEqual([
            0,
            200,
        ]);
        expect(localizedA.frontierTopology.sections.get("s0")?.points[2]).toEqual(
            [300, 200],
        );
    });
});
