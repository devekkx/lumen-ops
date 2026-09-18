import { base64UrlDecode, decodeToken, isExpired, userFromToken } from './jwt';

/* Builds a token the way the mock does, so the spec exercises the same shape
   the app will actually receive. unescape(encodeURIComponent(x)) is the
   classic UTF-8-safe-base64 idiom, but unescape itself is deprecated - this
   percent-decodes the same %XX output by hand instead, which is all unescape
   ever did here. */
const encode = (value: object) =>
	btoa(
		encodeURIComponent(JSON.stringify(value)).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
			String.fromCharCode(parseInt(hex, 16))
		)
	)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replaceAll('=', '');

const tokenFor = (payload: object) => `${encode({ alg: 'HS256' })}.${encode(payload)}.sig`;

const NOW = Date.UTC(2026, 8, 15, 9, 0, 0);
const payload = (overrides: object = {}) => ({
	sub: 'u-council',
	name: 'Marta Gil Soler',
	email: 'ayto@lumen.madrid',
	org: 'Área de Obras y Equipamientos',
	roles: ['COUNCIL'],
	exp: Math.floor(NOW / 1000) + 3600,
	...overrides
});

describe('jwt', () => {
	it('decodes base64url without padding', () => {
		expect(base64UrlDecode(encode({ a: 1 }))).toBe('{"a":1}');
	});

	/* atob yields bytes, so a Spanish name comes back as mojibake without the
	   percent-encoding round-trip. This is the reason that loop exists. */
	it('survives non-ASCII payloads', () => {
		const decoded = decodeToken(tokenFor(payload()));
		expect(decoded?.org).toBe('Área de Obras y Equipamientos');
	});

	it('rejects a token that is not three segments', () => {
		expect(decodeToken('only.two')).toBeNull();
		expect(decodeToken('a.b.c.d')).toBeNull();
		expect(decodeToken(null)).toBeNull();
	});

	it('rejects a payload that is not JSON', () => {
		expect(decodeToken('aaa.not-base64-json.sig')).toBeNull();
	});

	it('treats a missing exp as expired rather than eternal', () => {
		expect(isExpired({ ...payload(), exp: undefined } as never, NOW)).toBe(true);
	});

	it('reports MALFORMED and EXPIRED differently', () => {
		expect(userFromToken('rubbish', NOW).reason).toBe('MALFORMED');
		const stale = tokenFor(payload({ exp: Math.floor(NOW / 1000) - 1 }));
		expect(userFromToken(stale, NOW).reason).toBe('EXPIRED');
	});

	it('maps a valid payload onto the session user', () => {
		const { user, reason } = userFromToken(tokenFor(payload()), NOW);
		expect(reason).toBeNull();
		expect(user).toEqual({
			id: 'u-council',
			name: 'Marta Gil Soler',
			email: 'ayto@lumen.madrid',
			org: 'Área de Obras y Equipamientos',
			roles: ['COUNCIL'],
			exp: Math.floor(NOW / 1000) + 3600
		});
	});

	it('expires exactly at exp, not a second after', () => {
		const exp = Math.floor(NOW / 1000);
		expect(isExpired({ ...payload(), exp } as never, exp * 1000)).toBe(true);
		expect(isExpired({ ...payload(), exp } as never, exp * 1000 - 1)).toBe(false);
	});
});
