import { writable } from 'svelte/store';

export interface PerimeterFieldDebugPlaybackState {
    liveFrameCount: number;
    replayFrameCounts: readonly [number, number, number];
}

const INITIAL_STATE: PerimeterFieldDebugPlaybackState = {
    liveFrameCount: 0,
    replayFrameCounts: [0, 0, 0],
};

export const perimeterFieldDebugPlaybackStore =
    writable<PerimeterFieldDebugPlaybackState>(INITIAL_STATE);

export function setPerimeterFieldDebugPlaybackState(
    state: PerimeterFieldDebugPlaybackState,
): void {
    perimeterFieldDebugPlaybackStore.set(state);
}

export function resetPerimeterFieldDebugPlaybackState(): void {
    perimeterFieldDebugPlaybackStore.set(INITIAL_STATE);
}
