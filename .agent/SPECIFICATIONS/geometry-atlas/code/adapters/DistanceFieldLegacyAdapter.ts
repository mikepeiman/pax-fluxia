import type { TerritoryFrameInput } from '../../contracts/TerritoryFrameInput';

export class DistanceFieldLegacyAdapter {
    readonly id = 'legacy_distance_field' as const;

    renderLegacy(input: TerritoryFrameInput): void {
        // Scaffolding stage: bridge to DistanceField renderer path will be added later.
        void input;
    }
}
