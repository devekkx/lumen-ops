import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, retry, throwError, timeout, timer } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SKIP_ERROR_TOAST, SKIP_RETRY } from './api-options';
import { ToastService, ToastTone } from './toast.service';

/* Comfortably above the mock API's randomised 300-900ms paged latency, so
   ordinary traffic never trips this - only the deliberate 4s
   /api/diagnostics/slow trap does. */
const REQUEST_TIMEOUT_MS = 15_000;

/* GET, HEAD and OPTIONS are the methods a client may repeat without changing
   server state. A retried POST could resubmit a form the user already saw
   fail or succeed once - a duplicate fault report is worse than the original
   error - so idempotence is checked structurally here, not left to a flag
   someone could get wrong per call site. */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/* Retrying a 4xx teaches the server nothing new - the same expired token or
   the same missing record comes back every time - so only a transient-looking
   failure (offline, or the server's own 5xx) is worth spending a retry on. */
const isRetryableStatus = (status: number) => status === 0 || status >= 500;

/* Bounded and backed off: two retries, waiting longer each time. */
const RETRY_COUNT = 2;
const retryDelay = (_error: unknown, attempt: number) => timer(300 * 2 ** (attempt - 1));

const KEY_BY_STATUS: Record<number, string> = {
	401: 'error.401',
	403: 'error.403',
	404: 'error.404',
	408: 'error.timeout',
	422: 'error.404',
	500: 'error.500',
	502: 'error.500',
	503: 'error.500'
};

const messageKeyFor = (error: unknown): string => {
	if (error instanceof HttpErrorResponse) {
		if (error.status === 0) return 'error.offline';
		return KEY_BY_STATUS[error.status] ?? 'error.500';
	}
	if (error instanceof Error && error.name === 'TimeoutError') return 'error.timeout';
	return 'error.500';
};

/* Maps a failed request to one translated, actionable toast and lets the
 * error keep propagating - a 401 still has to reach the auth flow, and a
 * caller with its own recovery (a form re-showing a field error) still needs
 * the rejection.
 *
 * A call site opts out of retry (SKIP_RETRY) or the toast (SKIP_ERROR_TOAST)
 * through its HttpContext rather than the interceptor guessing from the URL -
 * see api-options.ts for why login and a typeahead search both want that. */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
	const toast = inject(ToastService);
	const transloco = inject(TranslocoService);
	const auth = inject(AuthService);
	const router = inject(Router);

	const attempt$ = next(request).pipe(timeout(REQUEST_TIMEOUT_MS));

	const retryable = IDEMPOTENT_METHODS.has(request.method) && !request.context.get(SKIP_RETRY);
	const response$ = retryable
		? attempt$.pipe(
				retry({
					count: RETRY_COUNT,
					delay: (error: unknown, attempt: number) => {
						const status = error instanceof HttpErrorResponse ? error.status : 0;
						return isRetryableStatus(status) ? retryDelay(error, attempt) : throwError(() => error);
					}
				})
			)
		: attempt$;

	return response$.pipe(
		catchError((error: unknown) => {
			if (error instanceof HttpErrorResponse && error.status === 401) {
				auth.logout();
				void router.navigateByUrl('/auth/login');
			}

			if (!request.context.get(SKIP_ERROR_TOAST)) {
				const status = error instanceof HttpErrorResponse ? error.status : undefined;
				const tone: ToastTone = status === 401 || status === 403 ? 'attention' : 'critical';
				toast.show(transloco.translate(messageKeyFor(error)), tone);
			}

			return throwError(() => error);
		})
	);
};
