import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiCallOptions, contextFor } from './api-options';
import { HttpParamsInput, buildHttpParams } from './http-params';

/* The one place HttpClient is called directly. Every method is generic and
   defaults to `unknown` rather than `any`, so a caller that forgets to name
   the response shape gets a type it has to narrow instead of one that lets
   anything through silently. */
@Injectable({ providedIn: 'root' })
export class ApiService {
	private readonly _http = inject(HttpClient);

	get<T = unknown>(
		path: string,
		params?: HttpParamsInput,
		options?: ApiCallOptions
	): Observable<T> {
		return this._http.get<T>(path, {
			params: buildHttpParams(params),
			context: contextFor(options)
		});
	}

	post<T = unknown>(
		path: string,
		body: unknown,
		params?: HttpParamsInput,
		options?: ApiCallOptions
	): Observable<T> {
		return this._http.post<T>(path, body, {
			params: buildHttpParams(params),
			context: contextFor(options)
		});
	}

	put<T = unknown>(
		path: string,
		body: unknown,
		params?: HttpParamsInput,
		options?: ApiCallOptions
	): Observable<T> {
		return this._http.put<T>(path, body, {
			params: buildHttpParams(params),
			context: contextFor(options)
		});
	}

	patch<T = unknown>(
		path: string,
		body: unknown,
		params?: HttpParamsInput,
		options?: ApiCallOptions
	): Observable<T> {
		return this._http.patch<T>(path, body, {
			params: buildHttpParams(params),
			context: contextFor(options)
		});
	}

	delete<T = unknown>(
		path: string,
		params?: HttpParamsInput,
		options?: ApiCallOptions
	): Observable<T> {
		return this._http.delete<T>(path, {
			params: buildHttpParams(params),
			context: contextFor(options)
		});
	}

	/* The export path from exercise 5.3 reads a file rather than JSON, so it
	   needs its own response type rather than a generic that defaults wrong. */
	getBlob(path: string, params?: HttpParamsInput, options?: ApiCallOptions): Observable<Blob> {
		return this._http.get(path, {
			params: buildHttpParams(params),
			context: contextFor(options),
			responseType: 'blob'
		});
	}
}
