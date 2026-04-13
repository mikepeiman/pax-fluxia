import { describe, expect, it } from 'vitest';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import { buildMetaballScene } from './buildMetaballScene';

function makeStar(params: {
    id: string;
    x: number;
    y: number;
    ownerId: string;
}): StarState {
    return {
        id: params.id,
        x: params.x,
        y: params.y,
        ownerId: params.ownerId,
        activeShips: 12,
        damagedShips: 0,
        radius: 20,
        starType: 'blue',
    } as StarState;
}

function makeInput(params: {
    stars: StarState[];
    lanes?: StarConnection[];
    tunables?: Record<string, unknown>;
    activeTransition?: RenderFamilyActiveTransition | null;
}): RenderFamilyInput {
    return {
        ownership: null,
        nowMs: 1000,
        stars: params.stars,
        lanes: params.lanes ?? [],
        world: { width: 200, height: 200 },
        tunables: new Map<string, RenderFamilyTunableValue>(
            Object.entries(params.tunables ?? {}) as Array<
                [string, RenderFamilyTunableValue]
            >,
        ),
        activeTransition: params.activeTransition ?? null,
    };
}

const colorUtils = {
    getPlayerColor(ownerId: string): number {
        switch (ownerId) {
            case 'blue':
                return 0x3366ff;
            case 'red':
                return 0xff5533;
            case 'green':
                return 0x33bb55;
            default:
                return 0xffffff;
        }
    },
} as unknown as ColorUtils;

function makeConquestTransition(): RenderFamilyActiveTransition {
    const conquestEvent = {
        tick: 10,
        starId: 'target',
        attackerStarId: 'attacker',
        attackerStarIds: ['attacker'],
        attackerShipTransfers: [5],
        previousOwner: 'red',
        newOwner: 'blue',
        shipsCaptured: 5,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 5,
        conquestType: 'complete' as const,
    };

    return {
        conquestEvents: [conquestEvent],
        events: [
            {
                event: conquestEvent,
                startedAtMs: 500,
                durationMs: 1000,
                rawProgress: 0.5,
                progress: 0.5,
            },
        ],
        startedAtMs: 500,
        durationMs: 1000,
        rawProgress: 0.5,
        progress: 0.5,
    };
}

describe('buildMetaballScene', () => {
    it('includes paired DX samples without requiring a lane between same-owner stars', () => {
        const stars = [
            makeStar({ id: 'a', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'b', x: 100, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'enemy-top', x: 50, y: 80, ownerId: 'red' }),
            makeStar({ id: 'enemy-bottom', x: 50, y: -70, ownerId: 'green' }),
        ];

        const scene = buildMetaballScene(
            makeInput({
                stars,
                tunables: {
                    MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                    MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
                    MODIFIED_VORONOI_DISCONNECT_DISTANCE: 200,
                    TERRITORY_DX_WEIGHT: 0.5,
                },
            }),
            colorUtils,
        );

        const disconnectIds = scene.samples
            .map((sample) => sample.id ?? '')
            .filter((id) => id.startsWith('disconnect:'));
        expect(disconnectIds).toHaveLength(2);
    });

    it('builds weight-only conquest transition samples without lane-tube samples', () => {
        const stars = [
            makeStar({ id: 'attacker', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 100, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'old-anchor', x: 100, y: 80, ownerId: 'red' }),
        ];

        const scene = buildMetaballScene(
            makeInput({
                stars,
                lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 100 }],
                activeTransition: makeConquestTransition(),
                tunables: {
                    MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                    MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
                },
            }),
            colorUtils,
        );

        const ids = scene.samples.map((sample) => sample.id ?? '');
        const attackerBase = scene.samples.find((sample) => sample.id === 'star:attacker');
        const targetBase = scene.samples.find((sample) => sample.id === 'star:target');
        expect(ids.some((id) => id.includes(':new:'))).toBe(true);
        expect(ids.some((id) => id.includes(':old:'))).toBe(true);
        expect(ids.some((id) => id.includes(':tube:'))).toBe(false);
        expect(attackerBase?.strength).toBeGreaterThan(0);
        expect(targetBase?.strength ?? 0).toBeLessThan(
            (attackerBase?.strength ?? 0) * 0.2,
        );
    });
});
