import { normalizeBgImagePath } from '$lib/config/bgManifest';
import {
    BACKGROUND_MODE_BY_ID,
    DEFAULT_GAME_BACKGROUND_MODE_ID,
    DEFAULT_MENU_BACKGROUND_MODE_ID,
} from './catalog';
import type {
    BackgroundChangeDetail,
    BackgroundModeDefinition,
    BackgroundModeId,
    BackgroundSelection,
    BackgroundSurface,
    BackgroundTunables,
} from './types';

type BackgroundSelectionLike = Partial<BackgroundSelection> | string | null | undefined;

function getFallbackModeId(surface: BackgroundSurface): BackgroundModeId {
    return surface === 'menu'
        ? DEFAULT_MENU_BACKGROUND_MODE_ID
        : DEFAULT_GAME_BACKGROUND_MODE_ID;
}

function resolveModeDefinition(
    modeId: BackgroundModeId,
    surface: BackgroundSurface,
): BackgroundModeDefinition | null {
    const definition = BACKGROUND_MODE_BY_ID.get(modeId) ?? null;
    if (!definition) return null;
    if (surface === 'menu' && !definition.supportsMenu) return null;
    if (surface === 'game' && !definition.supportsGame) return null;
    return definition;
}

function normalizeFiniteNumber(
    value: unknown,
    min: number,
    max: number,
    fallback: number,
): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, value));
}

export function buildLegacyImageSelection(
    legacyImage?: string | null,
): BackgroundSelection {
    const normalized = normalizeBgImagePath(legacyImage);
    return {
        modeId: 'legacy_image',
        legacyImage: normalized,
        tunables: {},
    };
}

export function extractLegacyBackgroundImage(
    selectionLike: BackgroundSelectionLike,
    fallbackLegacyImage = '',
): string {
    const normalizedFallback = normalizeBgImagePath(fallbackLegacyImage);
    if (typeof selectionLike === 'string') {
        return normalizeBgImagePath(selectionLike);
    }
    if (!selectionLike || selectionLike.modeId !== 'legacy_image') {
        return normalizedFallback;
    }
    return normalizeBgImagePath(selectionLike.legacyImage ?? normalizedFallback);
}

export function buildDefaultBackgroundSelection(
    surface: BackgroundSurface,
    fallbackLegacyImage = '',
): BackgroundSelection {
    const defaultModeId = getFallbackModeId(surface);
    if (defaultModeId === 'legacy_image') {
        return buildLegacyImageSelection(fallbackLegacyImage);
    }
    return normalizeBackgroundSelection(
        { modeId: defaultModeId },
        { surface, fallbackLegacyImage },
    );
}

export function normalizeBackgroundSelection(
    selectionLike: BackgroundSelectionLike,
    options?: {
        surface?: BackgroundSurface;
        fallbackLegacyImage?: string;
    },
): BackgroundSelection {
    const surface = options?.surface ?? 'game';
    const fallbackLegacyImage = normalizeBgImagePath(
        options?.fallbackLegacyImage,
    );
    if (typeof selectionLike === 'string') {
        return buildLegacyImageSelection(selectionLike);
    }
    if (!selectionLike) {
        return buildDefaultBackgroundSelection(surface, fallbackLegacyImage);
    }

    const modeId = selectionLike.modeId ?? getFallbackModeId(surface);
    if (modeId === 'legacy_image') {
        return buildLegacyImageSelection(
            selectionLike.legacyImage ?? fallbackLegacyImage,
        );
    }

    const definition = resolveModeDefinition(modeId, surface);
    if (!definition) {
        return buildDefaultBackgroundSelection(surface, fallbackLegacyImage);
    }

    const tunables: BackgroundTunables = {};
    const defaults = definition.defaultsBySurface[surface];
    for (const tunable of definition.sharedTunables) {
        tunables[tunable.key] = normalizeFiniteNumber(
            selectionLike.tunables?.[tunable.key],
            tunable.min,
            tunable.max,
            defaults[tunable.key] ?? tunable.defaultValue,
        );
    }
    for (const tunable of definition.modeTunables) {
        tunables[tunable.key] = normalizeFiniteNumber(
            selectionLike.tunables?.[tunable.key],
            tunable.min,
            tunable.max,
            defaults[tunable.key] ?? tunable.defaultValue,
        );
    }

    return {
        modeId: definition.id,
        tunables,
    };
}

export function buildBackgroundChangeDetail(
    selectionLike: BackgroundSelectionLike,
    surface: BackgroundSurface,
    fallbackLegacyImage = '',
): BackgroundChangeDetail {
    const selection = normalizeBackgroundSelection(selectionLike, {
        surface,
        fallbackLegacyImage,
    });
    return {
        surface,
        selection,
        legacyImage: extractLegacyBackgroundImage(
            selection,
            fallbackLegacyImage,
        ),
    };
}

export function readBackgroundChangeDetail(
    detail: unknown,
    surface: BackgroundSurface,
    fallbackLegacyImage = '',
): BackgroundChangeDetail {
    if (typeof detail === 'string') {
        return buildBackgroundChangeDetail(detail, surface, fallbackLegacyImage);
    }
    if (
        detail &&
        typeof detail === 'object' &&
        'selection' in detail &&
        'surface' in detail
    ) {
        const input = detail as Partial<BackgroundChangeDetail>;
        return buildBackgroundChangeDetail(
            input.selection,
            input.surface === 'menu' ? 'menu' : surface,
            input.legacyImage ?? fallbackLegacyImage,
        );
    }
    return buildBackgroundChangeDetail(
        undefined,
        surface,
        fallbackLegacyImage,
    );
}
