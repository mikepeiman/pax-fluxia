import type { AuthoredMapCategory, AuthoredMapDefinition, AuthoredMapMetadata } from './types';

type ImportedKind = NonNullable<AuthoredMapMetadata['importedFrom']>['kind'];

const VALID_MAP_CATEGORIES = new Set<AuthoredMapCategory>(['classic', 'custom', 'test']);

function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}

export function slugifyAuthoredMapKey(value: string): string {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || `map-${Date.now()}`;
}

export function isAuthoredMapCategory(value: unknown): value is AuthoredMapCategory {
    return typeof value === 'string' && VALID_MAP_CATEGORIES.has(value as AuthoredMapCategory);
}

export function normalizeAuthoredMapTags(tags: unknown): string[] | undefined {
    if (!Array.isArray(tags)) return undefined;

    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const tag of tags) {
        if (typeof tag !== 'string') continue;
        const trimmed = tag.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push(trimmed);
    }

    return normalized.length > 0 ? normalized : undefined;
}

export function normalizeAuthoredMapFamilyName(value: unknown): string | undefined {
    return normalizeOptionalText(value);
}

export function normalizeAuthoredMapFamilyId(value: unknown): string | undefined {
    const normalized = normalizeOptionalText(value);
    return normalized ? slugifyAuthoredMapKey(normalized) : undefined;
}

export function resolveOrCreateAuthoredMapFamily(
    metadata: Pick<AuthoredMapMetadata, 'familyId' | 'familyName' | 'mapId' | 'name'>,
    fallbackName?: string,
): { familyId: string; familyName: string } {
    const familyName = normalizeAuthoredMapFamilyName(metadata.familyName)
        ?? normalizeOptionalText(fallbackName)
        ?? normalizeOptionalText(metadata.name)
        ?? normalizeOptionalText(metadata.mapId)
        ?? 'Map Family';

    const familyId = normalizeAuthoredMapFamilyId(metadata.familyId)
        ?? normalizeAuthoredMapFamilyId(metadata.mapId)
        ?? slugifyAuthoredMapKey(familyName);

    return {
        familyId,
        familyName,
    };
}

export function categoryFromImportedKind(
    kind: ImportedKind | undefined,
): AuthoredMapCategory {
    switch (kind) {
        case 'classic':
        case 'builtin':
            return 'classic';
        case 'fixture':
            return 'test';
        case 'legacy-json':
        case 'editor':
        default:
            return 'custom';
    }
}

export function normalizeAuthoredMapMetadata(
    metadata: AuthoredMapMetadata,
): AuthoredMapMetadata {
    const category = isAuthoredMapCategory(metadata.category)
        ? metadata.category
        : categoryFromImportedKind(metadata.importedFrom?.kind);
    const tags = normalizeAuthoredMapTags(metadata.tags);
    const familyName = normalizeAuthoredMapFamilyName(metadata.familyName);
    const familyId = normalizeAuthoredMapFamilyId(metadata.familyId)
        ?? (familyName ? slugifyAuthoredMapKey(familyName) : undefined);

    return {
        ...metadata,
        category,
        familyId,
        familyName,
        tags,
    };
}

export function normalizeAuthoredMapDefinition(
    map: AuthoredMapDefinition,
): AuthoredMapDefinition {
    return {
        ...map,
        metadata: normalizeAuthoredMapMetadata(map.metadata),
    };
}

export function resolveAuthoredMapCategory(
    map: Pick<AuthoredMapDefinition, 'metadata'>,
    options?: { isBuiltin?: boolean },
): AuthoredMapCategory {
    if (options?.isBuiltin) {
        return 'classic';
    }

    if (isAuthoredMapCategory(map.metadata.category)) {
        return map.metadata.category;
    }

    if (map.metadata.importedFrom?.kind === 'fixture') {
        return 'test';
    }

    return 'custom';
}
