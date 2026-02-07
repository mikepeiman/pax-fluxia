// ============================================================================
// Animation Store - Client-side visual-only animation events
// ============================================================================
// Animations are purely visual and do NOT affect game state.
// They are emitted by diffing game state between frames and rendered
// as transient ship flight effects on the canvas.

import { writable, derived, get } from 'svelte/store';

// ============================================================================
// Types
// ============================================================================

export type AnimationType = 'transfer' | 'scatter' | 'retreat' | 'conquest-burst';

export interface AnimationEvent {
    id: string;
    type: AnimationType;
    sourceId: string;
    targetId: string;
    ownerId: string;
    shipCount: number;
    startTime: number;      // performance.now()
    duration: number;       // ms
    // Positions (game world coordinates)
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    // Optional: color override (for defender scatter using defender's color)
    color?: number;
}

// ============================================================================
// Store
// ============================================================================

const _animations = writable<AnimationEvent[]>([]);

let nextAnimId = 0;

export const animationStore = {
    subscribe: _animations.subscribe,

    /**
     * Add a new animation event
     */
    add(event: Omit<AnimationEvent, 'id' | 'startTime'>) {
        const fullEvent: AnimationEvent = {
            ...event,
            id: `anim-${nextAnimId++}`,
            startTime: performance.now(),
        };
        _animations.update(anims => [...anims, fullEvent]);
    },

    /**
     * Add a batch of animation events (e.g., scatter to multiple targets)
     */
    addBatch(events: Omit<AnimationEvent, 'id' | 'startTime'>[]) {
        const now = performance.now();
        const fullEvents = events.map(e => ({
            ...e,
            id: `anim-${nextAnimId++}`,
            startTime: now,
        }));
        _animations.update(anims => [...anims, ...fullEvents]);
    },

    /**
     * Remove expired animations. Call each frame.
     * Returns the currently active animations for rendering.
     */
    tick(now: number): AnimationEvent[] {
        let current: AnimationEvent[] = [];
        _animations.update(anims => {
            current = anims.filter(a => now - a.startTime < a.duration);
            return current;
        });
        return current;
    },

    /**
     * Get progress (0→1) for an animation event
     */
    getProgress(event: AnimationEvent, now: number): number {
        return Math.min(1, (now - event.startTime) / event.duration);
    },

    /**
     * Clear all animations
     */
    clear() {
        _animations.set([]);
    }
};

// ============================================================================
// Animation Config
// ============================================================================

export const ANIM_CONFIG = {
    /** Duration of ship transfer flight (ms) */
    TRANSFER_DURATION: 400,
    /** Duration of scatter burst (ms) */
    SCATTER_DURATION: 600,
    /** Duration of retreat flight (ms) */
    RETREAT_DURATION: 500,
    /** Duration of conquest burst effect (ms) */
    CONQUEST_BURST_DURATION: 300,
    /** Max visual ship dots per animation */
    MAX_VISUAL_SHIPS: 8,
    /** Dot spread perpendicular to flight path */
    FLIGHT_SPREAD: 8,
    /** Jitter amplitude for organic movement */
    JITTER_AMP: 3,
};
