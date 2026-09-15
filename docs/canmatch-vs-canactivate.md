# `canMatch` vs `canActivate`

Exercise 2.2 calls this the single most useful thing in the day, and it is,
because the two look interchangeable in the docs and are not.

## The difference in one sentence

`canMatch` runs **while the router is deciding which route this URL is**;
`canActivate` runs **after it has already decided**.

## Why only `canMatch` can drive the home-page pattern

`/` has to mean four different things. The natural shape is four routes sharing
the empty path, each claiming it for a different role:

```ts
{ path: '', pathMatch: 'full', canMatch: [councilNotAdmin],    redirectTo: 'averias' },
{ path: '', pathMatch: 'full', canMatch: [contractorNotAdmin], redirectTo: 'ordenes-trabajo' },
{ path: '', pathMatch: 'full', canMatch: [viewerOnly],         redirectTo: 'luminarias' },
{ path: '', pathMatch: 'full', canMatch: [admin],              redirectTo: 'panel' },
{ path: '', pathMatch: 'full',                                 redirectTo: 'luminarias' }
```

With `canMatch`, a `false` means *this is not the route* — the router discards
that candidate and carries on down the list until one matches. Five routes can
therefore share a path and exactly one wins.

Swap those for `canActivate` and the chain collapses. Route matching happens
first and is purely structural: `path: ''` with `pathMatch: 'full'` matches, so
**the first entry wins immediately** and the router commits to it. The guard
then runs and returns false. The result is a failed navigation, not a fallthrough
— the four later routes are never even considered, because matching is over.

So:

| | `canMatch` | `canActivate` |
| --- | --- | --- |
| Runs | during matching | after matching |
| `false` means | "not this route, keep looking" | "this route, but you may not enter" |
| Siblings on the same path | each gets a turn | only the first is ever tried |
| Right for | choosing between candidates | protecting a chosen route |

## What that costs

`canMatch` guards run on **every** match attempt, including ones the router
discards, so they must be cheap and free of side effects. Reading a signal is
fine. Firing an HTTP request, or navigating, is not: it may run for a route the
user never lands on.

`canMatch` also cannot redirect. It only says yes or no — which is why denial
here has to be expressed as a later route that *does* match, and why
`/unauthorized` is reached from `canActivate` rather than from `canMatch`.

## Order matters, and exclusions are why

The guards are not merely "has this role" but "has this role **and not** a
broader one":

```ts
hasRoleAndNot(['COUNCIL'], ['ADMIN'])
```

Without the exclusion, a user holding `ADMIN` *and* `COUNCIL` matches the first
entry and lands on `averias`, never reaching the dashboard. ADMIN in the seeded
data holds only one role, so the bug would not show up in manual testing at all
— which is exactly why there is a spec for it
(`auth.guards.spec.ts`, "does not let a multi-role admin match an earlier entry").

The last entry deliberately has **no** `canMatch`, so it always matches and the
chain can never fall through to a 404.

## Verified

Logging in as each seeded user and resolving the chain against the token the
mock actually issued:

| User | Roles | Home |
| --- | --- | --- |
| `admin@lumen.madrid` | `ADMIN` | `/panel` |
| `ayto@lumen.madrid` | `COUNCIL` | `/averias` |
| `contrata@lumen.madrid` | `CONTRACTOR` | `/ordenes-trabajo` |
| `consulta@lumen.madrid` | `VIEWER` | `/luminarias` |
| (hypothetical) | `ADMIN, COUNCIL, CONTRACTOR` | `/panel` |
| none | — | `/luminarias` |
