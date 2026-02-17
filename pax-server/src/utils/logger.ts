// ============================================================================
// Pax Fluxia Server - Visual Telemetry (Logger)
// ============================================================================
// Structured, categorized logging for the server.
// Mirrors the client-side logger pattern.
//
// Usage:
//   import { log } from '../utils/logger';
//   log.sys('Room', 'Created successfully');
//   log.game('Tick', `Tick ${tick} complete`);

const COLORS = {
    sys: '\x1b[36m',     // Cyan
    game: '\x1b[32m',    // Green
    combat: '\x1b[31m',  // Red
    net: '\x1b[33m',     // Yellow
    error: '\x1b[91m',   // Bright Red
    success: '\x1b[92m', // Bright Green
    data: '\x1b[35m',    // Magenta
    reset: '\x1b[0m',
    dim: '\x1b[2m',
};

function formatLog(category: string, color: string, context: string, message: string, data?: unknown): void {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${COLORS.dim}${timestamp}${COLORS.reset} ${color}[${category}]${COLORS.reset} ${color}${context}${COLORS.reset}`;
    if (data !== undefined) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

export const log = {
    /** System lifecycle events (startup, room creation, disposal) */
    sys: (context: string, message: string, data?: unknown) =>
        formatLog('SYS', COLORS.sys, context, message, data),

    /** Game logic events (ticks, production, orders) */
    game: (context: string, message: string, data?: unknown) =>
        formatLog('GAME', COLORS.game, context, message, data),

    /** Combat events (damage, conquest, elimination) */
    combat: (context: string, message: string, data?: unknown) =>
        formatLog('COMBAT', COLORS.combat, context, message, data),

    /** Network events (join, leave, messages) */
    net: (context: string, message: string, data?: unknown) =>
        formatLog('NET', COLORS.net, context, message, data),

    /** Error events */
    error: (context: string, message: string, data?: unknown) =>
        formatLog('ERROR', COLORS.error, context, message, data),

    /** Success / verification events */
    success: (context: string, message: string, data?: unknown) =>
        formatLog('OK', COLORS.success, context, message, data),

    /** Data flow events */
    data: (context: string, message: string, data?: unknown) =>
        formatLog('DATA', COLORS.data, context, message, data),
};
