import { PUBLIC_SENTRY_URL } from "$env/static/public";
import * as Sentry from "@sentry/sveltekit";
import type { HandleServerError } from "@sveltejs/kit";

Sentry.init({
	dsn: PUBLIC_SENTRY_URL,
});

const myErrorHandler: HandleServerError = ({ error, event }) => {
	console.error("An error occurred on the server side:", error, event);
};

export const handleError = Sentry.handleErrorWithSentry(myErrorHandler);
// or alternatively, if you don't have a custom error handler:
// export const handleError = handleErrorWithSentry();

export const handle = Sentry.sentryHandle();
// Or use `sequence` if you're using your own handler(s):
// export const handle = sequence(Sentry.sentryHandle(), yourHandler());
