import type { StarState, StarConnection } from '../types/game.types';
import { buildCorridorVirtualSites } from '../territory/corridor/buildCorridorVirtualSites';
import type { DisconnectPairSide } from '../territory/disconnect/buildDisconnectVirtualSites';
import { buildDisconnectVirtualSites } from '../territory/disconnect/buildDisconnectVirtualSites';
import { getLanePolyline } from '../lanes/lanePolylineCache';
import { GAME_CONFIG } from '../config/game.config';

export interface VirtualSite {
    id?: string;
    x: number;
    y: number;
    weight: number;
    ownerId: string;
    kind: 'corridor' | 'disconnect';
    sourceStarA: string;
    sourceStarB: string;
    /** Corridor: endpoint star for cluster/color; disconnect: optional attribution helper */
    anchorStarId?: string;
    pairSide?: DisconnectPairSide;
}

// DISCONNECT_OWNER_ID now lives in the geometry identity layer (cleanup Stage 2);
// re-exported here so existing renderer-layer importers are unaffected.
export { DISCONNECT_OWNER_ID } from '$lib/territory/geometry/regionIdentity';

function normalizeVirtualSites(sites: VirtualSite[]): VirtualSite[] {
    if (sites.length <= 1) return [...sites];

    const normalized = sites.map((site) => {
        const sourceStarA = site.sourceStarA <= site.sourceStarB ? site.sourceStarA : site.sourceStarB;
        const sourceStarB = site.sourceStarA <= site.sourceStarB ? site.sourceStarB : site.sourceStarA;
        return {
            ...site,
            sourceStarA,
            sourceStarB,
        };
    });

    normalized.sort((a, b) => {
        const keyA = `${a.id ?? ''}|${a.kind}|${a.ownerId}|${a.sourceStarA}|${a.sourceStarB}|${a.anchorStarId ?? ''}|${a.pairSide ?? ''}|${Math.round(a.x * 100)}|${Math.round(a.y * 100)}|${Math.round(a.weight * 1000)}`;
        const keyB = `${b.id ?? ''}|${b.kind}|${b.ownerId}|${b.sourceStarA}|${b.sourceStarB}|${b.anchorStarId ?? ''}|${b.pairSide ?? ''}|${Math.round(b.x * 100)}|${Math.round(b.y * 100)}|${Math.round(b.weight * 1000)}`;
        return keyA.localeCompare(keyB);
    });

    const deduped: VirtualSite[] = [];
    let prevKey = '';
    for (const site of normalized) {
        const key = `${site.id ?? ''}|${site.kind}|${site.ownerId}|${site.sourceStarA}|${site.sourceStarB}|${site.anchorStarId ?? ''}|${site.pairSide ?? ''}|${Math.round(site.x * 100)}|${Math.round(site.y * 100)}|${Math.round(site.weight * 1000)}`;
        if (key === prevKey) continue;
        deduped.push(site);
        prevKey = key;
    }

    return deduped;
}

export function computeCorridorVirtuals(
    ownedStars: StarState[],
    connections: StarConnection[],
    spacing: number,
    weightMultiplier = 0.5,
    count?: number,
    lanePolylineResolver: (a: string, b: string) => [number, number][] | undefined = getLanePolyline,
    includeCrossOwnerMidpointPair = GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ?? true,
    includeSameOwnerDistributedSamples = true,
    includeCrossOwnerDistributedSamples = true,
    crossOwnerMidpointPairWeight = GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ?? weightMultiplier,
    crossOwnerMidpointPairCount = GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ?? 1,
    crossOwnerMidpointPairSpacing =
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_SPACING ?? 75,
    endpointExclusionPx = GAME_CONFIG.STAR_RENDER_RADIUS ?? 20,
): VirtualSite[] {
    const built = buildCorridorVirtualSites(
        ownedStars,
        connections,
        spacing,
        weightMultiplier,
        count,
        lanePolylineResolver,
        includeCrossOwnerMidpointPair,
        includeSameOwnerDistributedSamples,
        includeCrossOwnerDistributedSamples,
        crossOwnerMidpointPairWeight,
        crossOwnerMidpointPairCount,
        crossOwnerMidpointPairSpacing,
        endpointExclusionPx,
    );
    return normalizeVirtualSites(built as VirtualSite[]);
}

export function computeDisconnectVirtuals(
    ownedStars: StarState[],
    allStars: StarState[],
    connections: StarConnection[],
    maxDistance: number,
    weightMultiplier = 0.3,
): VirtualSite[] {
    const built = buildDisconnectVirtualSites(
        ownedStars,
        allStars,
        connections,
        maxDistance,
        weightMultiplier,
    );
    return normalizeVirtualSites(built as VirtualSite[]);
}
