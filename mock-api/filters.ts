/* The server side of the filter DSL (exercise 3.2).
 *
 * The evaluator lives here as well as in the app because the contract is the
 * payload, not shared code: a real backend implements this independently, and
 * implementing it twice is what proves the format is actually specified.
 */

export type AssignmentType = 'STATIC' | 'CONTROL' | 'QUERY_PARAM';

export type MatchMode =
	| 'EQUAL'
	| 'NOT_EQUAL'
	| 'CONTAINS'
	| 'STARTS_WITH'
	| 'IN'
	| 'NOT_IN'
	| 'GT'
	| 'GTE'
	| 'LT'
	| 'LTE'
	| 'BETWEEN'
	| 'IS_NULL'
	| 'IS_NOT_NULL';

export interface Filter {
	leftHand: { type: AssignmentType; value: string };
	matchMode: MatchMode;
	rightHand?: { type: AssignmentType; value: unknown };
	operator?: 'AND' | 'OR';
}

/* Nesting expresses precedence. */
export type Filters = Array<Filter | Filter[]>;

const read = (item: unknown, path: string): unknown =>
	String(path)
		.split('.')
		.reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), item);

/* An ISO date string compares as a number so GTE/LTE work on dates without the
   caller having to say which it is. */
const asNumber = (value: unknown): number => {
	if (value instanceof Date) return value.getTime();
	if (typeof value === 'string') {
		const parsed = Date.parse(value);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return Number(value);
};

const lower = (value: unknown) => String(value ?? '').toLowerCase();
const asArray = (value: unknown) => (Array.isArray(value) ? value : [value]).map(String);
const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

/* A condition whose operand the user never filled in.
 *
 * The app's buildFilterConditions already drops these before serialising, so in
 * normal use none arrive. The server drops them too, deliberately: `IN []`
 * evaluated literally means "in the empty set" and silently returns zero rows,
 * which is the failure the brief singles out as the worst kind - the user is
 * shown the wrong records rather than an error. Two independent
 * implementations of the same rule is the point, not duplication. */
const isInert = (filter: Filter): boolean => {
	if (filter.matchMode === 'IS_NULL' || filter.matchMode === 'IS_NOT_NULL') return false;
	if (!filter.rightHand) return true;

	const value = filter.rightHand.value;
	if (value === null || value === undefined || value === '') return true;
	if (Array.isArray(value)) return value.length === 0;
	return false;
};

const evaluateCondition = (item: unknown, filter: Filter): boolean => {
	const left = read(item, filter.leftHand.value);
	const right = filter.rightHand ? filter.rightHand.value : undefined;

	switch (filter.matchMode) {
		case 'EQUAL':
			return String(left) === String(right);
		case 'NOT_EQUAL':
			return String(left) !== String(right);
		case 'CONTAINS':
			return lower(left).includes(lower(right));
		case 'STARTS_WITH':
			return lower(left).startsWith(lower(right));
		case 'IN':
			return asArray(right).includes(String(left));
		case 'NOT_IN':
			return !asArray(right).includes(String(left));
		case 'GT':
			return asNumber(left) > asNumber(right);
		case 'GTE':
			return asNumber(left) >= asNumber(right);
		case 'LT':
			return asNumber(left) < asNumber(right);
		case 'LTE':
			return asNumber(left) <= asNumber(right);
		case 'BETWEEN': {
			const [from, to] = right as [unknown, unknown];
			return asNumber(left) >= asNumber(from) && asNumber(left) <= asNumber(to);
		}
		case 'IS_NULL':
			return isEmpty(left);
		case 'IS_NOT_NULL':
			return !isEmpty(left);
		default:
			return true;
	}
};

/* OR binds tighter than AND, as in SQL: a run of OR-chained conditions forms
   one group, and every group must hold. An operator on a condition describes
   how it joins to the *next* one, which is why the group breaks on AND. */
export const evaluateFilters = (item: unknown, filters?: Filters): boolean => {
	if (!filters?.length) return true;

	/* Inert conditions are removed before grouping, not evaluated as false -
	   otherwise an unfilled control would still break the AND/OR chain it sits
	   in. A group left empty by this is satisfied, not failed. */
	const live = filters.filter((entry) => (Array.isArray(entry) ? entry.length > 0 : !isInert(entry)));
	if (!live.length) return true;

	const terms = live.map((entry) => {
		if (Array.isArray(entry)) {
			const last = entry[entry.length - 1] ?? ({} as Filter);
			return { value: evaluateFilters(item, entry), operator: last.operator ?? 'AND' };
		}
		return { value: evaluateCondition(item, entry), operator: entry.operator ?? 'AND' };
	});

	const groups: boolean[][] = [[]];
	terms.forEach((term, index) => {
		groups[groups.length - 1].push(term.value);
		if (term.operator === 'AND' && index < terms.length - 1) groups.push([]);
	});

	return groups.every((group) => !group.length || group.some(Boolean));
};

export const matchesSearch = (
	item: unknown,
	searchTerm?: string,
	searchKeys?: readonly string[]
): boolean => {
	const needle = String(searchTerm ?? '')
		.trim()
		.toLowerCase();
	if (!needle) return true;

	const keys = searchKeys?.length ? searchKeys : Object.keys(item as object);
	return keys.some((key) => lower(read(item, key)).includes(needle));
};
