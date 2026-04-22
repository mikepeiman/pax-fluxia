import { describe, expect, it } from 'vitest';
import { GameEngine } from '@pax/common';

describe('portal star synchronized conquest', () => {
    it('updates every star in the captured portal group', () => {
        const state = {
            stars: new Map([
                ['star-a', {
                    id: 'star-a',
                    ownerId: 'player-a',
                    portalGroup: '2',
                    targetId: 'star-b',
                    queuedOrderTargetId: 'star-c',
                }],
                ['star-b', {
                    id: 'star-b',
                    ownerId: 'player-b',
                    portalGroup: '2',
                    targetId: 'star-z',
                    queuedOrderTargetId: 'star-y',
                }],
                ['star-c', {
                    id: 'star-c',
                    ownerId: 'player-c',
                    portalGroup: '3',
                    targetId: 'star-z',
                    queuedOrderTargetId: 'star-y',
                }],
            ]),
        };

        (GameEngine as unknown as {
            syncPortalGroupOwnership: (
                value: typeof state,
                capturedStarId: string,
                portalGroup: string,
                newOwnerId: string,
            ) => void;
        }).syncPortalGroupOwnership(state, 'star-a', '2', 'player-d');

        expect(state.stars.get('star-a')?.ownerId).toBe('player-a');
        expect(state.stars.get('star-b')).toMatchObject({
            ownerId: 'player-d',
            targetId: '',
            queuedOrderTargetId: '',
        });
        expect(state.stars.get('star-c')).toMatchObject({
            ownerId: 'player-c',
            targetId: 'star-z',
            queuedOrderTargetId: 'star-y',
        });
    });
});
