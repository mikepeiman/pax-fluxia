import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { SETTINGS_CONTROLS } from "./settingsControlRegistry";

/**
 * DEAD-CONTROL GUARD.
 *
 * Every settings control promises the user it does something. This asserts each
 * control's config key is actually READ by consuming code — a renderer/fx/engine
 * in the client, the shared sim (`common/src`), or the server (`pax-server/src`).
 * A key that appears only in the settings registration/render layer is a DEAD
 * knob (moving it does nothing) — the class the earlier audits missed.
 *
 * Scope notes (learned the hard way):
 *  - The SIM runs server-side/shared, so combat/economy keys live in common/src —
 *    they must be scanned or they false-positive as dead.
 *  - The whole `components/ui/settings/**` tree is EXCLUDED from the consumer
 *    search: a key in a `controlsFor([...])` render list is not a "consumer".
 *  - Keys whose only real effect is inside settings machinery (anim-lock binding)
 *    or a bespoke settings handler (the master System-Scale rescale) are allow-
 *    listed. So are keys that are read-but-inert (grep can't see no-op branches)
 *    and are pending a remove-vs-wire decision.
 */

const CLIENT = path.resolve(process.cwd(), "src/lib");
const SHARED = path.resolve(process.cwd(), "..", "common", "src");
const SERVER = path.resolve(process.cwd(), "..", "pax-server", "src");
const SETTINGS_DIR = path.resolve(process.cwd(), "src/lib/components/ui/settings");

// Registration/rendering-layer files that are NOT consumers.
const EXCLUDE = (p: string) =>
    p.startsWith(SETTINGS_DIR) ||
    /settingsDefs|settingsStore|settingsState|\.test\./.test(p);

function collect(dir: string, acc: string[]) {
    let entries: string[];
    try {
        entries = readdirSync(dir);
    } catch {
        return;
    }
    for (const entry of entries) {
        const p = path.join(dir, entry);
        let s: ReturnType<typeof statSync>;
        try {
            s = statSync(p);
        } catch {
            continue;
        }
        if (s.isDirectory()) collect(p, acc);
        else if (/\.(ts|svelte|js)$/.test(entry) && !EXCLUDE(p)) acc.push(p);
    }
}

/**
 * ALLOWLIST — NOT renderer-consumed, but legitimately alive OR a known dead knob
 * pending a remove-vs-wire decision. Shrinking this list is the goal.
 */
const ALLOWED_UNCONSUMED = new Set<string>([
    // Alive, but only via settings machinery / a bespoke settings handler:
    "STAR_SYSTEM_SCALE", // master rescale handler in ControlsSection-Ships
    "BIND_ANIMATION_TO_TICK", // drives the anim-lock in settingsStore/animLockMath
]);

describe("settings control wiring — no dead knobs", () => {
    const files: string[] = [];
    collect(CLIENT, files);
    collect(SHARED, files);
    collect(SERVER, files);
    const haystack = files.map((f) => readFileSync(f, "utf-8")).join("\n");

    it("every control's config key is read by consuming code (or is allow-listed)", () => {
        const dead = SETTINGS_CONTROLS.map((c) => c.configKey)
            // local.* are UI-state controls (ruler colour, palette, transpose)
            // consumed via stores under renamed fields — not GAME_CONFIG knobs.
            .filter((key) => !key.startsWith("local."))
            .filter((key) => !new RegExp(`\\b${key}\\b`).test(haystack))
            .filter((key) => !ALLOWED_UNCONSUMED.has(key));
        expect(
            dead,
            `controls whose config key NO consuming code reads — new dead knobs:\n${dead.join("\n")}`,
        ).toEqual([]);
    });
});
