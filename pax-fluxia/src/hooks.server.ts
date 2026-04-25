import type { HandleServerError } from "@sveltejs/kit";

export const handleError: HandleServerError = ({
  error,
  event,
  status,
  message,
}) => {
  console.error("[SvelteKit server error]", {
    url: event.url.toString(),
    routeId: event.route.id ?? null,
    status,
    message,
    error,
  });

  return {
    message,
  };
};
