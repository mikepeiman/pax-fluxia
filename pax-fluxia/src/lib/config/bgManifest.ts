// ============================================================================
// Background Image Manifest — static list of available BG images
// ============================================================================
// These files live in static/assets/ and are referenced by filename.
// The /api/backgrounds server route (which used readdir) doesn't work with
// adapter-static. This hardcoded list replaces it.
//
// To add a new background: drop the image in static/assets/ and add it here.
// ============================================================================

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
