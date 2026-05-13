import { describe, expect, it } from 'vitest';

import type { TerritoryConquestEvent } from '../contracts/OwnershipContracts';
import {
    buildConquestCaptureHash,
    buildConquestEventGroupFileLabel,
    buildConquestFilePrefix,
    formatConquestEventGroupLabel,
} from './conquestNaming';

describe('conquestNaming', () => {
    const conquestEvents: TerritoryConquestEvent[] = [
        {
            starId: 'star-14',
            previousOwner: 'human-player',
            newOwner: 'ai-5',
            attackerStarId: 'star-13',
            atMs: 11550.2,
        },
        {
            starId: 'star-21',
            previousOwner: 'ai-4',
            newOwner: 'ai-3',
            attackerStarId: 'star-16',
            atMs: 11550.2,
        },
    ];

    it('keeps human-readable conquest labels descriptive', () => {
        expect(formatConquestEventGroupLabel(conquestEvents)).toBe(
            'star-13(ai-5)_conquers_star-14(human-player) + star-16(ai-3)_conquers_star-21(ai-4)',
        );
    });

    it('builds compact file-safe conquest labels for export packages', () => {
        expect(buildConquestEventGroupFileLabel(conquestEvents)).toBe(
            'cq_AI5-S13_to_HP-S14_AI3-S16_to_AI4-S21',
        );
        expect(
            buildConquestCaptureHash(
                '2026-05-04T23:07:58.665Z',
                'transition:alpha',
                conquestEvents,
            ),
        ).toMatch(/^h[a-z0-9]{7}$/);
        expect(
            buildConquestFilePrefix(
                '2026-05-04T23:07:58.665Z',
                conquestEvents,
                'transition:alpha',
            ),
        ).toMatch(/^\d{2}-07-58---665_cq_AI5-S13_to_HP-S14_AI3-S16_to_AI4-S21_h[a-z0-9]{7}$/);
    });
});
