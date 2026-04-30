import { get, writable } from "svelte/store";

export type RulerSnapKind = "star" | "lane" | "free";
export type RulerLaneState = "straight" | "bent" | "curved" | "missing";
export type RulerMode = "transient" | "persistent";

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

export interface RulerMeasurement {
    id: string;
    start: RulerPoint;
    end: RulerPoint;
    dx: number;
    dy: number;
    distance: number;
    midX: number;
    midY: number;
    createdAt: string;
    laneMarginPx: number;
    starPairLabel?: string;
    relatedLaneKey?: string;
    relatedLaneLabel?: string;
    actualLaneState: RulerLaneState;
    userLaneState: RulerLaneState;
}

export interface RulerState {
    enabled: boolean;
    laneHitboxPx: number;
    mode: RulerMode;
    start: RulerPoint | null;
    end: RulerPoint | null;
    measurements: RulerMeasurement[];
    color: RulerColor;
}

export interface RulerPlacementResult {
    completed: { start: RulerPoint; end: RulerPoint } | null;
}

const initialState: RulerState = {
    enabled: false,
    laneHitboxPx: 18,
    mode: "transient",
    start: null,
    end: null,
    measurements: [],
    color: {
        h: 190,
        s: 90,
        l: 68,
        a: 0.95,
    },
};

const store = writable<RulerState>(initialState);

function setEnabled(enabled: boolean): void {
    store.update((state) => ({
        ...state,
        enabled,
        ...(enabled
            ? {}
            : {
                  start: null,
                  end: null,
                  measurements: [],
              }),
    }));
}

function toggle(): void {
    store.update((state) => ({ ...state, enabled: !state.enabled }));
}

function clear(): void {
    store.update((state) => ({
        ...state,
        start: null,
        end: null,
        measurements: [],
    }));
}

function placePoint(point: RulerPoint): RulerPlacementResult {
    let completed: { start: RulerPoint; end: RulerPoint } | null = null;

    store.update((state) => {
        if (!state.start) {
            return {
                ...state,
                start: point,
                end: null,
            };
        }

        if (!state.end) {
            completed = { start: state.start, end: point };
            if (state.mode === "persistent") {
                return {
                    ...state,
                    start: null,
                    end: null,
                };
            }
            return {
                ...state,
                end: point,
            };
        }

        return {
            ...state,
            start: point,
            end: null,
        };
    });

    return { completed };
}

function recordMeasurement(measurement: RulerMeasurement): void {
    store.update((state) => ({
        ...state,
        measurements: [...state.measurements, measurement],
    }));
}

function removeMeasurement(id: string): void {
    store.update((state) => ({
        ...state,
        measurements: state.measurements.filter((measurement) => measurement.id !== id),
    }));
}

function setMeasurementLaneState(id: string, laneState: RulerLaneState): void {
    store.update((state) => ({
        ...state,
        measurements: state.measurements.map((measurement) =>
            measurement.id === id
                ? { ...measurement, userLaneState: laneState }
                : measurement,
        ),
    }));
}

function setMode(mode: RulerMode): void {
    store.update((state) => {
        if (state.mode === mode) return state;
        return {
            ...state,
            mode,
            start: mode === "persistent" ? null : state.start,
            end: mode === "persistent" ? null : state.end,
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

export function buildRulerMeasurement(
    start: RulerPoint,
    end: RulerPoint,
    extras: {
        laneMarginPx: number;
        starPairLabel?: string;
        relatedLaneKey?: string;
        relatedLaneLabel?: string;
        actualLaneState?: RulerLaneState;
    },
): RulerMeasurement {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);
    const now = new Date().toISOString();
    const actualLaneState = extras.actualLaneState ?? "missing";

    return {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        start,
        end,
        dx,
        dy,
        distance,
        midX: start.x + dx * 0.5,
        midY: start.y + dy * 0.5,
        createdAt: now,
        laneMarginPx: extras.laneMarginPx,
        starPairLabel: extras.starPairLabel,
        relatedLaneKey: extras.relatedLaneKey,
        relatedLaneLabel: extras.relatedLaneLabel,
        actualLaneState,
        userLaneState: actualLaneState,
    };
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
    recordMeasurement,
    removeMeasurement,
    setMeasurementLaneState,
    setMode,
    setLaneHitboxPx,
    setColor,
};
