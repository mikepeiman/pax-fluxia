import { generateMap, type LaneAdjustmentStyle, type StarType } from "@pax/common";
import type { MapLaneMode } from "@pax/common/mapgen";
import type { ThumbnailConnection, ThumbnailStar } from "$lib/utils/mapThumbnail";

export interface MainMenuPreviewRequest {
    width: number;
    height: number;
    playerCount: number;
    starsPerPlayer: number;
    minLinksPerStar: number;
    maxLinksPerStar: number;
    starSpacing: number;
    mapBoardFit: number;
    neutralStarCount: number;
    specialStarPercentage: number;
    mapgenStarMarginPx: number;
    mapgenLaneMarginPx: number;
    mapgenLaneCurveVsPruneBias: number;
    mapLaneMode: MapLaneMode;
    mapgenLaneAdjustedPathStyle?: LaneAdjustmentStyle;
}

export interface MainMenuPreviewResult {
    stars: ThumbnailStar[];
    connections: ThumbnailConnection[];
}

const previewStarTypes: StarType[] = ["grey", "yellow", "blue", "purple", "red", "green"];

export function buildMainMenuPreview(request: MainMenuPreviewRequest): MainMenuPreviewResult {
    const result = generateMap({
        width: request.width,
        height: request.height,
        playerCount: request.playerCount,
        starsPerPlayer: request.starsPerPlayer,
        extraNeutralStars: request.neutralStarCount,
        spacingMultiplier: request.starSpacing,
        hexRadius: 50,
        minLinksPerStar: request.minLinksPerStar,
        maxLinksPerStar: request.maxLinksPerStar,
        boardFit: request.mapBoardFit,
        mapgenStarMarginPx: request.mapgenStarMarginPx,
        mapgenLaneMarginPx: request.mapgenLaneMarginPx,
        mapgenLaneCurveVsPruneBias: request.mapgenLaneCurveVsPruneBias,
        mapLaneMode: request.mapLaneMode,
        mapgenLaneAdjustedPathStyle: request.mapgenLaneAdjustedPathStyle,
    });

    const ownerIds: string[] = [];
    for (let playerIndex = 0; playerIndex < request.playerCount; playerIndex++) {
        for (let starIndex = 0; starIndex < request.starsPerPlayer; starIndex++) {
            ownerIds.push(`player${playerIndex}`);
        }
    }
    for (let neutralIndex = 0; neutralIndex < request.neutralStarCount; neutralIndex++) {
        ownerIds.push("neutral");
    }

    for (let index = ownerIds.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [ownerIds[index], ownerIds[swapIndex]] = [ownerIds[swapIndex], ownerIds[index]];
    }

    const hasCapital = new Set<string>();
    const stars = result.positions.map((position, index) => {
        const ownerId = ownerIds[index];
        let isCapital = false;
        if (ownerId !== "neutral" && !hasCapital.has(ownerId)) {
            isCapital = true;
            hasCapital.add(ownerId);
        }

        const isSpecial = Math.random() * 100 < request.specialStarPercentage;
        const typeIndex = isSpecial
            ? Math.floor(Math.random() * (previewStarTypes.length - 1)) + 1
            : 0;
        const starType = isCapital ? "grey" : previewStarTypes[typeIndex];

        return {
            id: `star-${index}`,
            x: position.x,
            y: position.y,
            ownerId,
            starType,
        };
    });

    return {
        stars,
        connections: result.connections.map((connection) => ({
            sourceId: connection.sourceId,
            targetId: connection.targetId,
            laneWaypoints: connection.laneWaypoints,
            lanePathKind: connection.lanePathKind,
        })),
    };
}
