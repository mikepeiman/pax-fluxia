import type { RenderFamily } from './RenderFamilyTypes';

const families = new Map<string, RenderFamily>();

export function registerRenderFamily(family: RenderFamily): void {
    families.set(family.id, family);
}

export function getRenderFamily(id: string): RenderFamily | undefined {
    return families.get(id);
}

export function disposeAllRenderFamilies(): void {
    for (const f of families.values()) {
        f.dispose();
    }
    families.clear();
}
