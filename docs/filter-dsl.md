# The filter DSL

`?status=OPEN&severity=HIGH` is enough for a query string right up until a
filter needs to say "or", needs to say "is null", or needs to carry
`severity=HIGH,MEDIUM` as one value rather than two. At that point every
condition has to become a structured object instead of a URL fragment, which
is what `src/app/shared/models/filter.ts` defines and
`src/app/shared/utils/filters.ts` builds.

## The shape

```ts
type Filters = Array<Filter | Filter[]>; // nesting expresses precedence

interface Filter {
	leftHand: { type: AssignmentType; value: string };
	matchMode: MatchMode; // EQUAL, CONTAINS, GT, IN, IS_NULL, ...
	rightHand?: { type: AssignmentType; value: FilterValue }; // absent for IS_NULL / IS_NOT_NULL
	operator?: 'AND' | 'OR'; // how THIS condition joins to the NEXT one
}
```

Two things read as odd on first contact and are both deliberate:

- **`operator` describes the join to the *next* condition, not to itself.**
  A run of `OR`-joined conditions forms one group, and the group only breaks
  when an `operator` says `AND`. This is also why the last condition in a
  chain never needs an `operator` at all — there is no next condition to join
  to.
- **`AssignmentType` exists because the backend does not care where a value
  came from, but the app does.** A `CONTROL` value gets rebuilt whenever a
  form control changes; a `QUERY_PARAM` one, whenever the URL does; a
  `STATIC` one never changes on its own. Three sources, one wire format.

**OR binds tighter than AND**, exactly as in SQL: nesting one array inside the
top-level `Filters` array groups those conditions and the whole group is
evaluated as a unit against whatever comes before and after it.

## Building conditions from a form

Nobody hand-writes `Filter` objects. `buildFilterConditions(record)` takes a
flat object of form values — the shape a reactive form's `.value` already is —
and picks the match mode from each value's runtime type:

| Value shape | Match mode | Example |
| --- | --- | --- |
| `string` | `CONTAINS` | a text box is a search box |
| `string[]` / `number[]` | `IN` | a multi-select is a set |
| `number` / `boolean` | `EQUAL` | a number box wants an exact value |
| `{ from, to }` | `GTE` + `LTE` | two conditions, never one `BETWEEN` |
| `IS_NULL_SENTINEL` / `IS_NOT_NULL_SENTINEL` | `IS_NULL` / `IS_NOT_NULL` | an explicit null check |

A range becomes two chained conditions rather than a single `BETWEEN` on
purpose: `BETWEEN` needs both ends, and "installed after 2020, no upper bound"
is an ordinary half-open request that a single `BETWEEN` condition cannot
express.

```ts
buildFilterConditions({
	status: 'OPEN',
	severity: ['HIGH', 'MEDIUM'],
	street: 'mayor'
});
// [
//   { leftHand: { value: 'status' },   matchMode: 'CONTAINS', rightHand: { value: 'OPEN' },              operator: 'AND' },
//   { leftHand: { value: 'severity' }, matchMode: 'IN',       rightHand: { value: ['HIGH', 'MEDIUM'] },  operator: 'AND' },
//   { leftHand: { value: 'street' },   matchMode: 'CONTAINS', rightHand: { value: 'mayor' } }
// ]
```

An `overrides` map pins the match mode for a key whose type-driven default
would be wrong — a code field that should be `EQUAL` rather than the
`CONTAINS` a string otherwise gets.

## Inert conditions are dropped, not evaluated

This is the single most important rule in the file, and the one the brief
calls out as the worst failure mode if it is missed.

An unfilled control produces a blank value: `null`, `undefined`, `''`, or
`[]`. Evaluated literally, `IN []` means "in the empty set" and returns **zero
rows** — the user sees an empty table and has no way to tell that from a
filter that genuinely matched nothing. `buildFilterConditions` checks
`isBlank()` before building a condition at all, so an untouched filter panel
contributes no condition, not a condition that matches nothing.

`isBlank` treats an object as blank only when every one of its own values is,
which is what lets an untouched `{ from: null, to: null }` range disappear
entirely while `{ from: '2020-01-01', to: null }` still produces a `GTE`.

## Nesting, flattened back out

`flattenFilters()` walks the nested `Filters` structure and returns every
condition with a `depth`, for the places that need a flat view of a
potentially-grouped filter set: the DSL inspector panel, logging, and specs.
`orGroup(...conditions)` is the matching helper for building a nested OR
group — it chains every condition but the last with `'OR'` the same way
`buildFilterConditions` chains flat conditions with `'AND'`.

```ts
const openOrMaintenance = orGroup(
	condition('status', MatchMode.EQUAL, 'FAULT'),
	condition('status', MatchMode.EQUAL, 'MAINTENANCE')
);

const filters = [openOrMaintenance, condition('lampType', MatchMode.EQUAL, 'LED')];
// (status = FAULT OR status = MAINTENANCE) AND lampType = LED
```

## Where it is evaluated

The evaluator lives in `mock-api/filters.ts`, not in the Angular app — on
purpose. The contract is the wire payload, not shared code; a real backend
implements the same format independently, and implementing it twice is what
proves the format is actually specified rather than merely agreed with itself.
`docs/mock-api.md` has the evaluator's verified behaviour, including the two
61-row cases that confirm a nested OR group and a flat `IN` list produce
identical results for the same predicate.
