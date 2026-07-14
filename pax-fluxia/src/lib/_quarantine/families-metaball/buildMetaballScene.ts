
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { MetaballSceneInput } from '$lib/renderers/MetaballRenderer';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import {
    buildSceneFingerprint,
    buildMetaballBaseContext,
} from './metaballSceneBase';
import {
    buildMetaballTransitionSamples,
    buildMetaballTransitionStarOverrides,
    buildMetaballTransitionStaticStarOverrides,
    type MetaballConquestCacheEntry,
} from './metaballConquestTransitions';
import type {
    MetaballBaseContext,
    MetaballInfluenceSample,
} from './metaballSceneBase';

export interface MetaballStaticScene {
    baseContext: MetaballBaseContext;
    staticSamples: ReadonlyArray<MetaballInfluenceSample>;
    staticFingerprint: string;
}

function sortSamples(
    samples: ReadonlyArray<MetaballInfluenceSample>,
): MetaballInfluenceSample[] {
    return [...samples].sort((a, b) => {
        const idA = a.id ?? '';
        const idB = b.id ?? '';
        if (idA !== idB) return idA.localeCompare(idB);
        if (a.playerIdx !== b.playerIdx) return a.playerIdx - b.playerIdx;
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
    });
}

function mergeSamples(
    staticSamples: ReadonlyArray<MetaballInfluenceSample>,
    dynamicSamples: ReadonlyArray<MetaballInfluenceSample>,
): MetaballInfluenceSample[] {
    const merged = new Map<string, MetaballInfluenceSample>();
    const append = (sample: MetaballInfluenceSample) => {
        const mergeKey = [
            sample.id ?? '',
            sample.playerIdx,
            sample.corridorVirtual ? 1 : 0,
            sample.disconnectVirtual ? 1 : 0,
        ].join(':');
        const existing = merged.get(mergeKey);
        if (existing) {
            existing.strength += sample.strength;
            return;
        }
        merged.set(mergeKey, { ...sample });
    };

    for (const sample of staticSamples) append(sample);
    for (const sample of dynamicSamples) append(sample);

    return sortSamples(
        [...merged.values()].filter((sample) => Math.abs(sample.strength) > 1e-6),
    );
}

export function buildMetaballStaticScene(
    input: RenderFamilyInput,
    colorUtils: ColorUtils,
): MetaballStaticScene {
    const baseContext = buildMetaballBaseContext(
        input,
        colorUtils,
        buildMetaballTransitionStaticStarOverrides(input),
    );
    const staticSamples = sortSamples(baseContext.samples);

    const staticScene = {
        baseContext,
        staticSamples,
        staticFingerprint: buildSceneFingerprint(
            staticSamples,
            baseContext.playerColors,
            baseContext.clusterShips,
        ),
    };

    return staticScene;
}

export function buildMetaballScene(
    input: RenderFamilyInput,
    colorUtils: ColorUtils,
    conquestCache: ReadonlyMap<string, MetaballConquestCacheEntry> = new Map(),
    staticScene?: MetaballStaticScene,
): MetaballSceneInput {
    const resolvedStaticScene =
        staticScene ??
        (() => {
            const baseContext = buildMetaballBaseContext(
                input,
                colorUtils,
                buildMetaballTransitionStarOverrides(input),
            );
            const staticSamples = sortSamples(baseContext.samples);
            return {
                baseContext,
                staticSamples,
                staticFingerprint: buildSceneFingerprint(
                    staticSamples,
                    baseContext.playerColors,
                    baseContext.clusterShips,
                ),
            } satisfies MetaballStaticScene;
        })();
    const dynamicSamples = sortSamples(
        buildMetaballTransitionSamples({
            input,
            context: resolvedStaticScene.baseContext,
            conquestCache,
            includeTargetStrengthDeltas: Boolean(staticScene),
        }),
    );
    const dynamicFingerprint =
        dynamicSamples.length > 0
            ? buildSceneFingerprint(
                  dynamicSamples,
                  resolvedStaticScene.baseContext.playerColors,
                  resolvedStaticScene.baseContext.clusterShips,
              )
            : '';
    const samples =
        dynamicSamples.length > 0
            ? mergeSamples(resolvedStaticScene.staticSamples, dynamicSamples)
            : resolvedStaticScene.staticSamples;

    const sceneInput = {
        ownedStars: resolvedStaticScene.baseContext.ownedStars,
        clusterMap: resolvedStaticScene.baseContext.clusterMap,
        playerColors: resolvedStaticScene.baseContext.playerColors,
        clusterShips: resolvedStaticScene.baseContext.clusterShips,
        staticSamples: resolvedStaticScene.staticSamples,
        dynamicSamples,
        samples,
        staticFingerprint: resolvedStaticScene.staticFingerprint,
        dynamicFingerprint,
        sceneFingerprint: `${resolvedStaticScene.staticFingerprint}::${dynamicFingerprint}`,
        fingerprint: `${resolvedStaticScene.staticFingerprint}::${dynamicFingerprint}`,
    };

    return sceneInput;
}
