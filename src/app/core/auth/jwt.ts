import { Role, SessionUser, TokenPayload } from './auth.models';

/* Our own base64url decode rather than a library — it is eight lines, and
   exercise 2.1 is explicit that you should know what is inside a token.
   The `%xx` round-trip is what makes it UTF-8 safe: `atob` yields bytes, and
   a Spanish name with an accent in it decodes to mojibake without this. */
export const base64UrlDecode = (input: string): string => {
	let normalised = String(input).replace(/-/g, '+').replace(/_/g, '/');
	while (normalised.length % 4) normalised += '=';

	const bytes = atob(normalised);
	let encoded = '';
	for (let index = 0; index < bytes.length; index++) {
		encoded += `%${`00${bytes.charCodeAt(index).toString(16)}`.slice(-2)}`;
	}
	return decodeURIComponent(encoded);
};

export const decodeToken = (token: string | null): TokenPayload | null => {
	if (!token) return null;

	const parts = token.split('.');
	if (parts.length !== 3) return null;

	try {
		return JSON.parse(base64UrlDecode(parts[1])) as TokenPayload;
	} catch {
		return null;
	}
};

export const isExpired = (payload: TokenPayload | null, now = Date.now()): boolean =>
	!payload?.exp || payload.exp * 1000 <= now;

export interface SessionResult {
	user: SessionUser | null;
	reason: 'MALFORMED' | 'EXPIRED' | null;
}

/* `now` is a parameter so expiry is testable without waiting an hour or
   stubbing the clock globally. */
export const userFromToken = (token: string | null, now = Date.now()): SessionResult => {
	const payload = decodeToken(token);
	if (!payload) return { user: null, reason: 'MALFORMED' };
	if (isExpired(payload, now)) return { user: null, reason: 'EXPIRED' };

	return {
		user: {
			id: payload.sub,
			name: payload.name,
			email: payload.email,
			org: payload.org,
			roles: (payload.roles ?? []) as Role[],
			exp: payload.exp
		},
		reason: null
	};
};
