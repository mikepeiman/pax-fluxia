import type {
    TerritoryVFXCommand,
    TerritoryVFXEvent,
    TerritoryVFXEventType,
    VFXHandler,
} from './VFXContracts';

type VFXHandlerMap = Map<TerritoryVFXEventType, Set<VFXHandler>>;

export class VFXBus {
    private readonly handlers: VFXHandlerMap = new Map();

    register(handler: VFXHandler): void {
        for (const eventType of handler.handles) {
            if (!this.handlers.has(eventType)) {
                this.handlers.set(eventType, new Set<VFXHandler>());
            }
            this.handlers.get(eventType)?.add(handler);
        }
    }

    unregister(handlerId: string): void {
        for (const handlersForType of this.handlers.values()) {
            for (const handler of handlersForType) {
                if (handler.id === handlerId) {
                    handlersForType.delete(handler);
                }
            }
        }
    }

    clear(): void {
        this.handlers.clear();
    }

    emit(event: TerritoryVFXEvent, dtMs = 0): readonly TerritoryVFXCommand[] {
        const handlersForType = this.handlers.get(event.type);
        if (!handlersForType || handlersForType.size === 0) {
            return [];
        }

        const commands: TerritoryVFXCommand[] = [];
        for (const handler of handlersForType) {
            commands.push(...handler.tick(event, dtMs));
        }

        return commands;
    }
}
