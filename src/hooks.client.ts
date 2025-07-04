import { PUBLIC_SENTRY_URL } from "$env/static/public";
import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit";

Sentry.init({
	dsn: PUBLIC_SENTRY_URL,
	integrations: [],
});

const myErrorHandler: HandleClientError = ({ error, event }) => {
	console.error("An error occurred on the client side:", error, event);
};

export const handleError = Sentry.handleErrorWithSentry(myErrorHandler);

// or alternatively, if you don't have a custom error handler:
// export const handleError = handleErrorWithSentry();
