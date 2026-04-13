import type { StarState, StarConnection } from '$lib/types/game.types';
import { buildCorridorVirtualSites } from '$lib/territory/corridor/buildCorridorVirtualSites';
import type { DisconnectPairSide } from '$lib/territory/disconnect/buildDisconnectVirtualSites';
import { buildDisconnectVirtualSites } from '$lib/territory/disconnect/buildDisconnectVirtualSites';
import { getLanePolyline } from '$lib/lanes/lanePolylineCache';
import { GAME_CONFIG } from '$lib/config/game.config';

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

export const DISCONNECT_OWNER_ID = '__disconnect__';

function canonicalizeVirtualSites(sites: VirtualSite[]): VirtualSite[] {
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
    );
    return canonicalizeVirtualSites(built as VirtualSite[]);
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
    return canonicalizeVirtualSites(built as VirtualSite[]);
}
