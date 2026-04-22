import type { AuthoredMapCategory, AuthoredMapDefinition, AuthoredMapMetadata } from './types';

type ImportedKind = NonNullable<AuthoredMapMetadata['importedFrom']>['kind'];

const VALID_MAP_CATEGORIES = new Set<AuthoredMapCategory>(['classic', 'custom', 'test']);

export function isAuthoredMapCategory(value: unknown): value is AuthoredMapCategory {
    return typeof value === 'string' && VALID_MAP_CATEGORIES.has(value as AuthoredMapCategory);
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

    return {
        ...metadata,
        category,
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
