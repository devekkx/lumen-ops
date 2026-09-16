/* The filter DSL.
 *
 * When filters must be composable, arrive from four different sources, and
 * serialise to a backend that understands operators, `?status=OPEN&severity=HIGH`
 * stops being enough: it cannot express OR, cannot express "is null", and cannot
 * say whether `severity=HIGH,MEDIUM` is one value or two.
 *
 * So each condition is a structured object instead. This file is the shape; the
 * builders are in @shared/utils/filters.
 */

/* Where a condition's operand came from. The backend does not care, but the app
   does: a CONTROL value is rebuilt when a form changes, a QUERY_PARAM one when
   the URL does, and a STATIC one never. */
export const AssignmentType = {
	STATIC: 'STATIC',
	CONTROL: 'CONTROL',
	QUERY_PARAM: 'QUERY_PARAM'
} as const;
export type AssignmentType = (typeof AssignmentType)[keyof typeof AssignmentType];

/* Match modes, grouped by the kind of operand they take. The grouping is not
   decoration - MODES_BY_OPERAND is what stops a filter UI from offering
   GT on a status string. */
export const MatchMode = {
	EQUAL: 'EQUAL',
	NOT_EQUAL: 'NOT_EQUAL',
	CONTAINS: 'CONTAINS',
	STARTS_WITH: 'STARTS_WITH',
	IN: 'IN',
	NOT_IN: 'NOT_IN',

	GT: 'GT',
	GTE: 'GTE',
	LT: 'LT',
	LTE: 'LTE',
	BETWEEN: 'BETWEEN',

	IS_NULL: 'IS_NULL',
	IS_NOT_NULL: 'IS_NOT_NULL'
} as const;
export type MatchMode = (typeof MatchMode)[keyof typeof MatchMode];

export const MODES_BY_OPERAND = Object.freeze({
	string: [
		MatchMode.EQUAL,
		MatchMode.NOT_EQUAL,
		MatchMode.CONTAINS,
		MatchMode.STARTS_WITH,
		MatchMode.IN,
		MatchMode.NOT_IN
	],
	number: [
		MatchMode.EQUAL,
		MatchMode.GT,
		MatchMode.GTE,
		MatchMode.LT,
		MatchMode.LTE,
		MatchMode.BETWEEN
	],
	null: [MatchMode.IS_NULL, MatchMode.IS_NOT_NULL]
}) satisfies Record<string, readonly MatchMode[]>;

export type FilterValue = string | number | boolean | (string | number)[];

export interface Operand {
	type: AssignmentType;
	value: FilterValue;
}

export interface Filter {
	leftHand: { type: AssignmentType; value: string };
	matchMode: MatchMode;
	/* Absent for IS_NULL and IS_NOT_NULL, which take no operand. */
	rightHand?: Operand;
	/* How this condition joins to the *next* one. On the last condition it is
	   meaningless, which is why it is optional rather than defaulted. */
	operator?: 'AND' | 'OR';
}

/* Nesting expresses precedence: an inner array is one parenthesised group. */
export type Filters = (Filter | Filter[])[];

/* Explicit sentinels for the null checks.
 *
 * This is the distinction the whole thing turns on. A plain null or '' means
 * "the user left this control empty" and must produce NO condition. Only these
 * sentinels ask the backend for a null check. Without them there is no way to
 * tell "don't filter on this" apart from "filter for absence", and conflating
 * the two shows the user the wrong records rather than an error. */
export const IS_NULL_SENTINEL = '__IS_NULL__';
export const IS_NOT_NULL_SENTINEL = '__IS_NOT_NULL__';

/* A half-open range is still a filter, so both ends are optional. */
export interface RangeValue {
	from?: string | number | null;
	to?: string | number | null;
}

export type FilterRecord = Record<
	string,
	FilterValue | RangeValue | null | undefined
>;
