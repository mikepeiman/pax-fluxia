// ============================================================================
// FXClock — Pausable Game Time for VFX
// ============================================================================
// Provides a pausable, speed-scaled time source for all FX animations.
// Using performance.now() directly causes animations to "teleport" when
// the game is paused and resumed. This clock accumulates only active time.
// ============================================================================

/**
 * FXClock manages a pausable game time counter.
 * - Stops accumulating when paused
 * - Scales with game speed
 * - Provides frame delta (dt) for per-frame updates
 */
export class FXClock {
    private _gameTime = 0;
    private _lastWall = 0;
    private _dt = 0;
    private _paused = false;
    private _speedMult = 1;

    /**
     * Call once per frame from render loop.
     * Must be called with the current performance.now() value.
     */
    tick(wallNow: number): void {
        if (this._paused || this._lastWall === 0) {
            this._lastWall = wallNow;
            this._dt = 0;
            return;
        }

        const rawDt = wallNow - this._lastWall;
        // Clamp dt to avoid huge jumps (e.g., tab was backgrounded)
        const clampedDt = Math.min(rawDt, 200);
        this._dt = clampedDt * this._speedMult;
        this._gameTime += this._dt;
        this._lastWall = wallNow;
    }

    /** Pause — freezes game time. dt becomes 0. */
    pause(): void {
        this._paused = true;
        this._dt = 0;
    }

    /** Resume — resets wall-clock anchor so no jump occurs. */
    resume(): void {
        this._paused = false;
        this._lastWall = 0; // Will be reset on next tick()
    }

    /** Set speed multiplier (1 = normal, 2 = double, etc.) */
    setSpeed(mult: number): void {
        this._speedMult = mult;
    }

    /** Game time in ms — stops when paused, scales with speed */
    get now(): number {
        return this._gameTime;
    }

    /** Frame delta in ms — 0 when paused */
    get dt(): number {
        return this._dt;
    }

    /** Whether the clock is currently paused */
    get isPaused(): boolean {
        return this._paused;
    }

    /** Current speed multiplier */
    get speed(): number {
        return this._speedMult;
    }

    /** Reset clock to zero (for new game) */
    reset(): void {
        this._gameTime = 0;
        this._lastWall = 0;
        this._dt = 0;
        this._paused = false;
    }
}
