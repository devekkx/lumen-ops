import { ErrorHandler, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

/* Catches anything that escapes a component, template, or an unsubscribed
   RxJS chain - Angular's own default ErrorHandler does nothing more than a
   bare `console.error(error)`, which leaves zero structured trace of what
   broke, when, or in what kind of failure (an HTTP error already surfaced
   through the interceptor's toast vs. a genuine unhandled bug).

   Deliberately minimal: this only logs, it does not render UI or rethrow.
   Doing more here (a toast, a redirect) risks a second failure inside the
   handler itself, on a browser potentially already in a broken state after
   whatever just threw. Its actual job is being the one seam a real
   error-tracking service (Sentry, etc.) plugs into later - call it below the
   existing console.error rather than replacing it. */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
	handleError(error: unknown): void {
		if (error instanceof HttpErrorResponse) {
			/* Already reported to the user via the toast the api-error
			   interceptor raised - this only adds the structured trace an
			   error-tracking service would want, not a second user-facing
			   message. */
			console.error('[HTTP]', error.status, error.url, error);
			return;
		}

		console.error('[Unhandled]', error);
	}
}
