import type { TerritoryFrameInput } from '../../contracts/TerritoryFrameInput';

export class PowerVoronoiLegacyAdapter {
    readonly id = 'legacy_power_voronoi' as const;

    renderLegacy(input: TerritoryFrameInput): void {
        // Scaffolding stage: bridge to legacy PowerVoronoiRenderer will be added later.
        void input;
    }
}
