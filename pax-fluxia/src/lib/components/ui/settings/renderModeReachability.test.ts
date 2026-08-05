/**
 * renderModeReachability.test — the render-mode picker must actually render.
 *
 * The picker sat inside `{#if showModesView}`, and `showModesView` is true only
 * for `view="all"` or `view="modes"`. `view="all"` is the prop DEFAULT but was
 * never passed by any mount site, and the single `view="modes"` mount (the
 * Transition section) also passes `hideRenderModeSelector={true}`. Net effect:
 * the control rendered on no screen in the shipped app.
 *
 * That is invisible to type-checking and to every DOM-free test, and it became
 * unrecoverable once the topbar's render-mode buttons were removed — there was
 * then no way at all to change how territory is drawn.
 *
 * These tests read the source of truth (the markup and its mount sites) rather
 * than a mounted DOM, so they hold even as the section's internals change.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveTerritoryRenderModeOptions } from '$lib/territory/ui/territoryRenderModeCatalog';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TERRITORY_SECTION = readFileSync(path.join(HERE, 'ControlsSection-Territory.svelte'), 'utf-8');
const SETTINGS_PANEL = readFileSync(path.resolve(HERE, '..', 'GameSettingsPanel.svelte'), 'utf-8');

/** Every `view="…"` a mount site actually passes to the territory section. */
function mountedViews(): string[] {
    const mounts = SETTINGS_PANEL.match(/<ControlsSectionTerritory[\s\S]*?(?:\/>|>)/g) ?? [];
    return mounts.map((mount) => mount.match(/view="([a-z]+)"/)?.[1] ?? 'all');
}

describe('render-mode picker reachability', () => {
    it('the picker is mounted in the territory section', () => {
        expect(TERRITORY_SECTION).toContain('<RenderModePicker');
        expect(TERRITORY_SECTION).toContain('RenderModePicker.svelte');
    });

    it('at least one mount site renders the view the picker lives in', () => {
        // The picker is inside the styles view. If no mount passes a view that
        // includes it, the control exists in source and nowhere on screen.
        const views = new Set(mountedViews());
        const stylesReached = views.has('styles') || views.has('all');
        expect(
            stylesReached,
            `no mount site renders the picker's view — mounts pass: ${[...views].join(', ')}`,
        ).toBe(true);
    });

    it('the mount that shows the picker does not also suppress it', () => {
        // `hideRenderModeSelector` is legitimate for the Transition section, but
        // if it were ever applied to the styles mount the picker would vanish
        // again with nothing failing.
        const stylesMount = (SETTINGS_PANEL.match(/<ControlsSectionTerritory[\s\S]*?(?:\/>|>)/g) ?? [])
            .find((mount) => mount.includes('view="styles"'));
        expect(stylesMount, 'no view="styles" mount found').toBeTruthy();
        expect(
            stylesMount!.includes('hideRenderModeSelector'),
            'the styles mount suppresses the render-mode picker',
        ).toBe(false);
    });

    it('the picker sits outside the style-surface gate', () => {
        // A mode with no style surface (or Off) must still be escapable. If the
        // picker were inside `hasTerritoryStyleControls()`, selecting such a
        // mode would hide the only control that can change it back.
        const stylesBlockStart = TERRITORY_SECTION.indexOf('{#if showStylesView}');
        const gateIndex = TERRITORY_SECTION.indexOf('hasTerritoryStyleControls()', stylesBlockStart);
        const pickerIndex = TERRITORY_SECTION.indexOf('<RenderModePicker', stylesBlockStart);
        expect(stylesBlockStart).toBeGreaterThanOrEqual(0);
        expect(pickerIndex).toBeGreaterThanOrEqual(0);
        expect(
            pickerIndex,
            'the picker is gated behind hasTerritoryStyleControls() — a mode with no style surface would trap the user',
        ).toBeLessThan(gateIndex);
    });

    it('the picker reads the LIVE mode, not the browsed subsection', () => {
        // resolveActiveStyleId() prefers whichever mode's card you are viewing,
        // which is right for the tuning cards and wrong for the picker: it would
        // report a mode the game is not rendering.
        const pickerBlock = TERRITORY_SECTION.slice(
            TERRITORY_SECTION.indexOf('<RenderModePicker'),
            TERRITORY_SECTION.indexOf('/>', TERRITORY_SECTION.indexOf('<RenderModePicker')),
        );
        expect(pickerBlock).toContain('resolveLiveRenderModeId()');
        expect(pickerBlock).not.toContain('resolveActiveStyleId()');
    });

    it('every selectable render mode is offered by the picker', () => {
        // The picker takes the catalog directly, so this guards the catalog:
        // a keep-set mode that stops being selectable silently disappears.
        const selectable = resolveTerritoryRenderModeOptions().filter((option) => option.selectable);
        expect(selectable.length).toBeGreaterThan(1);
        expect(selectable.map((option) => option.id)).toContain('power_vector');
        expect(selectable.map((option) => option.id)).toContain('none');
    });

    it('selecting a mode writes the render-mode config key', () => {
        // The picker's handler must be the one that actually sets the mode.
        expect(TERRITORY_SECTION).toContain('onValueChange={selectTerritoryStyle}');
        expect(TERRITORY_SECTION).toContain('"TERRITORY_RENDER_MODE"');
    });
});
