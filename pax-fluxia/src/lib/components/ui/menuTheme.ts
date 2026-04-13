export type MenuTheme = "imperial" | "neon" | "mythic";

export const MENU_THEME_OPTIONS: Array<{
    id: MenuTheme;
    label: string;
    summary: string;
}> = [
    {
        id: "imperial",
        label: "Imperial Sci-Fi",
        summary: "Ceremonial command deck with obsidian panels and frost-cyan energy.",
    },
    {
        id: "neon",
        label: "Neon Tactical",
        summary: "Sharper tactical interface with brighter scanline energy and alert accents.",
    },
    {
        id: "mythic",
        label: "Cosmic Mythic",
        summary: "Celestial atlas styling with ember-gold highlights and softer grandeur.",
    },
];
