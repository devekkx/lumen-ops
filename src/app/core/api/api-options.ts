import { HttpContext, HttpContextToken } from '@angular/common/http';

/* Two escape hatches the generic error interceptor reads off the request
   itself, so a call site opts out declaratively rather than the interceptor
   guessing from the URL. */
export const SKIP_RETRY = new HttpContextToken<boolean>(() => false);
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export interface ApiCallOptions {
	/* A typeahead search superseded by the next keystroke should not multiply
	   into three requests once the first one is already stale. */
	retry?: boolean;
	/* A form with its own inline error — login rejecting a bad password — does
	   not also want the generic toast restating the same failure. */
	silent?: boolean;
}

export const contextFor = (options: ApiCallOptions = {}): HttpContext =>
	new HttpContext()
		.set(SKIP_RETRY, options.retry === false)
		.set(SKIP_ERROR_TOAST, options.silent === true);
