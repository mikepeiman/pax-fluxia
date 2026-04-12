import { get, writable } from "svelte/store";

export type RulerSnapKind = "star" | "lane" | "free";

export interface RulerPoint {
    x: number;
    y: number;
    snapKind: RulerSnapKind;
    starId?: string;
    laneKey?: string;
    laneLabel?: string;
}

export interface RulerColor {
    h: number;
    s: number;
    l: number;
    a: number;
}

export interface RulerState {
    enabled: boolean;
    laneHitboxPx: number;
    start: RulerPoint | null;
    end: RulerPoint | null;
    color: RulerColor;
}

const initialState: RulerState = {
    enabled: false,
    laneHitboxPx: 18,
    start: null,
    end: null,
    color: {
        h: 190,
        s: 90,
        l: 68,
        a: 0.95,
    },
};

const store = writable<RulerState>(initialState);

function setEnabled(enabled: boolean): void {
    store.update((state) => ({ ...state, enabled }));
}

function toggle(): void {
    store.update((state) => ({ ...state, enabled: !state.enabled }));
}

function clear(): void {
    store.update((state) => ({
        ...state,
        start: null,
        end: null,
    }));
}

function placePoint(point: RulerPoint): void {
    store.update((state) => {
        if (!state.start || state.end) {
            return {
                ...state,
                start: point,
                end: null,
            };
        }
        return {
            ...state,
            end: point,
        };
    });
}

function setLaneHitboxPx(value: number): void {
    const next = Math.max(4, Math.min(80, Math.round(value)));
    store.update((state) => ({
        ...state,
        laneHitboxPx: next,
    }));
}

function setColor<K extends keyof RulerColor>(key: K, value: number): void {
    store.update((state) => ({
        ...state,
        color: {
            ...state.color,
            [key]:
                key === "a"
                    ? Math.max(0.05, Math.min(1, value))
                    : key === "h"
                      ? ((value % 360) + 360) % 360
                      : Math.max(0, Math.min(100, value)),
        },
    }));
}

function getState(): RulerState {
    return get(store);
}

export function getRulerMeasurement(state: RulerState = getState()) {
    if (!state.start || !state.end) return null;
    const dx = state.end.x - state.start.x;
    const dy = state.end.y - state.start.y;
    return {
        dx,
        dy,
        distance: Math.hypot(dx, dy),
        midX: state.start.x + dx * 0.5,
        midY: state.start.y + dy * 0.5,
    };
}

export function getRulerCssColor(state: RulerState = getState()): string {
    const { h, s, l, a } = state.color;
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

export const rulerTool = {
    subscribe: store.subscribe,
    getState,
    setEnabled,
    toggle,
    clear,
    placePoint,
    setLaneHitboxPx,
    setColor,
};
