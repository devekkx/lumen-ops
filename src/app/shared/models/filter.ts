export const AssignmentType = {
	STATIC: 'STATIC',
	CONTROL: 'CONTROL',
	QUERY_PARAM: 'QUERY_PARAM'
} as const;
export type AssignmentType = (typeof AssignmentType)[keyof typeof AssignmentType];

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
	rightHand?: Operand;
	operator?: 'AND' | 'OR';
}

export type Filters = (Filter | Filter[])[];

export const IS_NULL_SENTINEL = '__IS_NULL__';
export const IS_NOT_NULL_SENTINEL = '__IS_NOT_NULL__';

export interface RangeValue {
	from?: string | number | null;
	to?: string | number | null;
}

export type FilterRecord = Record<string, FilterValue | RangeValue | null | undefined>;
