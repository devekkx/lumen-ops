import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { Role } from './auth.models';
import { AuthService } from './auth.service';

const redirect = (path: string) => inject(Router).createUrlTree([path]);

const rolesFromRoute = (data: Record<string, unknown>): readonly Role[] =>
	(data['roles'] ?? []) as readonly Role[];

export const authGuard: CanActivateFn = () =>
	inject(AuthService).isAuthenticated() || redirect('/auth/login');

/* Needs *every* listed role. */
export const rolesGuard: CanActivateFn = (route) => {
	const auth = inject(AuthService);
	if (!auth.isAuthenticated()) return redirect('/auth/login');
	return auth.hasAllRoles(rolesFromRoute(route.data)) || redirect('/unauthorized');
};

/* Needs *at least one* listed role. This is the one route configuration
   actually uses, since ROLE_GROUPS entries are "any of these". */
export const someRoleGuard: CanActivateFn = (route) => {
	const auth = inject(AuthService);
	if (!auth.isAuthenticated()) return redirect('/auth/login');
	return auth.hasSomeRole(rolesFromRoute(route.data)) || redirect('/unauthorized');
};

/* The home-page redirects.
 *
 * Only canMatch can drive this pattern, and that is the single most useful
 * thing in exercise 2.2. canActivate runs *after* the router has already
 * committed to a route: the first empty-path entry would match, its guard would
 * deny, and navigation would fail - the later empty-path entries are never
 * considered, because matching already happened. canMatch runs *during*
 * matching, so a false result makes the router skip that route and keep looking,
 * which is what lets four routes share the empty path and pick one by role.
 *
 * Order matters: ADMIN holds several roles, so the narrower "COUNCIL but not
 * ADMIN" tests come first and the ADMIN entry acts as the catch-all above the
 * final fallback. */
export const hasRoleAndNot = (wanted: readonly Role[], excluded: readonly Role[]): CanMatchFn => {
	return () => {
		const auth = inject(AuthService);
		return auth.hasSomeRole(wanted) && !auth.hasSomeRole(excluded);
	};
};

export const hasRole =
	(wanted: readonly Role[]): CanMatchFn =>
	() =>
		inject(AuthService).hasSomeRole(wanted);
