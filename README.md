# Lumen Ops

A five-day training build: a small, runnable Angular app that rebuilds the
important architectural patterns of a real municipal street-lighting
operations system — a paginated data layer with a real filter language, role-
based auth and UI gating, a reusable table pattern (in two versions, RxJS and
signals), a fault-report CRUD flow with a modal/dirty-exit guard, an
OpenLayers map, ECharts energy dashboards, i18n, and delivery tooling (this
file, plus Docker/CI). It is **not** a product — there is no real backend, no
real users, and no SLA. Treat it as a worked example you can run, read end to
end, and poke at, not as something to deploy for actual street lights.

Council staff report faults on luminaires (street lights); those faults
become work orders that contractor crews complete. The same app serves
council and contractor users, so routes and available actions vary by role
(`ADMIN`, `COUNCIL`, `CONTRACTOR`, `VIEWER` — see `docs/mock-api.md` for the
four seeded logins).

## Running it

Two ways to get a working app with real (seeded, deterministic) data:

**Locally**, with two dependencies already in `package.json`:

```bash
npm install
npm run dev        # mock API on :3000 and `ng serve` on :4200, together
```

Open `http://localhost:4200/#/luminarias` and log in as any of the four
seeded users (`docs/mock-api.md` has the emails; the password is `lumen` for
all four). `npm run mock-api` runs just the API alone, if you want the
Angular dev server on its own terms.

**With Docker**, from a clean clone, no local Node install required:

```bash
docker compose up --build
```

This builds the production Angular bundle and serves it via nginx on
`http://localhost:8080`, alongside a second container running the mock API.
nginx proxies `/api` to the mock API container — see `Dockerfile` and
`deploy/nginx.conf` for exactly how, and why that's a different mechanism
than the dev-server proxy (`src/proxy.conf.json`) uses.

## Layout

| Path | What lives there |
| --- | --- |
| `src/app/core` | Auth (session, guards, JWT decoding), the one `ApiService`, HTTP interceptors, i18n plumbing, the modal/overlay service. Cross-cutting, app-wide. |
| `src/app/shared` | Reusable primitives with no feature opinions: the filter DSL, the pagination models, both paginated-table base classes (v1 and v2 — see below), validators, the luminaire-picker form control. |
| `src/app/features` | The actual screens — login, dashboard, luminaires, faults, the map — each its own lazy route (`loadComponent`). |
| `src/app/business` | Reserved for domain logic that doesn't belong in a feature's own folder. Empty in this build; not every exercise needed it. |
| `mock-api` | An Express server implementing the exact contract the app consumes: the pagination envelope, the filter DSL evaluator, auth, and the energy model. Deterministic (fixed PRNG seed) so the same 600 luminaires and 400 faults come back every run. |
| `docs/` | Design notes written *during* the build, not after — read these before changing the area they cover. `mock-api.md` and `filter-dsl.md` are the contract; `table-v1-vs-v2.md`, `a11y-notes.md`, `app-initializer.md`, `i18n-notes.md` explain specific decisions and their known gaps. |

## Three things worth understanding before you change anything

Five candidates were on the table for this section (the filter DSL, the
pagination envelope, the table v1/v2 split, the stacked-PR workflow this
build used, and ability-based UI gating). These three are the ones most
likely to cause a real bug or a real security gap if a newcomer doesn't know
them going in; the rest have their own write-ups under `docs/`.

### 1. The pagination envelope is the one contract everything shares

Every collection screen — luminaires, faults, work orders, crews — POSTs the
same request shape to the same kind of endpoint and gets back the same
response shape:

```ts
// request
{ page, perPage, searchTerm, searchKeys, ordination: { property, direction }, filters }
// response
{ data, currentPage, lastPage, total, perPage }
```

`POST` for what is conceptually a read is deliberate, not a mistake: the
filter DSL (next section) doesn't fit in a query string, which is the actual
reason it exists. `ordination` instead of `sort`, and one-based `page`
instead of zero-based, are the real backend's spelling, copied here on
purpose rather than "corrected" — a mock API that quietly used nicer names
than the real one would be lying about what integration actually looks like.
Both paginated-table base classes (below) are built directly on this shape;
if you're adding a fifth collection, match the envelope rather than
inventing a nicer one for that screen alone. Full detail: `docs/mock-api.md`.

### 2. The filter DSL, and its one sharp edge

Filters are structured objects (`{ leftHand, matchMode, rightHand?,
operator? }`, `docs/filter-dsl.md`), not query-string key/value pairs,
because a query string can't express "or", "is null", or a value that's
itself a list. `buildFilterConditions()` turns a form's flat value object
into these conditions automatically, picking the match mode from each
value's runtime type.

The one thing to actually remember: **an unfilled control must not become a
condition at all.** `IN []` reads as "in the empty set" and returns zero rows
— a filter panel a user never touched would otherwise show them an empty
table with no indication anything is wrong. `isBlank()` drops blank operands
before a condition is ever built, rather than building one that evaluates
false. If you add a new filter control type, make sure its blank state is
covered by `isBlank`, or you will reintroduce exactly this bug — it happened
once already during this build (`docs/mock-api.md`'s "Verified behaviour"
section: the first implementation returned 0 rows for `empty_values`, caught
by testing against the seeded data rather than by reading the code).

### 3. Abilities gate what renders, not just what's clickable

`AuthService.abilities()` computes a flat `Abilities` record (`createFault`,
`deleteFault`, `assignCrew`, …) once from the current user's roles.
Templates use it with `@if` to decide whether a write-action element exists
in the DOM at all — never merely `[disabled]`. A disabled button still ships
its click handler and its intent to anyone with devtools open; a
CSS-hidden one still exists in the accessibility tree. Gating existence
instead of appearance is what makes
`src/app/features/faults/faults-page.security.spec.ts` possible: it asserts
that a VIEWER's rendered fault list contains *zero* `[data-action]` elements,
not zero *visible* ones. That spec is called out elsewhere in this repo's
docs as the single most valuable test written during the build, and this is
the pattern it's proving. If you add a new write action anywhere in the app,
gate its template the same way, and consider whether it needs the same kind
of assertion.

## Testing

```bash
ng test
```

runs the Karma/Jasmine suite. `karma.conf.js` wires in coverage
(`karma-coverage`) with conservative, not-yet-verified thresholds — see the
comment in that file for why they're a floor inferred from which modules
have specs, not a measured baseline. **No headless browser is available in
the environment this suite and this README were written in**, so `ng test`
has not actually been executed against this codebase; every spec was reasoned
through by hand. `.github/workflows/ci.yml` is the first place this suite
actually runs, against a real headless Chrome.

## Building and deployment

```bash
ng build --configuration production
```

builds to `dist/lumen-ops/browser`. The production budget
(`angular.json`) is 2 MB warning / 4 MB error on the initial bundle — see the
inline comments added alongside that change for the measured numbers behind
it (the actual initial bundle is under 750 kB; OpenLayers and ECharts, the
two genuinely heavy dependencies, are confirmed lazy-loaded on their own
routes and excluded from preloading via `SelectivePreloadingStrategy`).

`Dockerfile` + `docker-compose.yml` package this into two containers (the
built app behind nginx, and the mock API run via `tsx`) — see "Running it"
above and the comments in both files for what a real (non-training)
deployment would need to change, starting with replacing the mock API with
a real backend that implements the same envelope and filter contract.

---

This project was generated using [Angular CLI](https://github.com/angular/angular-cli)
version 19.2.19. For Angular CLI usage beyond what's covered here, see the
[Angular CLI reference](https://angular.dev/tools/cli).
