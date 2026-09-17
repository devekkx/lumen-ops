import { HttpParams } from '@angular/common/http';

export type HttpParamsInput = Record<
	string,
	string | number | boolean | readonly (string | number)[] | null | undefined
>;

/* HttpParams is immutable: .set() and .append() each return a new instance
   rather than mutating the receiver. Building one with reduce forces every
   intermediate value to be captured as the accumulator, which is exactly the
   discipline `Object.assign(params, { [key]: value })` cannot enforce -
   HttpParams keeps its entries in a private, read-only map, so assigning onto
   the instance changes nothing and the key is silently missing downstream. */
export const buildHttpParams = (input?: HttpParamsInput): HttpParams =>
	Object.entries(input ?? {}).reduce((params, [key, value]) => {
		if (value === null || value === undefined) return params;
		if (Array.isArray(value)) {
			return value.reduce((withEntry, entry) => withEntry.append(key, String(entry)), params);
		}
		return params.set(key, String(value));
	}, new HttpParams());
