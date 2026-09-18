import { ErrorHandler, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
	public handleError(error: unknown): void {
		if (error instanceof HttpErrorResponse) {
			console.error('[HTTP]', error.status, error.url, error);
			return;
		}

		console.error('[Unhandled]', error);
	}
}
