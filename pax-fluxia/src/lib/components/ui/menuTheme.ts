export type MenuTheme = "imperial" | "neon" | "mythic";

interface ThemeTextTokens {
    base: string;
    heading: string;
    muted: string;
    mutedStrong: string;
    onAccent: string;
    danger: string;
}

interface ThemeBorderTokens {
    soft: string;
    strong: string;
    faint: string;
    divider: string;
    danger: string;
    swatch: string;
    sliderThumb: string;
}

interface ThemeSurfaceTokens {
    shell: string;
    panel: string;
    card: string;
    cardHover: string;
    control: string;
    controlHover: string;
    elevated: string;
    command: string;
    modal: string;
    dialog: string;
    preview: string;
    field: string;
    pill: string;
    pillActive: string;
    tag: string;
    tagActive: string;
    danger: string;
}

interface ThemeAccentTokens {
    strong: string;
    soft: string;
    alt: string;
    glow: string;
    ctaStartA: string;
    ctaStartB: string;
    ctaAltA: string;
    ctaAltB: string;
}

interface ThemeDecorativeTokens {
    shellOverlay: string;
    shellOrnament: string;
    grid: string;
    gridGlow: string;
    panelSheen: string;
    cardSheen: string;
    controlSheen: string;
    modalScrim: string;
    titleGradientStart: string;
    titleGradientEnd: string;
    titleShadow: string;
    previewGlow: string;
    sliderTrack: string;
    shadowPanel: string;
    shadowElevated: string;
    shadowGlow: string;
}

interface ThemeIdentityTokens {
    modeLabel: string;
    chipArt: string;
    bannerArt: string;
}

interface MenuThemeDefinition {
    id: MenuTheme;
    label: string;
    summary: string;
    text: ThemeTextTokens;
    borders: ThemeBorderTokens;
    surfaces: ThemeSurfaceTokens;
    accents: ThemeAccentTokens;
    identity: ThemeIdentityTokens;
    decorative: ThemeDecorativeTokens;
}

const MENU_THEME_DEFINITIONS: Record<MenuTheme, MenuThemeDefinition> = {
    imperial: {
        id: "imperial",
        label: "Imperial Sci-Fi",
        summary: "Ceremonial command deck with obsidian panels and frost-cyan energy.",
        text: {
            base: "#ecf5ff",
            heading: "#a9e4ff",
            muted: "rgba(212, 229, 255, 0.66)",
            mutedStrong: "rgba(236, 244, 255, 0.86)",
            onAccent: "#f8fcff",
            danger: "#ffc9c9",
        },
        borders: {
            soft: "rgba(123, 195, 255, 0.18)",
            strong: "rgba(160, 220, 255, 0.34)",
            faint: "rgba(255, 255, 255, 0.06)",
            divider: "rgba(126, 191, 255, 0.22)",
            danger: "rgba(255, 126, 126, 0.34)",
            swatch: "rgba(255, 255, 255, 0.26)",
            sliderThumb: "rgba(248, 251, 255, 0.92)",
        },
        surfaces: {
            shell: [
                "radial-gradient(circle at 18% 20%, rgba(255, 173, 92, 0.24), transparent 30%)",
                "radial-gradient(circle at 78% 22%, rgba(104, 130, 255, 0.2), transparent 36%)",
                "radial-gradient(circle at 50% 82%, rgba(87, 190, 255, 0.16), transparent 30%)",
                "linear-gradient(180deg, rgba(8, 14, 28, 0.74), rgba(3, 7, 14, 0.92))",
            ].join(", "),
            panel: "linear-gradient(180deg, rgba(255, 255, 255, 0.065), transparent 40%), rgba(6, 12, 24, 0.84)",
            card: "linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 44%), rgba(255, 255, 255, 0.03)",
            cardHover:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.085), transparent 44%), rgba(255, 255, 255, 0.055)",
            control:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent 100%), rgba(10, 22, 40, 0.74)",
            controlHover:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 100%), rgba(13, 27, 48, 0.86)",
            elevated:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 45%), rgba(7, 14, 28, 0.82)",
            command:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 42%), rgba(5, 12, 24, 0.92)",
            modal:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 28%), rgba(7, 14, 28, 0.96)",
            dialog:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 38%), rgba(5, 12, 24, 0.96)",
            preview:
                "radial-gradient(circle at 50% 42%, rgba(86, 214, 255, 0.12), transparent 56%), rgba(3, 10, 20, 0.76)",
            field: "rgba(3, 10, 20, 0.66)",
            pill: "rgba(255, 255, 255, 0.04)",
            pillActive:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.085), transparent 100%), rgba(255, 255, 255, 0.07)",
            tag: "rgba(255, 255, 255, 0.05)",
            tagActive:
                "linear-gradient(135deg, rgba(64, 118, 188, 0.34), rgba(17, 53, 108, 0.18))",
            danger:
                "linear-gradient(180deg, rgba(255, 126, 126, 0.14), transparent 100%), rgba(48, 16, 22, 0.74)",
        },
        accents: {
            strong: "#56d6ff",
            soft: "rgba(109, 212, 255, 0.62)",
            alt: "#ffd27e",
            glow: "rgba(86, 214, 255, 0.34)",
            ctaStartA: "rgba(19, 115, 214, 0.92)",
            ctaStartB: "rgba(20, 177, 207, 0.92)",
            ctaAltA: "rgba(102, 78, 255, 0.9)",
            ctaAltB: "rgba(255, 173, 92, 0.88)",
        },
        identity: {
            modeLabel: "Imperial",
            chipArt: "/assets/menu-themes/imperial-chip.svg",
            bannerArt: "/assets/menu-themes/imperial-banner.svg",
        },
        decorative: {
            shellOverlay:
                "linear-gradient(135deg, rgba(255, 214, 126, 0.08), transparent 26%, transparent 74%, rgba(86, 214, 255, 0.08))",
            shellOrnament:
                "radial-gradient(circle at 20% 18%, rgba(255, 220, 157, 0.08) 0 1px, transparent 2px), radial-gradient(circle at 78% 16%, rgba(166, 223, 255, 0.08) 0 1px, transparent 2px)",
            grid: "rgba(158, 209, 255, 0.06)",
            gridGlow: "rgba(86, 214, 255, 0.1)",
            panelSheen: "linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 44%)",
            cardSheen: "linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 44%)",
            controlSheen: "linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 100%)",
            modalScrim: "rgba(2, 5, 12, 0.74)",
            titleGradientStart: "#ffffff",
            titleGradientEnd: "#56d6ff",
            titleShadow: "drop-shadow(0 0 18px rgba(86, 214, 255, 0.32))",
            previewGlow: "rgba(86, 214, 255, 0.16)",
            sliderTrack: "rgba(255, 255, 255, 0.12)",
            shadowPanel: "inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 20px 44px rgba(0, 0, 0, 0.28)",
            shadowElevated: "0 22px 44px rgba(0, 0, 0, 0.34), 0 0 0 1px rgba(255, 255, 255, 0.02)",
            shadowGlow: "0 0 18px rgba(86, 214, 255, 0.18)",
        },
    },
    neon: {
        id: "neon",
        label: "Neon Tactical",
        summary: "Sharper tactical interface with brighter scanline energy and alert accents.",
        text: {
            base: "#ebfbff",
            heading: "#8ff4ff",
            muted: "rgba(218, 242, 255, 0.7)",
            mutedStrong: "rgba(238, 248, 255, 0.9)",
            onAccent: "#f4feff",
            danger: "#ffc0df",
        },
        borders: {
            soft: "rgba(86, 238, 255, 0.24)",
            strong: "rgba(132, 255, 247, 0.42)",
            faint: "rgba(124, 238, 255, 0.08)",
            divider: "rgba(126, 255, 230, 0.26)",
            danger: "rgba(255, 87, 221, 0.34)",
            swatch: "rgba(212, 255, 255, 0.38)",
            sliderThumb: "rgba(236, 255, 255, 0.96)",
        },
        surfaces: {
            shell: [
                "radial-gradient(circle at 16% 16%, rgba(34, 129, 255, 0.22), transparent 26%)",
                "radial-gradient(circle at 78% 18%, rgba(64, 255, 223, 0.14), transparent 28%)",
                "radial-gradient(circle at 52% 84%, rgba(255, 64, 226, 0.12), transparent 30%)",
                "linear-gradient(180deg, rgba(3, 10, 26, 0.76), rgba(2, 6, 20, 0.94))",
            ].join(", "),
            panel: "linear-gradient(180deg, rgba(89, 228, 255, 0.08), transparent 26%), rgba(7, 15, 34, 0.9)",
            card: "linear-gradient(180deg, rgba(84, 248, 255, 0.07), transparent 32%), rgba(7, 18, 38, 0.74)",
            cardHover:
                "linear-gradient(180deg, rgba(125, 255, 198, 0.12), transparent 36%), rgba(8, 22, 44, 0.86)",
            control:
                "linear-gradient(180deg, rgba(90, 247, 255, 0.07), transparent 100%), rgba(8, 20, 44, 0.84)",
            controlHover:
                "linear-gradient(180deg, rgba(126, 255, 230, 0.14), transparent 100%), rgba(9, 25, 52, 0.94)",
            elevated:
                "linear-gradient(180deg, rgba(90, 247, 255, 0.12), transparent 40%), rgba(6, 14, 34, 0.9)",
            command:
                "linear-gradient(180deg, rgba(90, 247, 255, 0.12), transparent 40%), rgba(4, 12, 28, 0.94)",
            modal:
                "linear-gradient(180deg, rgba(90, 247, 255, 0.12), transparent 24%), rgba(6, 14, 34, 0.97)",
            dialog:
                "linear-gradient(180deg, rgba(126, 255, 230, 0.12), transparent 28%), rgba(5, 12, 30, 0.96)",
            preview:
                "radial-gradient(circle at 50% 38%, rgba(126, 255, 230, 0.18), transparent 56%), linear-gradient(180deg, rgba(31, 94, 163, 0.22), transparent 40%), rgba(4, 12, 28, 0.82)",
            field: "rgba(4, 12, 30, 0.76)",
            pill: "rgba(94, 243, 255, 0.08)",
            pillActive:
                "linear-gradient(180deg, rgba(126, 255, 230, 0.16), transparent 100%), rgba(23, 61, 86, 0.34)",
            tag: "rgba(255, 76, 228, 0.08)",
            tagActive:
                "linear-gradient(135deg, rgba(126, 255, 230, 0.26), rgba(255, 76, 228, 0.18))",
            danger:
                "linear-gradient(180deg, rgba(255, 87, 221, 0.14), transparent 100%), rgba(43, 11, 37, 0.82)",
        },
        accents: {
            strong: "#5af7ff",
            soft: "rgba(126, 255, 230, 0.68)",
            alt: "#ff4ce4",
            glow: "rgba(90, 247, 255, 0.38)",
            ctaStartA: "rgba(0, 128, 255, 0.94)",
            ctaStartB: "rgba(0, 241, 255, 0.94)",
            ctaAltA: "rgba(96, 255, 184, 0.92)",
            ctaAltB: "rgba(255, 76, 228, 0.88)",
        },
        identity: {
            modeLabel: "Neon",
            chipArt: "/assets/menu-themes/neon-chip.svg",
            bannerArt: "/assets/menu-themes/neon-banner.svg",
        },
        decorative: {
            shellOverlay:
                "linear-gradient(90deg, rgba(126, 255, 230, 0.08), transparent 30%, transparent 72%, rgba(255, 76, 228, 0.08))",
            shellOrnament:
                "repeating-linear-gradient(180deg, rgba(126, 255, 230, 0.055) 0 1px, transparent 1px 6px), linear-gradient(135deg, rgba(90, 247, 255, 0.08), transparent 38%, rgba(255, 76, 228, 0.05) 78%, transparent)",
            grid: "rgba(137, 255, 255, 0.08)",
            gridGlow: "rgba(90, 247, 255, 0.16)",
            panelSheen: "linear-gradient(180deg, rgba(126, 255, 230, 0.1), transparent 32%)",
            cardSheen: "linear-gradient(180deg, rgba(90, 247, 255, 0.08), transparent 34%)",
            controlSheen: "linear-gradient(180deg, rgba(126, 255, 230, 0.1), transparent 100%)",
            modalScrim: "rgba(1, 8, 20, 0.78)",
            titleGradientStart: "#d8fbff",
            titleGradientEnd: "#5af7ff",
            titleShadow: "drop-shadow(0 0 24px rgba(90, 247, 255, 0.38))",
            previewGlow: "rgba(126, 255, 230, 0.18)",
            sliderTrack: "rgba(90, 247, 255, 0.2)",
            shadowPanel: "inset 0 1px 0 rgba(141, 255, 246, 0.08), 0 24px 48px rgba(0, 0, 0, 0.34)",
            shadowElevated: "0 26px 48px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(90, 247, 255, 0.08)",
            shadowGlow: "0 0 24px rgba(90, 247, 255, 0.22)",
        },
    },
    mythic: {
        id: "mythic",
        label: "Cosmic Mythic",
        summary: "Celestial atlas styling with ember-gold highlights and softer grandeur.",
        text: {
            base: "#f7f0ff",
            heading: "#f0d2ff",
            muted: "rgba(239, 224, 255, 0.68)",
            mutedStrong: "rgba(249, 241, 255, 0.9)",
            onAccent: "#fff8ef",
            danger: "#ffd3c0",
        },
        borders: {
            soft: "rgba(220, 171, 255, 0.2)",
            strong: "rgba(255, 214, 152, 0.32)",
            faint: "rgba(255, 255, 255, 0.07)",
            divider: "rgba(255, 206, 131, 0.24)",
            danger: "rgba(255, 156, 118, 0.36)",
            swatch: "rgba(255, 239, 218, 0.28)",
            sliderThumb: "rgba(255, 247, 238, 0.94)",
        },
        surfaces: {
            shell: [
                "radial-gradient(circle at 18% 18%, rgba(255, 204, 136, 0.18), transparent 28%)",
                "radial-gradient(circle at 76% 18%, rgba(184, 136, 255, 0.18), transparent 32%)",
                "radial-gradient(circle at 56% 84%, rgba(123, 93, 255, 0.14), transparent 30%)",
                "linear-gradient(180deg, rgba(18, 12, 34, 0.76), rgba(10, 8, 20, 0.94))",
            ].join(", "),
            panel: "linear-gradient(180deg, rgba(255, 222, 176, 0.08), transparent 22%), rgba(22, 16, 42, 0.88)",
            card: "linear-gradient(180deg, rgba(255, 227, 190, 0.07), transparent 34%), rgba(33, 22, 56, 0.74)",
            cardHover:
                "linear-gradient(180deg, rgba(255, 206, 131, 0.12), transparent 38%), rgba(41, 28, 68, 0.84)",
            control:
                "linear-gradient(180deg, rgba(255, 220, 171, 0.08), transparent 100%), rgba(32, 22, 58, 0.84)",
            controlHover:
                "linear-gradient(180deg, rgba(255, 206, 131, 0.14), transparent 100%), rgba(39, 27, 66, 0.92)",
            elevated:
                "linear-gradient(180deg, rgba(255, 224, 186, 0.1), transparent 36%), rgba(24, 16, 42, 0.9)",
            command:
                "linear-gradient(180deg, rgba(255, 224, 186, 0.1), transparent 34%), rgba(20, 14, 36, 0.94)",
            modal:
                "linear-gradient(180deg, rgba(255, 224, 186, 0.12), transparent 24%), rgba(22, 15, 38, 0.97)",
            dialog:
                "linear-gradient(180deg, rgba(255, 206, 131, 0.12), transparent 30%), rgba(24, 16, 40, 0.96)",
            preview:
                "radial-gradient(circle at 50% 40%, rgba(255, 206, 131, 0.14), transparent 54%), linear-gradient(180deg, rgba(170, 118, 255, 0.12), transparent 40%), rgba(18, 12, 34, 0.82)",
            field: "rgba(19, 12, 36, 0.74)",
            pill: "rgba(255, 231, 198, 0.06)",
            pillActive:
                "linear-gradient(180deg, rgba(255, 206, 131, 0.12), transparent 100%), rgba(70, 44, 74, 0.32)",
            tag: "rgba(189, 137, 255, 0.08)",
            tagActive:
                "linear-gradient(135deg, rgba(255, 206, 131, 0.22), rgba(181, 125, 255, 0.18))",
            danger:
                "linear-gradient(180deg, rgba(255, 156, 118, 0.14), transparent 100%), rgba(54, 20, 28, 0.78)",
        },
        accents: {
            strong: "#ffce83",
            soft: "rgba(255, 206, 131, 0.56)",
            alt: "#bd89ff",
            glow: "rgba(255, 206, 131, 0.26)",
            ctaStartA: "rgba(143, 73, 255, 0.9)",
            ctaStartB: "rgba(255, 137, 87, 0.9)",
            ctaAltA: "rgba(255, 206, 131, 0.92)",
            ctaAltB: "rgba(181, 125, 255, 0.9)",
        },
        identity: {
            modeLabel: "Mythic",
            chipArt: "/assets/menu-themes/mythic-chip.svg",
            bannerArt: "/assets/menu-themes/mythic-banner.svg",
        },
        decorative: {
            shellOverlay:
                "linear-gradient(135deg, rgba(255, 206, 131, 0.08), transparent 32%, transparent 70%, rgba(181, 125, 255, 0.08))",
            shellOrnament:
                "repeating-radial-gradient(circle at 50% -14%, rgba(255, 206, 131, 0.05) 0 2px, transparent 2px 24px), radial-gradient(circle at 20% 16%, rgba(255, 214, 152, 0.1) 0 1px, transparent 2px), radial-gradient(circle at 78% 16%, rgba(181, 125, 255, 0.1) 0 1px, transparent 2px)",
            grid: "rgba(220, 188, 255, 0.07)",
            gridGlow: "rgba(255, 206, 131, 0.12)",
            panelSheen: "linear-gradient(180deg, rgba(255, 224, 186, 0.1), transparent 34%)",
            cardSheen: "linear-gradient(180deg, rgba(255, 224, 186, 0.08), transparent 34%)",
            controlSheen: "linear-gradient(180deg, rgba(255, 206, 131, 0.08), transparent 100%)",
            modalScrim: "rgba(8, 5, 18, 0.78)",
            titleGradientStart: "#fff2d7",
            titleGradientEnd: "#d9a0ff",
            titleShadow: "drop-shadow(0 0 22px rgba(255, 206, 131, 0.24))",
            previewGlow: "rgba(255, 206, 131, 0.14)",
            sliderTrack: "rgba(255, 231, 198, 0.16)",
            shadowPanel: "inset 0 1px 0 rgba(255, 231, 198, 0.05), 0 22px 46px rgba(0, 0, 0, 0.34)",
            shadowElevated: "0 24px 46px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(255, 206, 131, 0.04)",
            shadowGlow: "0 0 22px rgba(255, 206, 131, 0.18)",
        },
    },
};

export const MENU_THEME_OPTIONS = (
    Object.keys(MENU_THEME_DEFINITIONS) as MenuTheme[]
).map((themeId) => {
    const { id, label, summary } = MENU_THEME_DEFINITIONS[themeId];
    return { id, label, summary };
});

function escapeThemeValue(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

export function getMenuThemeDefinition(theme: MenuTheme): MenuThemeDefinition {
    return MENU_THEME_DEFINITIONS[theme];
}

export function getMenuThemeCssVars(theme: MenuTheme): string {
    const definition = MENU_THEME_DEFINITIONS[theme];

    const vars: Record<string, string> = {
        "--pf-text": definition.text.base,
        "--pf-heading": definition.text.heading,
        "--pf-muted": definition.text.muted,
        "--pf-muted-strong": definition.text.mutedStrong,
        "--pf-text-on-accent": definition.text.onAccent,
        "--pf-danger": definition.text.danger,
        "--pf-border-soft": definition.borders.soft,
        "--pf-border-strong": definition.borders.strong,
        "--pf-border-faint": definition.borders.faint,
        "--pf-divider": definition.borders.divider,
        "--pf-border-danger": definition.borders.danger,
        "--pf-border-swatch": definition.borders.swatch,
        "--pf-slider-thumb-border": definition.borders.sliderThumb,
        "--pf-surface-shell": definition.surfaces.shell,
        "--pf-surface-panel": definition.surfaces.panel,
        "--pf-surface-card": definition.surfaces.card,
        "--pf-surface-card-hover": definition.surfaces.cardHover,
        "--pf-surface-control": definition.surfaces.control,
        "--pf-surface-control-hover": definition.surfaces.controlHover,
        "--pf-surface-elevated": definition.surfaces.elevated,
        "--pf-surface-command": definition.surfaces.command,
        "--pf-surface-modal": definition.surfaces.modal,
        "--pf-surface-dialog": definition.surfaces.dialog,
        "--pf-surface-preview": definition.surfaces.preview,
        "--pf-surface-field": definition.surfaces.field,
        "--pf-surface-pill": definition.surfaces.pill,
        "--pf-surface-pill-active": definition.surfaces.pillActive,
        "--pf-surface-tag": definition.surfaces.tag,
        "--pf-surface-tag-active": definition.surfaces.tagActive,
        "--pf-surface-danger": definition.surfaces.danger,
        "--pf-accent-strong": definition.accents.strong,
        "--pf-accent-soft": definition.accents.soft,
        "--pf-accent-alt": definition.accents.alt,
        "--pf-glow": definition.accents.glow,
        "--pf-cta-start-a": definition.accents.ctaStartA,
        "--pf-cta-start-b": definition.accents.ctaStartB,
        "--pf-cta-alt-a": definition.accents.ctaAltA,
        "--pf-cta-alt-b": definition.accents.ctaAltB,
        "--pf-theme-chip-art": `url('${definition.identity.chipArt}')`,
        "--pf-theme-banner-art": `url('${definition.identity.bannerArt}')`,
        "--pf-overlay-shell": definition.decorative.shellOverlay,
        "--pf-overlay-ornament": definition.decorative.shellOrnament,
        "--pf-overlay-grid": definition.decorative.grid,
        "--pf-overlay-grid-glow": definition.decorative.gridGlow,
        "--pf-overlay-panel-sheen": definition.decorative.panelSheen,
        "--pf-overlay-card-sheen": definition.decorative.cardSheen,
        "--pf-overlay-control-sheen": definition.decorative.controlSheen,
        "--pf-overlay-modal-scrim": definition.decorative.modalScrim,
        "--pf-title-gradient-start": definition.decorative.titleGradientStart,
        "--pf-title-gradient-end": definition.decorative.titleGradientEnd,
        "--pf-title-shadow": definition.decorative.titleShadow,
        "--pf-preview-glow": definition.decorative.previewGlow,
        "--pf-slider-track": definition.decorative.sliderTrack,
        "--pf-shadow-panel": definition.decorative.shadowPanel,
        "--pf-shadow-elevated": definition.decorative.shadowElevated,
        "--pf-shadow-glow": definition.decorative.shadowGlow,
    };

    return Object.entries(vars)
        .map(([name, value]) => `${name}:${escapeThemeValue(value)}`)
        .join(";");
}
