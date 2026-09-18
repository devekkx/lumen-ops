import { buildHttpParams } from './http-params';

describe('buildHttpParams', () => {
	it('carries every provided key into the result', () => {
		const params = buildHttpParams({ page: 1, searchTerm: 'mayor', active: true });

		expect(params.get('page')).toBe('1');
		expect(params.get('searchTerm')).toBe('mayor');
		expect(params.get('active')).toBe('true');
	});

	it('drops null and undefined values rather than stringifying them', () => {
		const params = buildHttpParams({ zone: null, street: undefined, code: 'LUM-0001' });

		expect(params.has('zone')).toBe(false);
		expect(params.has('street')).toBe(false);
		expect(params.get('code')).toBe('LUM-0001');
	});

	it('appends every entry of an array under the same key rather than joining them', () => {
		const params = buildHttpParams({ status: ['FAULT', 'MAINTENANCE'] });

		expect(params.getAll('status')).toEqual(['FAULT', 'MAINTENANCE']);
	});

	it('returns an empty params object for no input at all', () => {
		expect(buildHttpParams().keys()).toHaveSize(0);
	});

	/* HttpParams.set returns a new instance rather than mutating the receiver -
	   the exact property that makes Object.assign the wrong tool here. A reduce
	   that forgot to use the returned instance as its accumulator would leave
	   every key but the last missing from the final params. */
	it('keeps every key when several are set in sequence', () => {
		const params = buildHttpParams({ a: 1, b: 2, c: 3 });

		expect(params.keys().sort((first, second) => first.localeCompare(second))).toEqual([
			'a',
			'b',
			'c'
		]);
	});
});
