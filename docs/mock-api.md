# The mock API

I did not build this as throwaway scaffolding. The pagination envelope and
the filter payload here are the contract every later exercise of mine
consumes, and I copied them from the real backend's shape - including the
parts that look odd to a first-time reader.

## The envelope

```ts
// POST /api/luminaires/paged
// request
{
  page: 1,              // one-based
  perPage: 20,
  searchTerm: 'calle mayor',
  searchKeys: ['code', 'street', 'zone'],
  ordination: { property: 'code', direction: 'ASC' },
  filters: []           // the DSL, below
}
// response
{ data: [ ... ], currentPage: 1, lastPage: 30, total: 600, perPage: 20 }
```

`POST` for a read is not a mistake on my part - the filter DSL does not fit
in a query string, which is the whole reason it exists. `ordination` rather
than `sort`, and one-based `page`, are the real backend's spelling, and I
kept them as they are rather than tidying them up to my own taste.

One route serves all four collections (`luminaires`, `faults`, `work-orders`,
`crews`), because the envelope is the point for me: every table in the app
funnels through the same shape.

## Layout

| File | Holds |
| --- | --- |
| `seed.ts` | The deterministic dataset and its types |
| `filters.ts` | The DSL evaluator and search matcher |
| `auth.ts` | Four seeded users, JWT-shaped token signing |
| `energy.ts` | The hourly consumption model and dashboard aggregation |
| `server.ts` | Express routes |

## Deterministic on purpose

I use a fixed PRNG seed (`mulberry32`, seed `20260915`), so the 600
luminaires, their statuses and their 400 faults come out byte-identical on
every boot. A screenshot in a spec or a doc of mine still matches next week,
and I like it that way.

The build order in `seed.ts` matters to me: all four builders draw from one
PRNG stream, so reordering those calls changes every record.

I made the data **skewed, not uniform** - 72% of luminaires are `OK`, most
faults are already `CLOSED`, and faults cluster three-in-four on luminaires
that are not `OK`. A table where every status is equally likely hides the
bugs that only show their face when one bucket is nearly empty, and I would
rather find those bugs now than later.

Streets and districts are real Madrid ones inside a real bounding box,
because the map in exercise 5.1 has to look like an actual city rather than
a scatter plot to me.

## The filter DSL

```ts
type Filters = Array<Filter | Filter[]>;   // nesting expresses precedence

interface Filter {
  leftHand:   { type: AssignmentType; value: string };
  matchMode:  MatchMode;      // EQUAL, CONTAINS, GT, IN, IS_NULL, ...
  rightHand?: { type: AssignmentType; value: unknown };
  operator?:  'AND' | 'OR';   // how this condition joins to the NEXT one
}
```

**OR binds tighter than AND**, as in SQL. A run of OR-chained conditions
forms one group and every group must hold. Because `operator` describes the
join to the *next* condition, the group breaks on `AND`.

I keep the evaluator here as well as in the app on purpose. The contract is
the payload, not shared code - a real backend implements it independently,
and implementing it twice is what proves to me the format is actually
specified rather than merely agreed with itself.

### Inert conditions are dropped, not evaluated

An unfilled control produces a condition with a blank operand. Evaluated
literally, `IN []` means "in the empty set" and silently returns **zero
rows**. The brief singles this out as the worst failure mode, and I agree -
the user is shown the wrong records rather than an honest error.

So I remove blank operands (`null`, `undefined`, `''`, `[]`) *before*
grouping, rather than evaluate them as false. Removing rather than failing
matters to me: an unfilled control sitting in the middle of an AND/OR chain
would otherwise break the chain around it. A group left empty by the removal
is satisfied, and that is exactly what I want.

I will be candid - I caught this by the verification below rather than by
reading the code. The first implementation of mine returned 0 for
`empty_values`, and I only noticed because I checked.

## Verified behaviour

```
600 luminaires · 400 faults · 250 work orders · 12 crews
traps: always-500 luminaire lum-0312 · 4s GET /api/diagnostics/slow
```

**Pagination** - page 1 of 30 gives `LUM-0001…LUM-0020`, page 12 gives
`LUM-0221…LUM-0240`, `total` 600. Out-of-range pages clamp to `lastPage`
rather than returning an empty table on me.

**Sorting** - `code` ASC starts `LUM-0001, 0002, 0003, 0004`; DESC starts
`LUM-0600, 0599, 0598, 0597`. Genuinely reversed, not re-fetched unsorted.
Collation is Spanish, so `Ñ` and accented street names sort after `Z`.

**Login** - all four users return a decodable token carrying the right
roles:

| email | roles | sub |
| --- | --- | --- |
| `admin@lumen.madrid` | `['ADMIN']` | `u-admin` |
| `ayto@lumen.madrid` | `['COUNCIL']` | `u-council` |
| `contrata@lumen.madrid` | `['CONTRACTOR']` | `u-contractor` |
| `consulta@lumen.madrid` | `['VIEWER']` | `u-viewer` |

Password for all four is `lumen`; a wrong one returns 401.

The login screen used to carry a switch that asked for a token already 60
seconds expired, purely to trigger the app-initializer failure path from
exercise 2.1 on demand. I pulled that switch back out - a real login screen
has no business offering to sign you in with a broken session - so that path
is now exercised the way it actually happens in production: a token already
sitting in storage that time-boxes out. `auth.service.spec.ts` covers it
directly, by handing `adopt()` an already-expired token rather than asking
the login screen to request one.

**The DSL**, end to end against the seeded data:

| Case | Rows |
| --- | --- |
| no filters | 600 |
| `lampType EQUAL LED` | 275 |
| `status EQUAL FAULT OR status EQUAL MAINTENANCE` | 135 |
| `status IN [FAULT, MAINTENANCE]` | 135 |
| `(FAULT OR MAINTENANCE) AND lampType EQUAL LED` | 61 |
| `status IN [FAULT, MAINTENANCE] AND lampType EQUAL LED` | 61 |
| `trap IS_NOT_NULL` / `trap IS_NULL` | 1 / 599 |
| `installedAt GTE 2020-01-01 AND LTE 2020-12-31` | 24 |
| `status IN []` + `street CONTAINS ''` | **600** |

The two 61s are the check that matters most to me: the OR-group form and the
flat `IN` form express the same predicate, so I can see nesting is being
evaluated correctly rather than merely plausibly. `IS_NULL` and
`IS_NOT_NULL` summing to 600 is the same kind of check.

**Latency** - five consecutive paged calls took 0.72s, 0.83s, 0.69s, 0.87s,
0.58s. I randomised it 300-900 ms on purpose: without it, debouncing and
race conditions are invisible on localhost, and exercises 3.3 and 4.1 lose
their meaning entirely.

**Traps** - `GET /api/luminaires/lum-0312` → 500 every time, while its
neighbour `lum-0311` → 200. `GET /api/diagnostics/slow` took 4.006s.

**Energy** has a visible daily cycle rather than noise, the way I built it.
One LED luminaire over 24h (kWh per hour):

```
00:00 0.0374  ##############
01:00 0.0192  #######          ← LED dims to 55% between 01:00 and 05:00
04:00 0.0195  #######
06:00 0.0207  ########
07:00 0.0000                   ← daylight
17:00 0.0000
18:00 0.0129  #####            ← partial hour: dusk falls mid-hour
20:00 0.0381  ###############
```

Dusk and dawn shift with the season in my model, and the boundary hours are
partial rather than all-or-nothing.

**Dashboard** aggregates per lamp-type cohort rather than per asset - 600
luminaires across 90 days is 1.3M hourly readings, and nobody needs them
individually to draw a line, as far as I'm concerned. A 7-day range returns
8 daily buckets; a 24-hour range switches to 25 hourly ones. The lamp-type
totals (2673.2 + 819.6 + 1108.9 = 4601.7) reconcile with the reported
`consumption` KPI of 4602.

## Running it

```
npm run dev        # mock API and ng serve together
npm run mock-api   # just the API, on :3000
```

`src/proxy.conf.json` forwards `/api` to `localhost:3000`, so I don't have
to hardcode a port anywhere in the app.

`POST /api/diagnostics/reset` rebuilds faults and work orders from the seed,
which I find useful after a session of creating and deleting records.
