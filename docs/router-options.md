# Router option notes

Three non-default choices went into `provideRouter()`, and the brief asks
one sentence per option: what breaks without it, and what it costs me.

`withHashLocation()` - without it, a deep link or a reload on any route
other than `/` 404s, because nginx serves one `index.html` and does not
rewrite application paths back to it; the cost is an ugly `#` in every URL,
which I accept for a console nobody bookmarks by hand.

`withComponentInputBinding()` - without it, every route param and query
param has to be pulled out of `ActivatedRoute` by hand in each component's
constructor; the cost is close to nothing, so this one was an easy yes.

`withPreloading()` - without any preloading strategy at all, the *first*
navigation into a feature is slower than it needs to be, since Angular only
fetches a lazy chunk the moment you actually route to it.

I started day 1 with `PreloadAllModules`, the obvious default, and I will
not pretend otherwise here - small small I learned better. Exercise 5.3 asks
you to revisit that choice with real numbers, and the numbers said no:
built with `--stats-json`, `/panel` (the dashboard, ECharts) comes to
~572 kB raw / ~165 kB gzip and is ADMIN/COUNCIL-only, and `/mapa` (the map,
OpenLayers) is ~321 kB raw / ~81 kB gzip. `PreloadAllModules` does not
consult `canActivate`/`canMatch`, so it was quietly downloading ~165 kB of
gzipped ECharts onto a CONTRACTOR or VIEWER session that can never legally
open `/panel` in the first place - bandwidth spent on a screen that session
is not even authorised to see.

I replaced it with my own `SelectivePreloadingStrategy`
(`core/routing/selective-preload.strategy.ts`): it preloads every lazy
route by default, same as before, except the two routes flagged
`data: { preload: false }` in `app.routes.ts`, which load on demand instead.
I keep the benefit of `PreloadAllModules` - snappy in-app navigation - for
everything cheap, and only pay the two heavy chunks' cost when a session
actually shows intent to visit them.
