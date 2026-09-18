import {
	AssignmentType,
	Filter,
	FilterRecord,
	FilterValue,
	Filters,
	IS_NOT_NULL_SENTINEL,
	IS_NULL_SENTINEL,
	MatchMode,
	Operand,
	RangeValue
} from '../models/filter';

/* "The user left this control empty", in every shape a form can express it.
 *
 * An object counts as blank when all of its own values are blank, which is what
 * makes an untouched `{ from: null, to: null }` range produce no condition. */
export const isBlank = (value: unknown): boolean => {
	if (value === null || value === undefined || value === '') return true;
	if (Array.isArray(value)) return value.length === 0;
	if (value instanceof Date) return false;
	if (typeof value === 'object') {
		return Object.values(value as object).every(
			(entry) => entry === null || entry === undefined || entry === ''
		);
	}
	return false;
};

export interface ConditionOptions {
	type?: AssignmentType;
	operator?: 'AND' | 'OR';
}

export const condition = (
	property: string,
	matchMode: MatchMode,
	value?: FilterValue,
	options: ConditionOptions = {}
): Filter => {
	const filter: Filter = {
		leftHand: { type: AssignmentType.STATIC, value: property },
		matchMode
	};

	if (matchMode !== MatchMode.IS_NULL && matchMode !== MatchMode.IS_NOT_NULL) {
		filter.rightHand = {
			type: options.type ?? AssignmentType.CONTROL,
			value: value as FilterValue
		} satisfies Operand;
	}

	if (options.operator) filter.operator = options.operator;
	return filter;
};

export interface BuildOptions {
	overrides?: Record<string, MatchMode>;
	type?: AssignmentType;
}

const conditionsForEntry = (
	key: string,
	raw: FilterRecord[string],
	overrides: Record<string, MatchMode>,
	type: AssignmentType
): Filter[] => {
	if (raw === IS_NULL_SENTINEL) return [condition(key, MatchMode.IS_NULL)];
	if (raw === IS_NOT_NULL_SENTINEL) return [condition(key, MatchMode.IS_NOT_NULL)];

	if (isBlank(raw)) return [];

	const override = overrides[key];
	if (override) return [condition(key, override, raw as FilterValue, { type })];

	if (Array.isArray(raw)) return [condition(key, MatchMode.IN, raw, { type })];
	if (typeof raw === 'number' || typeof raw === 'boolean') {
		return [condition(key, MatchMode.EQUAL, raw, { type })];
	}

	if (typeof raw === 'object') {
		const range = raw as RangeValue;
		const conditions: Filter[] = [];
		if (!isBlank(range.from)) {
			conditions.push(condition(key, MatchMode.GTE, range.from as FilterValue, { type }));
		}
		if (!isBlank(range.to)) {
			conditions.push(condition(key, MatchMode.LTE, range.to as FilterValue, { type }));
		}
		return conditions;
	}

	return [condition(key, MatchMode.CONTAINS, String(raw), { type })];
};

export const buildFilterConditions = (
	record: FilterRecord | null | undefined,
	options: BuildOptions = {}
): Filters => {
	const { overrides = {}, type = AssignmentType.CONTROL } = options;
	const filters = Object.entries(record ?? {}).flatMap(([key, raw]) =>
		conditionsForEntry(key, raw, overrides, type)
	);

	return filters.map((filter, index) =>
		index < filters.length - 1 ? { ...filter, operator: filter.operator ?? 'AND' } : filter
	);
};

export interface FlatFilter extends Filter {
	depth: number;
}

/* Nesting expresses precedence; flatten for logging, for the DSL inspector and
   for specs, keeping the depth so a group is still visible in the output. */
export const flattenFilters = (filters: Filters | null | undefined, depth = 0): FlatFilter[] => {
	const out: FlatFilter[] = [];
	for (const entry of filters ?? []) {
		if (Array.isArray(entry)) out.push(...flattenFilters(entry, depth + 1));
		else out.push({ ...entry, depth });
	}
	return out;
};

/* A human-readable one-liner for the inspector panel the canvas shows. */
export const describeFilter = (filter: Filter): string => {
	const right = filter.rightHand?.value;
	const value = Array.isArray(right) ? `[${right.join(', ')}]` : String(right ?? '');
	const operand = filter.rightHand ? ` ${value}` : '';
	const chain = filter.operator ? ` ${filter.operator}` : '';
	return `${filter.leftHand.value} ${filter.matchMode}${operand}${chain}`;
};

/* Groups a run of conditions into one OR set - the nesting the evaluator reads
   as parenthesised. */
export const orGroup = (...conditions: Filter[]): Filter[] =>
	conditions.map((filter, index) =>
		index < conditions.length - 1 ? { ...filter, operator: 'OR' } : filter
	);
