import { HttpContext, HttpContextToken } from '@angular/common/http';

export const SKIP_RETRY = new HttpContextToken<boolean>(() => false);
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export interface ApiCallOptions {
	retry?: boolean;
	silent?: boolean;
}

export const contextFor = (options: ApiCallOptions = {}): HttpContext =>
	new HttpContext()
		.set(SKIP_RETRY, options.retry === false)
		.set(SKIP_ERROR_TOAST, options.silent === true);
