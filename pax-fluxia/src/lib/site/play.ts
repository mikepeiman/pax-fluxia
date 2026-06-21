// Shared "enter the game" routing for the marketing site.
//
// The game app lives on its own subdomain (play.paxfluxia.com); the public
// marketing site lives at the root (paxfluxia.com). The home route hosts the
// game shell inline, so it owns the rich open-shell flow. Every *other*
// marketing page just needs to hand off to the game — that logic lives here so
// the host rules have a single source of truth (the home route imports the
// same constants).

import { goto } from "$app/navigation";

/** Game app subdomain. Play actions on the marketing host hand off here. */
export const GAME_APP_URL = "https://play.paxfluxia.com";

/** Public marketing site. Play actions here redirect to the game app. */
export function isMarketingHost(host: string): boolean {
  return host === "paxfluxia.com" || host === "www.paxfluxia.com";
}

/** Game app subdomain. The shell auto-loads here rather than the landing. */
export function isGameHost(host: string): boolean {
  return host === "play.paxfluxia.com" || host.startsWith("play.");
}

function currentHost(): string {
  return typeof window !== "undefined" ? window.location.hostname : "";
}

/**
 * Launch the game from a marketing page that is *not* the home route.
 *
 * On the production marketing host we redirect to the game subdomain. In local
 * dev / preview (and any non-marketing host) there is no separate subdomain, so
 * we navigate to the home route with `?showGame=1`, which makes the home page
 * load the game shell inline on mount.
 */
export function goToGame(): void {
  const host = currentHost();
  if (isMarketingHost(host)) {
    window.location.href = GAME_APP_URL;
  } else {
    void goto("/?showGame=1");
  }
}
