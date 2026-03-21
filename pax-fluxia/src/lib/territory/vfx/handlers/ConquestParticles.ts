import type { TerritoryConquestEvent } from '../../contracts/OwnershipContracts';
import type {
    TerritoryVFXCommand,
    TerritoryVFXEvent,
    TerritoryVFXEventType,
    VFXHandler,
} from '../VFXContracts';

interface ConquestEventPayload {
    conquest: TerritoryConquestEvent;
}

const HANDLED_EVENTS: readonly TerritoryVFXEventType[] = [
    'territory_conquest_start',
    'virtual_star_spawn',
];

export class ConquestParticles implements VFXHandler {
    readonly id = 'conquest_particles';
    readonly handles = HANDLED_EVENTS;

    tick(event: TerritoryVFXEvent, dtMs: number): readonly TerritoryVFXCommand[] {
        if (
            event.type !== 'territory_conquest_start' &&
            event.type !== 'virtual_star_spawn'
        ) {
            return [];
        }

        const payload = event.payload as ConquestEventPayload;
        if (!payload.conquest) {
            return [];
        }

        return [
            {
                kind: 'spawn_particles',
                payload: {
                    eventType: event.type,
                    starId: payload.conquest.starId,
                    fromOwnerId: payload.conquest.previousOwner,
                    toOwnerId: payload.conquest.newOwner,
                    atMs: event.atMs,
                    dtMs,
                },
            },
        ];
    }
}
