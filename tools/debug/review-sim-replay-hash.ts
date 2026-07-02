import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

type JsonValue =
    | null
    | string
    | number
    | boolean
    | JsonValue[]
    | { [key: string]: JsonValue };

type StarLike = {
    id: string;
    x: number;
    y: number;
    ownerId?: string;
    starType?: string;
    activeShips?: number;
    damagedShips?: number;
    targetId?: string;
};

type MapDefinition = {
    metadata?: { name?: string };
    factions?: Array<{ id: string }>;
    stars: StarLike[];
    connections: Array<{
        sourceId: string;
        targetId: string;
        distance?: number;
    }>;
};

const ROOT = path.resolve(
    process.env.PAX_REVIEW_TARGET_ROOT?.trim() ||
        path.resolve(import.meta.dir, "..", ".."),
);
const MAP_NAME =
    process.env.PAX_REVIEW_MAP_NAME?.trim() || "First Symmetry-6_April 17b";
const TICKS = positiveInteger(process.env.PAX_REVIEW_SIM_TICKS, 36);
const OUTPUT_DIR = path.join(
    ROOT,
    ".agent-harness",
    "metrics",
    "review-sim-replay",
);

function positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value ?? "");
    return Number.isFinite(parsed) && parsed > 0
        ? Math.round(parsed)
        : fallback;
}

function normalizeName(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function hashJson(value: unknown): string {
    return createHash("sha256")
        .update(JSON.stringify(value))
        .digest("hex");
}

function gitHead(): string {
    const result = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
        cwd: ROOT,
        stdout: "pipe",
        stderr: "pipe",
    });
    return Buffer.from(result.stdout).toString("utf8").trim();
}

function loadMapDefinition(): { sourcePath: string; definition: MapDefinition } {
    const savedMapsDir = path.join(ROOT, "common", "resources", "saved-maps");
    const targetName = normalizeName(MAP_NAME);
    const candidates = readdirSync(savedMapsDir)
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => path.join(savedMapsDir, entry));

    for (const candidate of candidates) {
        const definition = JSON.parse(
            readFileSync(candidate, "utf8"),
        ) as MapDefinition;
        const metadataName = definition.metadata?.name ?? "";
        const fileName = path.basename(candidate, ".json");
        if (
            normalizeName(metadataName) === targetName ||
            normalizeName(fileName) === targetName
        ) {
            return { sourcePath: candidate, definition };
        }
    }

    throw new Error(`Could not find saved map JSON for: ${MAP_NAME}`);
}

function sortedStars(state: any): JsonValue[] {
    return [...state.stars.values()]
        .map((star: any) => ({
            id: star.id,
            ownerId: star.ownerId,
            activeShips: roundNumber(star.activeShips),
            damagedShips: roundNumber(star.damagedShips),
            targetId: star.targetId || "",
            queuedOrderTargetId: star.queuedOrderTargetId || "",
            productionOverflow: roundNumber(star.productionOverflow),
            repairOverflow: roundNumber(star.repairOverflow),
            lastCombatTick: star.lastCombatTick,
            lastAttackTick: star.lastAttackTick,
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function sortedPlayers(state: any): JsonValue[] {
    return [...state.players.values()]
        .map((player: any) => ({
            sessionId: player.sessionId,
            isEliminated: player.isEliminated,
            starCount: player.starCount,
            activeShips: roundNumber(player.activeShips),
            damagedShips: roundNumber(player.damagedShips),
            totalShips: roundNumber(player.totalShips),
            production: roundNumber(player.production),
        }))
        .sort((a, b) => String(a.sessionId).localeCompare(String(b.sessionId)));
}

function roundNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Math.round(numeric * 1_000_000) / 1_000_000;
}

function snapshotState(state: any, events: unknown): JsonValue {
    return {
        tick: state.tick,
        phase: state.phase,
        isPaused: state.isPaused,
        winnerId: state.winnerId || "",
        stars: sortedStars(state),
        players: sortedPlayers(state),
        events: normalizeEvents(events),
    };
}

function normalizeEvents(events: any): JsonValue {
    return {
        transfers: [...(events?.transfers ?? [])].map((event) => ({ ...event })),
        combats: [...(events?.combats ?? [])].map((event) => ({ ...event })),
        conquests: [...(events?.conquests ?? [])].map((event) => ({ ...event })),
    };
}

function addConnection(state: any, common: any, sourceId: string, targetId: string) {
    const source = state.stars.get(sourceId);
    const target = state.stars.get(targetId);
    if (!source || !target) return;
    const distance = Math.hypot(source.x - target.x, source.y - target.y);
    const connection = new common.ConnectionSchema();
    connection.sourceId = sourceId;
    connection.targetId = targetId;
    connection.distance = distance;
    connection.lanePathKind = "";
    connection.laneConstraintStatus = "";
    state.connections.push(connection);
}

function chooseOrder(state: any): {
    sourceId: string;
    targetId: string;
    playerId: string;
} {
    const stars = [...state.stars.values()].sort((a: any, b: any) =>
        String(a.id).localeCompare(String(b.id)),
    );
    const connections = [...state.connections.values()];
    for (const source of stars) {
        if (!source.ownerId || source.ownerId === "neutral") continue;
        const candidateTargets = connections
            .filter((connection: any) => connection.sourceId === source.id)
            .map((connection: any) => state.stars.get(connection.targetId))
            .filter(
                (target: any) =>
                    target &&
                    target.ownerId !== source.ownerId &&
                    target.ownerId === "neutral",
            )
            .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));
        const target = candidateTargets[0];
        if (target) {
            return {
                sourceId: source.id,
                targetId: target.id,
                playerId: source.ownerId,
            };
        }
    }
    throw new Error("Could not find deterministic conquest order.");
}

async function main() {
    const common = await import(
        pathToFileURL(path.join(ROOT, "common", "src", "index.ts")).href
    );
    const { sourcePath, definition } = loadMapDefinition();
    const playerIds = [
        "human-player",
        "ai-1",
        "ai-2",
        "ai-3",
        "ai-4",
        "ai-5",
    ];
    const runtimeMap = common.resolveRuntimeMap(definition, {
        playerIds,
        startingShips: 40,
        scaleLegacyIfSmall: true,
        targetWidth: 1600,
        targetHeight: 900,
    });

    const state = new common.GameRoomState();
    state.phase = "playing";
    state.isPaused = false;
    state.speed = 1;
    state.tick = 0;
    state.tickProgress = 0;
    state.maxPlayers = playerIds.length;
    state.playerCount = playerIds.length;
    state.hostSessionId = "human-player";
    state.winnerId = "";

    const colors = ["#4488ff", "#ff4466", "#44ff88", "#ffcc44", "#aa66ff", "#ff8844"];
    for (const [index, playerId] of playerIds.entries()) {
        const player = new common.PlayerSchema();
        player.id = playerId;
        player.sessionId = playerId;
        player.name = index === 0 ? "You" : `AI ${index}`;
        player.color = colors[index] ?? "#888888";
        player.isAI = index > 0;
        player.isEliminated = false;
        player.starCount = 0;
        player.totalShips = 0;
        player.activeShips = 0;
        player.damagedShips = 0;
        player.production = 0;
        player.isConnected = true;
        state.players.set(playerId, player);
    }

    for (const sourceStar of runtimeMap.stars) {
        const starType = sourceStar.starType || "grey";
        const stats = common.STAR_TYPE_STATS[starType] ?? common.STAR_TYPE_STATS.grey;
        const star = new common.StarSchema();
        star.id = sourceStar.id;
        star.x = sourceStar.x;
        star.y = sourceStar.y;
        star.ownerId = sourceStar.ownerId ?? "neutral";
        star.starType = starType;
        star.activeShips = sourceStar.activeShips ?? 40;
        star.damagedShips = sourceStar.damagedShips ?? 0;
        star.targetId = sourceStar.targetId ?? "";
        star.queuedOrderTargetId = "";
        star.productionRate = 1;
        star.repairRate = stats.repairRate;
        star.transferRate = stats.transferRate;
        star.activationRate = stats.activationRate;
        star.defensivePosture = stats.defensivePosture;
        star.defenseStrength = stats.defenseStrength;
        star.radius = 25;
        star.icon = "star";
        star.productionOverflow = 0;
        star.repairOverflow = 0;
        star.lastCombatTick = -1;
        star.lastAttackTick = -1;
        state.stars.set(star.id, star);
    }

    for (const connection of runtimeMap.connections) {
        addConnection(state, common, connection.sourceId, connection.targetId);
        addConnection(state, common, connection.targetId, connection.sourceId);
    }

    common.GameEngine.updatePlayerStats(state);
    const order = chooseOrder(state);
    const source = state.stars.get(order.sourceId);
    const target = state.stars.get(order.targetId);
    source.activeShips = Math.max(source.activeShips, 240);
    target.activeShips = 0;
    target.damagedShips = 0;
    common.GameEngine.updatePlayerStats(state);

    const tickReports: JsonValue[] = [];
    common.GameEngine.processInput(state, {
        type: "ISSUE_ORDER",
        playerId: order.playerId,
        sourceId: order.sourceId,
        targetId: order.targetId,
    });

    for (let index = 0; index < TICKS; index += 1) {
        const events = common.GameEngine.tick(state);
        const snapshot = snapshotState(state, events);
        tickReports.push({
            tick: state.tick,
            hash: hashJson(snapshot),
            events: normalizeEvents(events),
        });
    }

    const report = {
        generatedAt: new Date().toISOString(),
        targetRoot: ROOT,
        gitHead: gitHead(),
        mapName: definition.metadata?.name ?? MAP_NAME,
        mapSourcePath: sourcePath,
        ticks: TICKS,
        order,
        finalHash: hashJson(tickReports),
        tickReports,
    };

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const latestPath = path.join(OUTPUT_DIR, "review-sim-replay-hash-latest.json");
    const timestampPath = path.join(
        OUTPUT_DIR,
        `review-sim-replay-hash-${report.generatedAt.replace(/[:.]/g, "-")}.json`,
    );
    const serialized = JSON.stringify(report, null, 2);
    writeFileSync(latestPath, serialized, "utf8");
    writeFileSync(timestampPath, serialized, "utf8");
    console.log(
        JSON.stringify(
            {
                generatedAt: report.generatedAt,
                targetRoot: ROOT,
                gitHead: report.gitHead,
                finalHash: report.finalHash,
                latestPath,
                timestampPath,
            },
            null,
            2,
        ),
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
