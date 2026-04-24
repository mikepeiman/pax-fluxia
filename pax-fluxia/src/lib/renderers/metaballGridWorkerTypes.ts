export interface MetaballWorkerSample {
    id?: string;
    x: number;
    y: number;
    playerIdx: number;
    strength: number;
    corridorVirtual?: boolean;
    disconnectVirtual?: boolean;
}

export interface MetaballWorkerStar {
    x: number;
    y: number;
    clusterIdx: number;
    lastCombatTick?: number;
    lastAttackTick?: number;
}

export interface MetaballWorkerConfig {
    worldWidth: number;
    worldHeight: number;
    gameTick?: number;
    radius: number;
    falloffType: string;
    sharpness: number;
    alpha: number;
    cellSize: number;
    dominanceFilterOn: boolean;
    dominanceMinActive: number;
    edgeFade: number;
    borderWidth: number;
    borderAlpha: number;
    fillSatMult: number;
    fillLightMult: number;
    fillFollowsGeom: boolean;
    borderSatMult: number;
    borderLightMult: number;
    chaikinPasses: number;
    combatTicks: number;
    combatWBoost: number;
    combatABoost: number;
    forceRatioScale: number;
    combatProximityPx: number;
    msrPx: number;
    coverage: number;
}

export interface MetaballWorkerRequest {
    requestId: number;
    fingerprint: string;
    config: MetaballWorkerConfig;
    playerColors: [number, number, number][];
    clusterShips: number[];
    ownedStars: MetaballWorkerStar[];
    staticSamples: MetaballWorkerSample[];
    dynamicSamples: MetaballWorkerSample[];
}

export interface MetaballWorkerStroke {
    color: number;
    alpha: number;
    width: number;
    paths: number[][];
}

export interface MetaballWorkerResponse {
    requestId: number;
    fingerprint: string;
    cols: number;
    rows: number;
    cellSize: number;
    gridOriginX: number;
    gridOriginY: number;
    pixels: ArrayBuffer;
    strokes: MetaballWorkerStroke[];
    solveMs: number;
    borderMs: number;
    cellCount: number;
    numPlayers: number;
    staticSampleCount: number;
    dynamicSampleCount: number;
}
