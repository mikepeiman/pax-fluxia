import { browser } from "$app/environment";
import {
  applyPaxTheme,
  DEFAULT_PAX_THEME_ID,
  PAX_THEMES,
  readStoredPaxThemeId,
  type PaxThemeId,
  writeStoredPaxThemeId,
} from "./theme";

class PaxThemeState {
  current = $state<PaxThemeId>(DEFAULT_PAX_THEME_ID);
  hydrated = $state(false);

  get descriptor() {
    return PAX_THEMES[this.current];
  }

  hydrate() {
    if (!browser || this.hydrated) return;
    this.current = readStoredPaxThemeId(localStorage);
    this.hydrated = true;
    this.applyToDocument(false);
  }

  setTheme(themeId: PaxThemeId, persist = true) {
    this.current = themeId;
    this.applyToDocument(persist);
  }

  applyToDocument(persist = true) {
    if (!browser) return;
    applyPaxTheme(document.documentElement, this.current);
    if (persist) {
      writeStoredPaxThemeId(localStorage, this.current);
    }
  }
}

export const paxThemeState = new PaxThemeState();
