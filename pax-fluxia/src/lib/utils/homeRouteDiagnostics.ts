export interface HomeRouteDiagEvent {
  at: string;
  kind: string;
  detail: Record<string, unknown> | null;
}

export interface HomeRouteDiagError {
  at: string;
  source: string;
  message: string;
  stack: string | null;
  resourceUrl: string | null;
  detail: Record<string, unknown> | null;
}

export interface HomeRouteDiagSnapshot {
  lastUpdatedAt: string | null;
  events: HomeRouteDiagEvent[];
  errors: HomeRouteDiagError[];
}

declare global {
  interface Window {
    __PAX_HOME_ROUTE_DIAG_LOG__?: HomeRouteDiagSnapshot;
  }
}

const MAX_EVENTS = 24;
const MAX_ERRORS = 12;

const EMPTY_SNAPSHOT: HomeRouteDiagSnapshot = {
  lastUpdatedAt: null,
  events: [],
  errors: [],
};

function limitItems<T>(items: T[], maxItems: number): T[] {
  return items.slice(Math.max(0, items.length - maxItems));
}

function sanitizeDetail(
  detail?: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!detail) return null;
  try {
    return JSON.parse(JSON.stringify(detail)) as Record<string, unknown>;
  } catch {
    return {
      unserializableDetail: String(detail),
    };
  }
}

function ensureSnapshot(): HomeRouteDiagSnapshot {
  if (typeof window === "undefined") {
    return {
      ...EMPTY_SNAPSHOT,
      events: [],
      errors: [],
    };
  }
  if (!window.__PAX_HOME_ROUTE_DIAG_LOG__) {
    window.__PAX_HOME_ROUTE_DIAG_LOG__ = {
      ...EMPTY_SNAPSHOT,
      events: [],
      errors: [],
    };
  }
  return window.__PAX_HOME_ROUTE_DIAG_LOG__;
}

function updateSnapshot(
  update: (snapshot: HomeRouteDiagSnapshot) => void,
): HomeRouteDiagSnapshot {
  const snapshot = ensureSnapshot();
  update(snapshot);
  return getHomeRouteDiagSnapshot();
}

function normalizeError(
  error: unknown,
): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || "Unknown error",
      stack: error.stack ?? null,
    };
  }
  if (typeof error === "string") {
    return {
      message: error,
      stack: null,
    };
  }
  return {
    message: String(error),
    stack: null,
  };
}

export function resetHomeRouteDiagnostics(): HomeRouteDiagSnapshot {
  if (typeof window !== "undefined") {
    window.__PAX_HOME_ROUTE_DIAG_LOG__ = {
      ...EMPTY_SNAPSHOT,
      events: [],
      errors: [],
    };
  }
  return getHomeRouteDiagSnapshot();
}

export function getHomeRouteDiagSnapshot(): HomeRouteDiagSnapshot {
  const snapshot = ensureSnapshot();
  return {
    lastUpdatedAt: snapshot.lastUpdatedAt,
    events: [...snapshot.events],
    errors: [...snapshot.errors],
  };
}

export function pushHomeRouteDiagEvent(
  kind: string,
  detail?: Record<string, unknown> | null,
): HomeRouteDiagSnapshot {
  const entry: HomeRouteDiagEvent = {
    at: new Date().toISOString(),
    kind,
    detail: sanitizeDetail(detail),
  };
  console.info("[HomeRoute]", kind, entry.detail ?? "");
  return updateSnapshot((snapshot) => {
    snapshot.events = limitItems([...snapshot.events, entry], MAX_EVENTS);
    snapshot.lastUpdatedAt = entry.at;
  });
}

export function pushHomeRouteDiagError(
  source: string,
  error: unknown,
  detail?: Record<string, unknown> | null,
): HomeRouteDiagSnapshot {
  const normalized = normalizeError(error);
  const sanitizedDetail = sanitizeDetail(detail);
  const resourceUrl =
    typeof sanitizedDetail?.resourceUrl === "string"
      ? sanitizedDetail.resourceUrl
      : null;
  const entry: HomeRouteDiagError = {
    at: new Date().toISOString(),
    source,
    message: normalized.message,
    stack: normalized.stack,
    resourceUrl,
    detail: sanitizedDetail,
  };
  console.error("[HomeRouteError]", source, normalized.message, {
    detail: sanitizedDetail,
    error,
  });
  return updateSnapshot((snapshot) => {
    snapshot.errors = limitItems([...snapshot.errors, entry], MAX_ERRORS);
    snapshot.lastUpdatedAt = entry.at;
  });
}

export function installHomeRouteGlobalErrorHandlers(
  onUpdate?: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleWindowError = (event: Event) => {
    if (event instanceof ErrorEvent) {
      pushHomeRouteDiagError("window.error", event.error ?? event.message, {
        filename: event.filename || null,
        lineno: event.lineno || null,
        colno: event.colno || null,
      });
      onUpdate?.();
      return;
    }

    const target = event.target;
    if (
      target instanceof HTMLScriptElement ||
      target instanceof HTMLLinkElement ||
      target instanceof HTMLImageElement
    ) {
      const resourceUrl =
        "src" in target && typeof target.src === "string" && target.src.length > 0
          ? target.src
          : "href" in target && typeof target.href === "string"
            ? target.href
            : null;
      pushHomeRouteDiagError(
        "resource.error",
        new Error(`Failed to load ${target.tagName.toLowerCase()} resource`),
        {
          tagName: target.tagName,
          resourceUrl,
        },
      );
      onUpdate?.();
    }
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    pushHomeRouteDiagError("unhandledrejection", event.reason, null);
    onUpdate?.();
  };

  window.addEventListener("error", handleWindowError, true);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleWindowError, true);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}
