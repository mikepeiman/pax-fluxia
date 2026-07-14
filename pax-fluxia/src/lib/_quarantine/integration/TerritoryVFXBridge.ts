import type { TerritoryConquestEvent } from '../contracts/OwnershipContracts';
import type { TransitionSnapshot } from '../contracts/TransitionContracts';
import { VFXBus } from '../vfx/VFXBus';
import type { TerritoryVFXCommand, TerritoryVFXEvent } from '../vfx/VFXContracts';

export class TerritoryVFXBridge {
    constructor(private readonly bus: VFXBus = new VFXBus()) {}

    emitConquestEvents(
        conquests: readonly TerritoryConquestEvent[],
        nowMs: number,
    ): readonly TerritoryVFXCommand[] {
        const commands: TerritoryVFXCommand[] = [];

        for (const conquest of conquests) {
            const conquestStartEvent: TerritoryVFXEvent<{
                conquest: TerritoryConquestEvent;
            }> = {
                type: 'territory_conquest_start',
                atMs: nowMs,
                payload: { conquest },
            };

            const virtualStarSpawnEvent: TerritoryVFXEvent<{
                conquest: TerritoryConquestEvent;
            }> = {
                type: 'virtual_star_spawn',
                atMs: nowMs,
                payload: { conquest },
            };

            commands.push(...this.bus.emit(conquestStartEvent));
            commands.push(...this.bus.emit(virtualStarSpawnEvent));
        }

        return commands;
    }

    emitTransitionLifecycle(
        previous: TransitionSnapshot | null,
        next: TransitionSnapshot,
        nowMs: number,
    ): readonly TerritoryVFXCommand[] {
        const hadEnvelope = Boolean(previous?.envelope);
        const hasEnvelope = Boolean(next.envelope);

        if (!hadEnvelope || hasEnvelope) {
            return [];
        }

        return this.bus.emit(
            {
                type: 'territory_retreat',
                atMs: nowMs,
                payload: {
                    transitionId: previous?.envelope?.transitionId ?? 'unknown',
                    geometryVersion: next.geometryVersion,
                },
            },
            0,
        );
    }

    registerHandler(handler: Parameters<VFXBus['register']>[0]): void {
        this.bus.register(handler);
    }

    clearHandlers(): void {
        this.bus.clear();
    }
}
