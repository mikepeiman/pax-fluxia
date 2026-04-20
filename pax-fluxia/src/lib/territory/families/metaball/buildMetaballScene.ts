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
    type MetaballConquestCacheEntry,
} from './metaballConquestTransitions';

export function buildMetaballScene(
    input: RenderFamilyInput,
    colorUtils: ColorUtils,
    conquestCache: ReadonlyMap<string, MetaballConquestCacheEntry> = new Map(),
): MetaballSceneInput {
    const baseContext = buildMetaballBaseContext(
        input,
        colorUtils,
        buildMetaballTransitionStarOverrides(input),
    );
    const samples = [
        ...baseContext.samples,
        ...buildMetaballTransitionSamples({
            input,
            context: baseContext,
            conquestCache,
        }),
    ]
        .filter((sample) => sample.strength > 1e-6)
        .sort((a, b) => {
        const idA = a.id ?? '';
        const idB = b.id ?? '';
        if (idA !== idB) return idA.localeCompare(idB);
        if (a.playerIdx !== b.playerIdx) return a.playerIdx - b.playerIdx;
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
    });

    return {
        ownedStars: baseContext.ownedStars,
        clusterMap: baseContext.clusterMap,
        playerColors: baseContext.playerColors,
        clusterShips: baseContext.clusterShips,
        samples,
        fingerprint: buildSceneFingerprint(
            samples,
            baseContext.playerColors,
            baseContext.clusterShips,
        ),
    };
}
