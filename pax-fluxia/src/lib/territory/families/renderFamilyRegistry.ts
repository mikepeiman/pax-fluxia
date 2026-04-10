import { writable } from 'svelte/store';
import type { RenderFamily } from './RenderFamilyTypes';

const families = new Map<string, RenderFamily>();

/** Bumps when a family is registered so settings UI can refresh selectable modes. */
export const familyRegistryEpoch = writable(0);

export function registerRenderFamily(family: RenderFamily): void {
    families.set(family.id, family);
    familyRegistryEpoch.update((n) => n + 1);
}

export function getRenderFamily(id: string): RenderFamily | undefined {
    return families.get(id);
}

/** Mode ids with a registered `RenderFamily` instance (for UI + gate). */
export function getRegisteredFamilyAdapterModeIds(): ReadonlySet<string> {
    return new Set(families.keys());
}

export function disposeAllRenderFamilies(): void {
    for (const f of families.values()) {
        f.dispose();
    }
    families.clear();
    familyRegistryEpoch.update((n) => n + 1);
}
