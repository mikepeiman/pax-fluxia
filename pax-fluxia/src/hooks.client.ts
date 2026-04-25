import type { HandleClientError } from "@sveltejs/kit";
import { pushHomeRouteDiagError } from "$lib/utils/homeRouteDiagnostics";

export const init = async () => {};

export const handleError: HandleClientError = ({
  error,
  event,
  status,
  message,
}) => {
  const detail = {
    url: event.url.toString(),
    routeId: event.route.id ?? null,
    status,
    message,
  };
  console.error("[SvelteKit client error]", detail, error);
  pushHomeRouteDiagError("sveltekit.client", error, detail);
  return {
    message,
  };
};
