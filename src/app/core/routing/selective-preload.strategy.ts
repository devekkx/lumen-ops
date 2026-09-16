import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

/* PreloadAllModules (exercise 1.1) fetches every lazy chunk shortly after
 * bootstrap, regardless of the signed-in user's role — preloading does not
 * consult canActivate/canMatch. Measured against the real production build
 * (`ng build --configuration production --stats-json`, see
 * dist/lumen-ops/stats.json and the PR body for the exact numbers), two
 * routes are genuinely heavy and also role-restricted:
 *
 *   /panel (dashboard, ECharts)     ~572 kB raw / ~165 kB gzip — ADMIN/COUNCIL only
 *   /mapa  (map, OpenLayers)        ~321 kB raw /  ~81 kB gzip — open to everyone
 *
 * Every other lazy route is a few kB to a few tens of kB. A CONTRACTOR or
 * VIEWER session can never legally reach /panel (someRoleGuard blocks
 * canActivate), so PreloadAllModules was silently downloading ~165 kB of
 * gzipped ECharts code onto every one of those sessions for a screen they
 * are not authorized to open. /mapa has no such role gate, but at ~81 kB
 * gzip it is still worth deferring rather than fetching unconditionally on
 * every session before the user has shown any intent to visit it.
 *
 * This strategy preserves PreloadAllModules' benefit (snappy in-app
 * navigation) for every route that is cheap to preload, and opts the two
 * heavy ones out via `data.preload === false` on the route (see
 * app.routes.ts) so they load lazily, on demand, the first time a session
 * actually navigates to them.
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
	preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
		if (route.data?.['preload'] === false) return of(null);
		return load();
	}
}
