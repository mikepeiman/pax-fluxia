// ============================================================================
// Visual Telemetry Logger - Semantic logging for PRISM observability
// ============================================================================
// Rule: No raw console.log. Use this semantic logger instead.
// Colors map to PRISM dimensions for visual scanning.

const styles = {
    sys: 'background: #3b82f6; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    state: 'background: #a855f7; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    data: 'background: #10b981; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    net: 'background: #f59e0b; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    err: 'background: #ef4444; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    ok: 'background: #22c55e; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    reset: 'color: inherit;'
};

/**
 * Visual Telemetry Logger
 * 
 * Categories map to PRISM dimensions:
 * - sys: STRUCTURE - Lifecycle, initialization
 * - state: STATE - Logic, transitions
 * - data: FLOW - Data, pipes
 * - net: NETWORK - API, IO
 * - error: CORRECTION - Errors, fixes
 * - success: VERIFICATION - Success markers
 */
export const log = {
    /** 🔵 SYSTEM - Lifecycle and initialization */
    sys: (context: string, msg: string, data?: unknown) =>
        console.log(`%cSYSTEM%c [${context}] ${msg}`, styles.sys, styles.reset, data ?? ''),

    /** 🟣 STATE - Logic and state transitions */
    state: (context: string, msg: string, state?: unknown) =>
        console.log(`%cSTATE%c [${context}] ${msg}`, styles.state, styles.reset, state ?? ''),

    /** 🟢 DATA - Data flow and transformations */
    data: (context: string, msg: string, data?: unknown) =>
        console.log(`%cDATA%c [${context}] ${msg}`, styles.data, styles.reset, data ?? ''),

    /** 🟡 NET - Network and API calls */
    net: (context: string, msg: string, data?: unknown) =>
        console.log(`%cNET%c [${context}] ${msg}`, styles.net, styles.reset, data ?? ''),

    /** 🔴 ERROR - Errors and corrections */
    error: (context: string, msg: string, err?: unknown) =>
        console.error(`%cERROR%c [${context}] ${msg}`, styles.err, styles.reset, err ?? ''),

    /** ✅ SUCCESS - Verification and success */
    success: (context: string, msg: string, data?: unknown) =>
        console.log(`%cSUCCESS%c [${context}] ${msg}`, styles.ok, styles.reset, data ?? '')
};

// Default export for convenience
export default log;
