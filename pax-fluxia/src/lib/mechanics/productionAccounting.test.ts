import { describe, expect, it } from 'vitest';
import {
    applyProduction,
    ArraySchema,
    DEFAULT_ENGINE_CONFIG,
    GameEngine,
    GameRoomState,
    PlayerSchema,
    StarSchema,
} from '@pax/common';

function createPlayer(id: string): InstanceType<typeof PlayerSchema> {
    const player = new PlayerSchema();
    player.id = id;
    player.sessionId = id;
    player.name = id;
    player.color = '#fff';
    player.isAI = false;
    player.isEliminated = false;
    player.starCount = 0;
    player.totalShips = 0;
    player.activeShips = 0;
    player.damagedShips = 0;
    player.production = 0;
    player.isConnected = true;
    return player;
}

function createStar(
    id: string,
    ownerId: string,
    starType: 'grey' | 'yellow',
): InstanceType<typeof StarSchema> {
    const star = new StarSchema();
    star.id = id;
    star.x = 0;
    star.y = 0;
    star.radius = 10;
    star.ownerId = ownerId;
    star.starType = starType;
    star.activeShips = 0;
    star.damagedShips = 0;
    star.productionRate = 1;
    star.repairRate = 0;
    star.transferRate = 0;
    star.activationRate = 0;
    star.defensivePosture = 0;
    star.defenseStrength = 1;
    star.productionOverflow = 0;
    star.repairOverflow = 0;
    star.lastCombatTick = -1;
    star.lastAttackTick = -1;
    star.targetId = '';
    star.queuedOrderTargetId = '';
    star.icon = '';
    return star;
}

describe('production accounting', () => {
    it('produces 6 grey ships and 12 yellow ships over 10 ticks at BASE_PRODUCTION 0.6', () => {
        const cfg = { ...DEFAULT_ENGINE_CONFIG, BASE_PRODUCTION: 0.6 };
        const grey = createStar('grey-1', 'p1', 'grey');
        const yellow = createStar('yellow-1', 'p1', 'yellow');

        for (let tick = 0; tick < 10; tick++) {
            applyProduction(grey as any, cfg);
            applyProduction(yellow as any, cfg);
        }

        expect(grey.activeShips).toBe(6);
        expect(yellow.activeShips).toBe(12);
    });

    it('reports per-tick player production using BASE_PRODUCTION and star-type multipliers', () => {
        const cfg = { ...DEFAULT_ENGINE_CONFIG, BASE_PRODUCTION: 0.6 };
        const state = new GameRoomState();
        state.phase = 'playing';
        state.tick = 0;
        state.tickProgress = 0;
        state.isPaused = false;
        state.speed = 1;
        state.maxPlayers = 1;
        state.playerCount = 1;
        state.hostSessionId = 'p1';
        state.winnerId = '';
        state.connections = new ArraySchema();

        const player = createPlayer('p1');
        state.players.set('p1', player);
        state.stars.set('grey-1', createStar('grey-1', 'p1', 'grey'));
        state.stars.set('yellow-1', createStar('yellow-1', 'p1', 'yellow'));

        GameEngine.updatePlayerStats(state, cfg);

        expect(state.players.get('p1')?.production).toBeCloseTo(1.8, 6);
        expect(state.players.get('p1')?.starCount).toBe(2);
    });
});
