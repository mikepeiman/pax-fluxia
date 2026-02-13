// ============================================================================
// Pax Fluxia - Common Package Entry Point
// ============================================================================

// Re-export all types
export * from './types';

// Re-export combat logic
export * from './combat';

// Re-export production logic
export * from './production';

// Re-export config (star type stats, engine config)
export * from './config';

// Re-export order logic
export * from './orders';

// Re-export conquest logic
export * from './conquest';

// Re-export combat resolution (standalone multi-source combat)
export * from './combatResolution';

// Re-export schema definitions
export * from './schema/GameState';

// Re-export engine
export * from './engine/GameEngine';
export * from './engine/GameInput';
export * from './engine/TickEvents';
