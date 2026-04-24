import {
    pushState as kitPushState,
    replaceState as kitReplaceState,
} from "$app/navigation";

function resolveHref(url: string | URL): string {
    if (typeof url === "string") {
        return url.length > 0 ? url : location.href;
    }
    const href = url.toString();
    return href.length > 0 ? href : location.href;
}

export function replaceStateCompat(
    url: string | URL,
    state: App.PageState,
): void {
    try {
        kitReplaceState(url, state);
    } catch {
        if (typeof window !== "undefined") {
            history.replaceState(state ?? history.state, "", resolveHref(url));
        }
    }
}

export function pushStateCompat(
    url: string | URL,
    state: App.PageState,
): void {
    try {
        kitPushState(url, state);
    } catch {
        if (typeof window !== "undefined") {
            history.pushState(state ?? history.state, "", resolveHref(url));
        }
    }
}
