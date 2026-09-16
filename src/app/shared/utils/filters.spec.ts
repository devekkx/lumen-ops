import {
	AssignmentType,
	IS_NOT_NULL_SENTINEL,
	IS_NULL_SENTINEL,
	MatchMode
} from '../models/filter';
import {
	buildFilterConditions,
	condition,
	describeFilter,
	flattenFilters,
	isBlank,
	orGroup
} from './filters';

describe('isBlank', () => {
	it('treats null, undefined and the empty string as blank', () => {
		expect(isBlank(null)).toBe(true);
		expect(isBlank(undefined)).toBe(true);
		expect(isBlank('')).toBe(true);
	});

	it('treats an empty array as blank but a populated one as not', () => {
		expect(isBlank([])).toBe(true);
		expect(isBlank(['HIGH'])).toBe(false);
	});

	it('treats an object as blank only when every one of its own values is', () => {
		expect(isBlank({ from: null, to: null })).toBe(true);
		expect(isBlank({ from: '2020-01-01', to: null })).toBe(false);
	});

	it('never treats a Date as blank, even though it is an object', () => {
		expect(isBlank(new Date())).toBe(false);
	});

	it('treats zero, false and non-empty strings as present', () => {
		expect(isBlank(0)).toBe(false);
		expect(isBlank(false)).toBe(false);
		expect(isBlank('mayor')).toBe(false);
	});
});

describe('condition', () => {
	it('builds a STATIC left-hand side and a CONTROL right-hand side by default', () => {
		const filter = condition('lampType', MatchMode.EQUAL, 'LED');

		expect(filter.leftHand).toEqual({ type: AssignmentType.STATIC, value: 'lampType' });
		expect(filter.rightHand).toEqual({ type: AssignmentType.CONTROL, value: 'LED' });
		expect(filter.operator).toBeUndefined();
	});

	it('omits rightHand entirely for IS_NULL and IS_NOT_NULL rather than sending an empty operand', () => {
		expect(condition('trap', MatchMode.IS_NULL).rightHand).toBeUndefined();
		expect(condition('trap', MatchMode.IS_NOT_NULL).rightHand).toBeUndefined();
	});
});

describe('buildFilterConditions', () => {
	/* The exact case named in the brief: a form producing a mixed record must
	   choose CONTAINS for a string, IN for an array, and drop nothing that was
	   actually filled in. */
	it("chooses a match mode from each value's runtime type", () => {
		const filters = buildFilterConditions({
			status: 'OPEN',
			severity: ['HIGH', 'MEDIUM'],
			street: 'mayor'
		}) as { leftHand: { value: string }; matchMode: string; rightHand?: { value: unknown } }[];

		const byKey = Object.fromEntries(filters.map((filter) => [filter.leftHand.value, filter]));

		expect(byKey['status'].matchMode).toBe(MatchMode.CONTAINS);
		expect(byKey['severity'].matchMode).toBe(MatchMode.IN);
		expect(byKey['severity'].rightHand?.value).toEqual(['HIGH', 'MEDIUM']);
		expect(byKey['street'].matchMode).toBe(MatchMode.CONTAINS);
	});

	it('chooses EQUAL for numbers and booleans rather than CONTAINS', () => {
		const filters = buildFilterConditions({ wattage: 24, active: true });
		expect(
			filters.every((filter) => !Array.isArray(filter) && filter.matchMode === MatchMode.EQUAL)
		).toBe(true);
	});

	it('splits a range into GTE and LTE, never a single BETWEEN', () => {
		const filters = buildFilterConditions({
			installedAt: { from: '2020-01-01', to: '2020-12-31' }
		}) as { matchMode: string }[];

		expect(filters.map((filter) => filter.matchMode)).toEqual([MatchMode.GTE, MatchMode.LTE]);
	});

	it('keeps a half-open range: only the filled end produces a condition', () => {
		const filters = buildFilterConditions({
			installedAt: { from: '2020-01-01', to: null }
		}) as {
			matchMode: string;
		}[];

		expect(filters).toHaveSize(1);
		expect(filters[0].matchMode).toBe(MatchMode.GTE);
	});

	it('reads the null sentinels as IS_NULL and IS_NOT_NULL rather than as literal values', () => {
		const filters = buildFilterConditions({
			trap: IS_NULL_SENTINEL,
			zoneId: IS_NOT_NULL_SENTINEL
		}) as {
			matchMode: string;
		}[];

		expect(filters.map((filter) => filter.matchMode).sort()).toEqual(
			[MatchMode.IS_NOT_NULL, MatchMode.IS_NULL].sort()
		);
	});

	/* The brief's worst-failure-mode case: an unfilled control must vanish
	   entirely rather than become a condition that matches nothing. */
	it('produces no condition at all for null, undefined or an empty array', () => {
		const filters = buildFilterConditions({
			status: null,
			zoneId: undefined,
			severity: [],
			street: ''
		});

		expect(filters).toHaveSize(0);
	});

	it('honours an explicit override for a key whose default mode would be wrong', () => {
		const filters = buildFilterConditions(
			{ code: 'LUM-0001' },
			{ overrides: { code: MatchMode.EQUAL } }
		) as { matchMode: string }[];

		expect(filters[0].matchMode).toBe(MatchMode.EQUAL);
	});

	it('chains every condition but the last with AND', () => {
		const filters = buildFilterConditions({ status: 'OPEN', lampType: 'LED' }) as {
			operator?: string;
		}[];

		expect(filters[0].operator).toBe('AND');
		expect(filters.at(-1)?.operator).toBeUndefined();
	});
});

describe('orGroup and flattenFilters', () => {
	it('chains an OR group and nests it one level inside an AND chain', () => {
		const openOrCritical = orGroup(
			condition('status', MatchMode.EQUAL, 'FAULT'),
			condition('status', MatchMode.EQUAL, 'MAINTENANCE')
		);
		const filters = [openOrCritical, condition('lampType', MatchMode.EQUAL, 'LED')];

		const flat = flattenFilters(filters);

		expect(flat).toHaveSize(3);
		expect(flat[0].depth).toBe(1);
		expect(flat[0].operator).toBe('OR');
		expect(flat[1].depth).toBe(1);
		expect(flat[1].operator).toBeUndefined();
		expect(flat[2].depth).toBe(0);
	});
});

describe('describeFilter', () => {
	it('renders an array operand as a bracketed list', () => {
		expect(describeFilter(condition('status', MatchMode.IN, ['FAULT', 'MAINTENANCE']))).toBe(
			'status IN [FAULT, MAINTENANCE]'
		);
	});

	it('renders a null-check condition with no operand at all', () => {
		expect(describeFilter(condition('trap', MatchMode.IS_NOT_NULL))).toBe('trap IS_NOT_NULL');
	});
});
