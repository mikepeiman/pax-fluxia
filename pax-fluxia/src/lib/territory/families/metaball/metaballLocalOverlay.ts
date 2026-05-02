import * as PIXI from 'pixi.js';
import type {
    MetaballInfluenceSample,
    MetaballSceneInput,
    MetaballSolveBounds,
} from '../../../renderers/MetaballRenderer';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import {
    buildSceneFingerprint,
    findNearestOwnedStarByOwner,
    type MetaballBaseContext,
} from './metaballSceneBase';
import type { MetaballConquestCacheEntry } from './metaballConquestTransitions';

type MutableBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

type DisplayBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

function includePoint(
    bounds: MutableBounds | null,
    x: number,
    y: number,
): MutableBounds {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return bounds ?? {
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
        };
    }
    if (!bounds) {
        return {
            minX: x,
            minY: y,
            maxX: x,
            maxY: y,
        };
    }
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
    return bounds;
}

function includeRect(
    bounds: MutableBounds | null,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
): MutableBounds {
    let nextBounds = includePoint(bounds, minX, minY);
    nextBounds = includePoint(nextBounds, maxX, maxY);
    return nextBounds;
}

function finalizeBounds(
    bounds: MutableBounds,
    padding: number,
): MetaballSolveBounds {
    const minX = bounds.minX - padding;
    const minY = bounds.minY - padding;
    const maxX = bounds.maxX + padding;
    const maxY = bounds.maxY + padding;
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
    };
}

function boundsFingerprint(bounds: MetaballSolveBounds): string {
    return [
        Math.round(bounds.minX * 10),
        Math.round(bounds.minY * 10),
        Math.round(bounds.maxX * 10),
        Math.round(bounds.maxY * 10),
    ].join(':');
}

function isSampleNearBounds(
    sample: MetaballInfluenceSample,
    bounds: MetaballSolveBounds,
    margin: number,
): boolean {
    return (
        sample.x >= bounds.minX - margin &&
        sample.x <= bounds.maxX + margin &&
        sample.y >= bounds.minY - margin &&
        sample.y <= bounds.maxY + margin
    );
}

function buildTransitionKey(params: {
    starId: string;
    previousOwner?: string | null;
    newOwner?: string | null;
    startedAtMs: number;
}): string {
    return [
        params.starId,
        params.previousOwner ?? '',
        params.newOwner ?? '',
        params.startedAtMs,
    ].join(':');
}

function collectAttackerIds(transitionEvent: {
    attackerStarId?: string | null;
    attackerStarIds?: ReadonlyArray<string> | null;
}): ReadonlyArray<string> {
    return [
        ...new Set(
            transitionEvent.attackerStarIds?.length
                ? transitionEvent.attackerStarIds
                : transitionEvent.attackerStarId
                  ? [transitionEvent.attackerStarId]
                  : [],
        ),
    ];
}

function drawMaskRect(
    graphics: PIXI.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
): void {
    if (width <= 0 || height <= 0) return;
    graphics.rect(x, y, width, height).fill({ color: 0xffffff, alpha: 1 });
}

export function buildDerivedMetaballSceneInput(params: {
    sceneInput: MetaballSceneInput;
    staticSamples: ReadonlyArray<MetaballInfluenceSample>;
    dynamicSamples: ReadonlyArray<MetaballInfluenceSample>;
    solveBounds?: MetaballSolveBounds;
    sceneTag: string;
}): MetaballSceneInput {
    const staticFingerprint =
        params.staticSamples.length > 0
            ? buildSceneFingerprint(
                  params.staticSamples,
                  params.sceneInput.playerColors,
                  params.sceneInput.clusterShips,
              )
            : '';
    const dynamicFingerprint =
        params.dynamicSamples.length > 0
            ? buildSceneFingerprint(
                  params.dynamicSamples,
                  params.sceneInput.playerColors,
                  params.sceneInput.clusterShips,
              )
            : '';
    const fingerprint = [
        params.sceneInput.sceneFingerprint ??
            params.sceneInput.fingerprint ??
            'scene',
        params.sceneTag,
        params.solveBounds ? boundsFingerprint(params.solveBounds) : 'full',
        staticFingerprint,
        dynamicFingerprint,
    ].join('::');

    return {
        ...params.sceneInput,
        staticSamples: params.staticSamples,
        dynamicSamples: params.dynamicSamples,
        samples: [...params.staticSamples, ...params.dynamicSamples],
        staticFingerprint,
        dynamicFingerprint,
        sceneFingerprint: fingerprint,
        fingerprint,
        solveBounds: params.solveBounds,
    };
}

export function buildLocalizedMetaballSceneInput(params: {
    sceneInput: MetaballSceneInput;
    solveBounds: MetaballSolveBounds;
    sampleMarginPx: number;
    sceneTag: string;
}): MetaballSceneInput {
    const staticSamples = (params.sceneInput.staticSamples ?? []).filter((sample) =>
        isSampleNearBounds(sample, params.solveBounds, params.sampleMarginPx),
    );
    const dynamicSamples = (params.sceneInput.dynamicSamples ?? []).filter((sample) =>
        isSampleNearBounds(sample, params.solveBounds, params.sampleMarginPx),
    );

    return buildDerivedMetaballSceneInput({
        sceneInput: params.sceneInput,
        staticSamples,
        dynamicSamples,
        solveBounds: params.solveBounds,
        sceneTag: params.sceneTag,
    });
}

export function buildMetaballTransitionSolveBounds(params: {
    input: RenderFamilyInput;
    baseContext: MetaballBaseContext;
    conquestCache?: ReadonlyMap<string, MetaballConquestCacheEntry>;
    influenceRadiusPx: number;
    blurPx: number;
    borderWidth: number;
    cellSize: number;
}): MetaballSolveBounds | null {
    let bounds: MutableBounds | null = null;

    for (const transition of params.input.activeTransition?.events ?? []) {
        if (transition.progress >= 1) continue;
        const conquest = transition.event;
        const targetStar = params.baseContext.actualStarsById.get(conquest.starId);
        if (!targetStar) continue;

        bounds = includePoint(bounds, targetStar.x, targetStar.y);

        for (const attackerId of collectAttackerIds(conquest)) {
            const attackerStar = params.baseContext.actualStarsById.get(attackerId);
            if (!attackerStar) continue;
            bounds = includePoint(bounds, attackerStar.x, attackerStar.y);
        }

        if (conquest.previousOwner) {
            const retreatAnchor = findNearestOwnedStarByOwner(
                params.baseContext.ownedStars,
                conquest.previousOwner,
                targetStar.x,
                targetStar.y,
                targetStar.id,
            );
            if (retreatAnchor) {
                bounds = includePoint(bounds, retreatAnchor.x, retreatAnchor.y);
            }
        }

        const cacheKey = buildTransitionKey({
            starId: conquest.starId,
            previousOwner: conquest.previousOwner,
            newOwner: conquest.newOwner,
            startedAtMs: transition.startedAtMs,
        });
        const cacheEntry = params.conquestCache?.get(cacheKey);
        if (!cacheEntry) continue;

        bounds = includePoint(
            bounds,
            cacheEntry.targetOrigin.x,
            cacheEntry.targetOrigin.y,
        );
        for (const attackerSite of cacheEntry.attackerSites) {
            bounds = includePoint(bounds, attackerSite.x, attackerSite.y);
        }
        if (cacheEntry.commonBurstDistancePx > 0) {
            bounds = includeRect(
                bounds,
                cacheEntry.targetOrigin.x - cacheEntry.commonBurstDistancePx,
                cacheEntry.targetOrigin.y - cacheEntry.commonBurstDistancePx,
                cacheEntry.targetOrigin.x + cacheEntry.commonBurstDistancePx,
                cacheEntry.targetOrigin.y + cacheEntry.commonBurstDistancePx,
            );
            for (const direction of cacheEntry.loserRayDirections) {
                bounds = includePoint(
                    bounds,
                    cacheEntry.targetOrigin.x +
                        direction.x * cacheEntry.commonBurstDistancePx,
                    cacheEntry.targetOrigin.y +
                        direction.y * cacheEntry.commonBurstDistancePx,
                );
            }
        }
    }

    if (!bounds) return null;

    const padding = Math.max(
        params.cellSize * 2,
        params.influenceRadiusPx * 2 +
            params.blurPx * 6 +
            params.borderWidth * 2,
    );

    return finalizeBounds(bounds, padding);
}

export function updateMetaballLocalOverlayMask(params: {
    baseRenderLayer: PIXI.Container;
    baseMask: PIXI.Graphics;
    solveBounds: MetaballSolveBounds | null;
    displayBounds: DisplayBounds;
}): void {
    params.baseMask.clear();

    if (!params.solveBounds) {
        params.baseRenderLayer.mask = null;
        return;
    }

    const outerMinX = params.displayBounds.minX;
    const outerMinY = params.displayBounds.minY;
    const outerMaxX = params.displayBounds.maxX;
    const outerMaxY = params.displayBounds.maxY;
    const cutMinX = Math.max(outerMinX, params.solveBounds.minX);
    const cutMinY = Math.max(outerMinY, params.solveBounds.minY);
    const cutMaxX = Math.min(outerMaxX, params.solveBounds.maxX);
    const cutMaxY = Math.min(outerMaxY, params.solveBounds.maxY);

    if (cutMinX >= cutMaxX || cutMinY >= cutMaxY) {
        drawMaskRect(
            params.baseMask,
            outerMinX,
            outerMinY,
            outerMaxX - outerMinX,
            outerMaxY - outerMinY,
        );
        params.baseRenderLayer.mask = params.baseMask;
        return;
    }

    drawMaskRect(
        params.baseMask,
        outerMinX,
        outerMinY,
        outerMaxX - outerMinX,
        cutMinY - outerMinY,
    );
    drawMaskRect(
        params.baseMask,
        outerMinX,
        cutMinY,
        cutMinX - outerMinX,
        cutMaxY - cutMinY,
    );
    drawMaskRect(
        params.baseMask,
        cutMaxX,
        cutMinY,
        outerMaxX - cutMaxX,
        cutMaxY - cutMinY,
    );
    drawMaskRect(
        params.baseMask,
        outerMinX,
        cutMaxY,
        outerMaxX - outerMinX,
        outerMaxY - cutMaxY,
    );
    params.baseRenderLayer.mask = params.baseMask;
}
