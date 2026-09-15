import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Role, SessionUser } from './auth.models';
import { AuthService } from './auth.service';
import { authGuard, hasRole, hasRoleAndNot, rolesGuard, someRoleGuard } from './auth.guards';

/* A fake AuthService rather than a real one over HTTP: these specs are about
   the guards' decisions, not about token decoding. */
class FakeAuth {
	user: SessionUser | null = null;

	as(...roles: Role[]): void {
		this.user = { id: 'u', name: 'N', email: 'e', org: 'o', roles, exp: 0 };
	}

	isAuthenticated() {
		return this.user !== null;
	}

	hasAllRoles(roles: readonly Role[]) {
		return !!this.user && roles.every((role) => this.user!.roles.includes(role));
	}

	hasSomeRole(roles: readonly Role[]) {
		return !!this.user && roles.some((role) => this.user!.roles.includes(role));
	}
}

describe('auth guards', () => {
	let auth: FakeAuth;

	const run = <T>(guard: () => T, data: Record<string, unknown> = {}): T =>
		TestBed.runInInjectionContext(() =>
			(guard as unknown as (route: unknown, state: unknown) => T)({ data }, {})
		);

	const pathOf = (result: unknown) =>
		result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;

	beforeEach(() => {
		auth = new FakeAuth();
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
	});

	describe('authGuard', () => {
		it('allows a session', () => {
			auth.as('VIEWER');
			expect(run(authGuard as never)).toBe(true);
		});

		it('sends a visitor with no session to login', () => {
			expect(pathOf(run(authGuard as never))).toBe('/auth/login');
		});
	});

	describe('rolesGuard — needs every listed role', () => {
		it('allows a user holding all of them', () => {
			auth.as('ADMIN', 'COUNCIL');
			expect(run(rolesGuard as never, { roles: ['ADMIN', 'COUNCIL'] })).toBe(true);
		});

		it('denies a user holding only some', () => {
			auth.as('COUNCIL');
			expect(pathOf(run(rolesGuard as never, { roles: ['ADMIN', 'COUNCIL'] }))).toBe(
				'/unauthorized'
			);
		});

		it('sends no-session to login rather than unauthorized', () => {
			expect(pathOf(run(rolesGuard as never, { roles: ['ADMIN'] }))).toBe('/auth/login');
		});
	});

	describe('someRoleGuard — needs at least one', () => {
		it('allows a user holding one of them', () => {
			auth.as('CONTRACTOR');
			expect(run(someRoleGuard as never, { roles: ['ADMIN', 'CONTRACTOR'] })).toBe(true);
		});

		it('denies a user holding none', () => {
			auth.as('VIEWER');
			expect(pathOf(run(someRoleGuard as never, { roles: ['ADMIN', 'CONTRACTOR'] }))).toBe(
				'/unauthorized'
			);
		});

		it('sends no-session to login rather than unauthorized', () => {
			expect(pathOf(run(someRoleGuard as never, { roles: ['ADMIN'] }))).toBe('/auth/login');
		});
	});

	/* The home-page chain. Each entry must match for exactly the roles it is
	   meant for, or two empty-path routes could both claim `/`. */
	describe('home-page canMatch chain', () => {
		const chain = (): [string, boolean][] => [
			['averias', run(hasRoleAndNot(['COUNCIL'], ['ADMIN']) as never)],
			['ordenes-trabajo', run(hasRoleAndNot(['CONTRACTOR'], ['ADMIN']) as never)],
			['luminarias', run(hasRoleAndNot(['VIEWER'], ['ADMIN', 'COUNCIL', 'CONTRACTOR']) as never)],
			['panel', run(hasRole(['ADMIN']) as never)]
		];

		const firstMatch = () => chain().find(([, matched]) => matched)?.[0] ?? 'luminarias';

		it('lands each of the four users on a different home page', () => {
			auth.as('COUNCIL');
			expect(firstMatch()).toBe('averias');

			auth.as('CONTRACTOR');
			expect(firstMatch()).toBe('ordenes-trabajo');

			auth.as('VIEWER');
			expect(firstMatch()).toBe('luminarias');

			auth.as('ADMIN');
			expect(firstMatch()).toBe('panel');
		});

		/* ADMIN also holds nothing else, but the exclusions matter for a user
		   granted several roles: without them, ADMIN would match the COUNCIL
		   entry first and never reach the dashboard. */
		it('does not let a multi-role admin match an earlier entry', () => {
			auth.as('ADMIN', 'COUNCIL', 'CONTRACTOR');
			expect(firstMatch()).toBe('panel');
		});

		it('falls through to luminarias when nothing matches', () => {
			auth.user = null;
			expect(firstMatch()).toBe('luminarias');
		});

		it('matches exactly one entry per single-role user', () => {
			for (const role of ['COUNCIL', 'CONTRACTOR', 'VIEWER', 'ADMIN'] as Role[]) {
				auth.as(role);
				expect(chain().filter(([, matched]) => matched).length).toBe(1);
			}
		});
	});
});
