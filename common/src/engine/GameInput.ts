// ============================================================================
// GameInput - Types for player and system inputs
// ============================================================================

export type GameInputType =
    | "ISSUE_ORDER"
    | "CANCEL_ORDER"
    | "SET_DEFERRED_ORDER"
    | "PAUSE"
    | "RESUME"
    | "SET_SPEED"
    | "START_GAME";

export interface IssueOrderInput {
    type: "ISSUE_ORDER";
    sourceId: string;
    targetId: string;
    playerId: string;
    persist?: boolean;  // Whether order persists after conquest
}

export interface CancelOrderInput {
    type: "CANCEL_ORDER";
    starId: string;
    playerId: string;
}

export interface SetDeferredOrderInput {
    type: "SET_DEFERRED_ORDER";
    starId: string;
    targetId: string;
    playerId: string;
    persist?: boolean;
}

export interface PauseInput {
    type: "PAUSE";
    playerId: string;
}

export interface ResumeInput {
    type: "RESUME";
    playerId: string;
}

export interface SetSpeedInput {
    type: "SET_SPEED";
    speed: number;
    playerId: string;
}

export interface StartGameInput {
    type: "START_GAME";
    playerId: string;
}

export type GameInput =
    | IssueOrderInput
    | CancelOrderInput
    | SetDeferredOrderInput
    | PauseInput
    | ResumeInput
    | SetSpeedInput
    | StartGameInput;
