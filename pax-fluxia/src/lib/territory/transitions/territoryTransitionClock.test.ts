import { describe, expect, it } from 'vitest';
import { TerritoryTransitionClock } from './territoryTransitionClock';

describe('TerritoryTransitionClock', () => {
    it('tracks wall time without speed scaling', () => {
        const clock = new TerritoryTransitionClock();

        clock.tick(1000, false);
        clock.tick(1100, false);
        clock.tick(1250, false);

        expect(clock.now).toBe(250);
        expect(clock.dt).toBe(150);
    });

    it('stops while paused and resumes without a catch-up jump', () => {
        const clock = new TerritoryTransitionClock();

        clock.tick(1000, false);
        clock.tick(1100, false);
        clock.tick(1250, true);
        clock.tick(1600, true);
        clock.tick(1700, false);

        expect(clock.now).toBe(200);
        expect(clock.dt).toBe(100);
    });
});
