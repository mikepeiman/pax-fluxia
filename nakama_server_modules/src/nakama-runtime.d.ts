/**
 * Nakama Runtime Type Definitions
 * Basic types needed for Pax Fluxia server module
 */

declare namespace nkruntime {
  interface Context {
    env: {[key: string]: string};
    executionMode: string;
    node: string;
    version: string;
    userId?: string;
    username?: string;
    vars: {[key: string]: string};
    userSessionExp?: number;
    sessionId?: string;
    clientIp?: string;
    clientPort?: string;
  }

  interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  }

  interface Nakama {
    // Add Nakama API methods as needed
  }

  interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    hidden?: boolean;
    persistence?: boolean;
    status?: string;
  }

  interface MatchState {
    [key: string]: any;
  }

  interface MatchMessage {
    sender: Presence;
    opCode: number;
    data: string;
    reliable: boolean;
    receiveTime: number;
  }

  interface MatchDispatcher {
    broadcastMessage(opCode: number, data: string, presences?: Presence[], sender?: Presence, reliable?: boolean): void;
    broadcastMessageDeferred(opCode: number, data: string, presences?: Presence[], sender?: Presence, reliable?: boolean): void;
    matchKick(presences: Presence[]): void;
    matchLabelUpdate(label: string): void;
  }

  interface MatchHandler {
    matchInit: (ctx: Context, logger: Logger, nk: Nakama, params: {[key: string]: string}) => {state: MatchState, tickRate: number, label: string};
    matchJoinAttempt?: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, presence: Presence, metadata: {[key: string]: any}) => {state: MatchState, accept: boolean, rejectMessage?: string} | null;
    matchJoin?: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, presences: Presence[]) => {state: MatchState} | null;
    matchLeave?: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, presences: Presence[]) => {state: MatchState} | null;
    matchLoop?: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, messages: MatchMessage[]) => {state: MatchState} | null;
    matchTerminate?: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, graceSeconds: number) => {state: MatchState} | null;
    matchSignal?: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, data: string) => {state: MatchState, data?: string} | null;
  }

  interface Initializer {
    registerMatch(name: string, handler: MatchHandler): void;
    registerRpc(id: string, fn: Function): void;
    registerRealtimeAfter(fn: Function): void;
    registerRealtimeBefore(fn: Function): void;
    registerMatchmakerMatched(fn: Function): void;
    registerTournamentEnd(fn: Function): void;
    registerTournamentReset(fn: Function): void;
    registerLeaderboardReset(fn: Function): void;
  }
}

declare const InitModule: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) => void;

declare const require: (id: string) => any;
declare const __dirname: string;
declare const __filename: string;
