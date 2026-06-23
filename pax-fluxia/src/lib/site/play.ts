// Shared "enter the game" routing for the marketing site.
//
// The playable game lives at the real `/play` route (src/routes/play/+page.svelte).
// Entering it is an ordinary same-origin navigation, so the browser back/forward
// buttons work and there is no URL token. The home route hosts the landing only.

import { goto } from "$app/navigation";

/** Real route that hosts the playable game (menu → match). */
export const PLAY_ROUTE = "/play";

/**
 * Dedicated game subdomain (play.paxfluxia.com). When the app is served there,
 * the home route sends `/` straight to the game route (it has no landing).
 */
export function isGameHost(host: string): boolean {
  return host === "play.paxfluxia.com" || host.startsWith("play.");
}

/**
 * Enter the game from anywhere on the marketing site. Used by the nav and every
 * "Play" CTA outside the home route (the home route passes its own handler that
 * also plays the click sound).
 */
export function goToGame(): void {
  void goto(PLAY_ROUTE);
}
