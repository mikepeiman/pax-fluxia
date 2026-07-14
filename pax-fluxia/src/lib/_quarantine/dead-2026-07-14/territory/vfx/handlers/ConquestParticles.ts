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

        if (!isConquestEventPayload(event.payload)) {
            return [];
        }

        const payload = event.payload;

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

function isConquestEventPayload(value: unknown): value is ConquestEventPayload {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    return 'conquest' in value;
}
