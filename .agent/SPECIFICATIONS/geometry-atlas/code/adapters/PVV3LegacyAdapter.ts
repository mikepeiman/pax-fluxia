import type { TerritoryFrameInput } from '../../contracts/TerritoryFrameInput';

export class PVV3LegacyAdapter {
    readonly id = 'legacy_pvv3' as const;

    renderLegacy(input: TerritoryFrameInput): void {
        // Scaffolding stage: bridge to PVV3 renderer path will be added later.
        void input;
    }
}
