export function replaceState(url: string | URL, state: App.PageState): void {
    const href = typeof url === "string" ? url : url.toString();
    history.replaceState(state ?? history.state, "", href || location.href);
}

export function pushState(url: string | URL, state: App.PageState): void {
    const href = typeof url === "string" ? url : url.toString();
    history.pushState(state ?? history.state, "", href || location.href);
}
