import type { MenuTheme } from '$lib/components/ui/main-menu/menuTheme';

export interface MenuBackgroundPalette {
    readonly base: string;
    readonly mid: string;
    readonly glow: string;
    readonly accent: string;
    readonly shadow: string;
    readonly mist: string;
}

const MENU_BACKGROUND_PALETTES: Record<MenuTheme, MenuBackgroundPalette> = {
    imperial: {
        base: '#04111f',
        mid: '#0d213b',
        glow: '#56d6ff',
        accent: '#ffd27e',
        shadow: '#02070d',
        mist: '#7ab8ff',
    },
    neon: {
        base: '#031024',
        mid: '#0b2448',
        glow: '#5af7ff',
        accent: '#ff4ce4',
        shadow: '#01060d',
        mist: '#8cfff2',
    },
    mythic: {
        base: '#120b22',
        mid: '#2a1842',
        glow: '#ffce83',
        accent: '#bd89ff',
        shadow: '#080510',
        mist: '#f1d1ff',
    },
};

export function getMenuBackgroundPalette(
    menuTheme: MenuTheme,
): MenuBackgroundPalette {
    return MENU_BACKGROUND_PALETTES[menuTheme];
}
