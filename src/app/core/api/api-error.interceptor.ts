import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, retry, throwError, timeout, timer } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SKIP_ERROR_TOAST, SKIP_RETRY } from './api-options';
import { ToastService, ToastTone } from './toast.service';

const REQUEST_TIMEOUT_MS = 15_000;
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const isRetryableStatus = (status: number) => status === 0 || status >= 500;

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
