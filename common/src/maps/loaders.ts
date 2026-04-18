import { FIXTURE_MAPS, type FixtureMapDescriptor } from '../fixtureMaps';
import { coerceAuthoredMapDefinition, parseAuthoredMapJson } from './importers';
import type { AuthoredMapDefinition } from './types';

export interface FixtureMapManifestEntry {
    id: string;
    name: string;
    purpose: string;
    tags: string[];
    notes?: string[];
    resourcePath: string;
}

export interface RepositoryMapManifestEntry {
    mapId: string;
    name: string;
    author?: string;
    updatedAt?: string;
    starCount: number;
    laneCount: number;
    measurementCount: number;
}

export function getFixtureMapManifest(): FixtureMapManifestEntry[] {
    return FIXTURE_MAPS.map((fixture) => ({
        id: fixture.id,
        name: fixture.name,
        purpose: fixture.purpose,
        tags: [...fixture.tags],
        notes: fixture.notes ? [...fixture.notes] : undefined,
        resourcePath: fixture.resourcePath,
    }));
}

export function buildRepositoryMapManifest(
    maps: readonly AuthoredMapDefinition[],
): RepositoryMapManifestEntry[] {
    return maps.map((map) => ({
        mapId: map.metadata.mapId,
        name: map.metadata.name,
        author: map.metadata.author,
        updatedAt: map.metadata.updatedAt,
        starCount: map.stars.length,
        laneCount: map.connections.length,
        measurementCount: map.measurements?.length ?? 0,
    }));
}

export async function loadFixtureMapDefinition(
    fixture: FixtureMapDescriptor | string,
    readText: (resourcePath: string) => Promise<string>,
): Promise<AuthoredMapDefinition> {
    const descriptor =
        typeof fixture === 'string'
            ? FIXTURE_MAPS.find((entry) => entry.id === fixture)
            : fixture;

    if (!descriptor) {
        throw new Error(`Unknown fixture map "${String(fixture)}"`);
    }

    const text = await readText(descriptor.resourcePath);
    const parsed = parseAuthoredMapJson(text);
    const map = coerceAuthoredMapDefinition(parsed, {
        kind: 'fixture',
        sourceId: descriptor.id,
        sourcePath: descriptor.resourcePath,
    });

    return {
        ...map,
        metadata: {
            ...map.metadata,
            importedFrom: {
                kind: 'fixture',
                sourceId: descriptor.id,
                sourcePath: descriptor.resourcePath,
            },
        },
    };
}
