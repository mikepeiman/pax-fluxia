export class TerritoryTransitionClock {
    private _now = 0;
    private _dt = 0;
    private _lastWallMs = 0;

    tick(wallNowMs: number, paused: boolean): void {
        if (!Number.isFinite(wallNowMs)) {
            this._dt = 0;
            return;
        }
        if (this._lastWallMs === 0) {
            this._lastWallMs = wallNowMs;
            this._dt = 0;
            return;
        }

        const rawDt = Math.max(0, wallNowMs - this._lastWallMs);
        this._lastWallMs = wallNowMs;

        if (paused) {
            this._dt = 0;
            return;
        }

        const clampedDt = Math.min(rawDt, 200);
        this._dt = clampedDt;
        this._now += clampedDt;
    }

    reset(): void {
        this._now = 0;
        this._dt = 0;
        this._lastWallMs = 0;
    }

    get now(): number {
        return this._now;
    }

    get dt(): number {
        return this._dt;
    }
}

export const territoryTransitionClock = new TerritoryTransitionClock();
