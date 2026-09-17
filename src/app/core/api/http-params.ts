import { HttpParams } from '@angular/common/http';

export type HttpParamsInput = Record<
	string,
	string | number | boolean | readonly (string | number)[] | null | undefined
>;

export const buildHttpParams = (input?: HttpParamsInput): HttpParams =>
	Object.entries(input ?? {}).reduce((params, [key, value]) => {
		if (value === null || value === undefined) return params;
		if (Array.isArray(value)) {
			return value.reduce((withEntry, entry) => withEntry.append(key, String(entry)), params);
		}
		return params.set(key, String(value));
	}, new HttpParams());
