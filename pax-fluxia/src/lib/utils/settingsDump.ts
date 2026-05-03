/**
 * Settings Dump - Dev-only client helper
 *
 * Debounced POST of the full GAME_CONFIG to the Vite dev server,
 * which writes it to common/resources/settings-live/current-settings.json.
 *
 * This is opt-in only. Normal shell/menu startup performs many local UI
 * persistence writes, and auto-dumping those writes back into the repo can
 * trigger Vite reload loops during development.
 */

import { writable } from 'svelte/store';

import { GAME_CONFIG } from '$lib/config/game.config';
import {
    pushHomeRouteDiagError,
    pushHomeRouteDiagEvent,
} from '$lib/utils/homeRouteDiagnostics';

let timer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;
const SETTINGS_DUMP_STORAGE_KEY = 'pax-enable-settings-dump';
export const SETTINGS_DUMP_TARGET_PATH =
    'common/resources/settings-live/current-settings.json';

let loggedSettingsDumpSuppressed = false;
let loggedSettingsDumpEnabled = false;
let settingsDumpPostCount = 0;
let settingsDumpPosting = false;
let lastSettingsDumpStatus: 'idle' | 'scheduled' | 'ok' | 'failed' = 'idle';
let lastSettingsDumpHttpStatus: number | null = null;
let lastSettingsDumpTrigger: 'auto' | 'manual' | null = null;

type SettingsDumpDiagnostics = {
    enabled: boolean;
    devMode: boolean;
    uiEnabled: boolean;
};

export type SettingsDumpState = SettingsDumpDiagnostics & {
    postCount: number;
    posting: boolean;
    lastStatus: 'idle' | 'scheduled' | 'ok' | 'failed';
    lastHttpStatus: number | null;
    lastTrigger: 'auto' | 'manual' | null;
    targetPath: string;
};

function readUiSettingsDumpPreference(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return window.localStorage.getItem(SETTINGS_DUMP_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function getSettingsDumpDiagnostics(): SettingsDumpDiagnostics {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
        return {
            enabled: false,
            devMode: false,
            uiEnabled: false,
        };
    }

    const uiEnabled = readUiSettingsDumpPreference();
    return {
        enabled: uiEnabled,
        devMode: true,
        uiEnabled,
    };
}

function publishSettingsDumpState(): void {
    const diagnostics = getSettingsDumpDiagnostics();
    settingsDumpState.set({
        ...diagnostics,
        postCount: settingsDumpPostCount,
        posting: settingsDumpPosting,
        lastStatus: lastSettingsDumpStatus,
        lastHttpStatus: lastSettingsDumpHttpStatus,
        lastTrigger: lastSettingsDumpTrigger,
        targetPath: SETTINGS_DUMP_TARGET_PATH,
    });
}

export const settingsDumpState = writable<SettingsDumpState>({
    ...getSettingsDumpDiagnostics(),
    postCount: settingsDumpPostCount,
    posting: settingsDumpPosting,
    lastStatus: lastSettingsDumpStatus,
    lastHttpStatus: lastSettingsDumpHttpStatus,
    lastTrigger: lastSettingsDumpTrigger,
    targetPath: SETTINGS_DUMP_TARGET_PATH,
});

export function refreshSettingsDumpState(): void {
    publishSettingsDumpState();
}

export function setSettingsDumpEnabled(enabled: boolean): void {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
        publishSettingsDumpState();
        return;
    }

    try {
        if (enabled) {
            window.localStorage.setItem(SETTINGS_DUMP_STORAGE_KEY, 'true');
        } else {
            window.localStorage.removeItem(SETTINGS_DUMP_STORAGE_KEY);
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }
        pushHomeRouteDiagEvent('settings_dump_ui_toggled', { enabled });
    } catch (error) {
        pushHomeRouteDiagError('settings_dump_ui_toggled', error, { enabled });
    }

    publishSettingsDumpState();
}

async function postSettingsDump(
    trigger: 'auto' | 'manual',
): Promise<boolean> {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
        publishSettingsDumpState();
        return false;
    }

    settingsDumpPostCount += 1;
    settingsDumpPosting = true;
    lastSettingsDumpTrigger = trigger;
    lastSettingsDumpStatus = 'scheduled';
    lastSettingsDumpHttpStatus = null;
    publishSettingsDumpState();

    try {
        pushHomeRouteDiagEvent('settings_dump_post_scheduled', {
            postCount: settingsDumpPostCount,
            trigger,
        });
        const response = await fetch('/__settings-dump', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(GAME_CONFIG, null, 2),
        });

        settingsDumpPosting = false;
        lastSettingsDumpStatus = response.ok ? 'ok' : 'failed';
        lastSettingsDumpHttpStatus = response.status;
        publishSettingsDumpState();

        pushHomeRouteDiagEvent('settings_dump_post_completed', {
            postCount: settingsDumpPostCount,
            trigger,
            ok: response.ok,
            status: response.status,
        });
        return response.ok;
    } catch (error) {
        settingsDumpPosting = false;
        lastSettingsDumpStatus = 'failed';
        lastSettingsDumpHttpStatus = null;
        publishSettingsDumpState();
        pushHomeRouteDiagError('settings_dump_post_failed', error, {
            postCount: settingsDumpPostCount,
            trigger,
        });
        return false;
    }
}

export async function dumpSettingsNow(): Promise<boolean> {
    const diagnostics = getSettingsDumpDiagnostics();
    if (!diagnostics.devMode) {
        publishSettingsDumpState();
        return false;
    }

    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    pushHomeRouteDiagEvent('settings_dump_manual_requested', diagnostics);
    return postSettingsDump('manual');
}

/**
 * Call this after any save* function in panelSync.
 * Debounced to max once per 500ms to avoid thrashing during slider drags.
 */
export function dumpSettings(): void {
    const diagnostics = getSettingsDumpDiagnostics();
    if (!diagnostics.enabled) {
        if (!loggedSettingsDumpSuppressed && typeof window !== 'undefined') {
            loggedSettingsDumpSuppressed = true;
            pushHomeRouteDiagEvent('settings_dump_suppressed', diagnostics);
        }
        publishSettingsDumpState();
        return;
    }

    if (!loggedSettingsDumpEnabled && typeof window !== 'undefined') {
        loggedSettingsDumpEnabled = true;
        pushHomeRouteDiagEvent('settings_dump_enabled', diagnostics);
    }

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        timer = null;
        void postSettingsDump('auto');
    }, DEBOUNCE_MS);
}
