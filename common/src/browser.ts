// ============================================================================
// Pax Fluxia - Browser-Safe Common Entry Point
// ============================================================================
//
// The full package barrel exports Colyseus schema modules for the server.
// Client builds must avoid that path so browser tooling and benchmark runs do
// not pull @colyseus/schema into the web graph unless explicitly requested.

export * from './types';
export * from './combat';
export * from './production';
export * from './config';
export * from './orders';
export * from './conquest';
export * from './combatResolution';
export * from './schema/GameState';
export * from './engine/GameEngine';
export * from './engine/GameInput';
export * from './engine/TickEvents';
export * from './mapgen';
export * from './ai';
export * from './fixtureMaps';
export * from './ownership';
