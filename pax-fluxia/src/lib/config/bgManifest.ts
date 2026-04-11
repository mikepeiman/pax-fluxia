// ============================================================================
// Background Image Manifest — static list of available BG images
// ============================================================================
// These files live in static/assets/ and are referenced by filename.
// The /api/backgrounds server route (which used readdir) doesn't work with
// adapter-static. This hardcoded list replaces it.
//
// To add a new background: drop the image in static/assets/ and add it here.
// ============================================================================

/**
 * GameCanvas loads backgrounds as `/assets/` + basename (see `static/assets/`).
 * Migrates legacy values like `/images/backgrounds/bg-25.jpg`, which produced
 * `/assets/images/...` and 404.
 */
export function normalizeBgImagePath(raw: string | undefined | null): string {
    let s = (raw ?? '').trim();
    if (!s) return '';
    if (
        /\/images\/backgrounds\/bg-25\.jpe?g$/i.test(s) ||
        /^\/?images\/backgrounds\/bg-25\.jpe?g$/i.test(s)
    ) {
        return 'pax-fluxia-bg-25.jpg';
    }
    s = s.replace(/^\/+/, '');
    if (s.toLowerCase().startsWith('assets/')) {
        s = s.slice('assets/'.length).replace(/^\/+/, '');
    }
    return s;
}

export const BG_IMAGES: string[] = [
    'nebula-bg.png',
    'pax-fluxia-bg-3.png',
    'pax-fluxia-bg-4.jpg',
    'pax-fluxia-bg-13.png',
    'pax-fluxia-bg-18.jpg',
    'pax-fluxia-bg-19.jpg',
    'pax-fluxia-bg-20.jpg',
    'pax-fluxia-bg-22.jpg',
    'pax-fluxia-bg-23.jpg',
    'pax-fluxia-bg-25.jpg',
    'pax-fluxia-bg-31.jpg',
    'pax-fluxia-bg-32.jpg',
];
