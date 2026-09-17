import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

const TOKEN_KEY = 'lumen.session.token';

const encode = (value: object) =>
	btoa(unescape(encodeURIComponent(JSON.stringify(value))))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replaceAll('=', '');

const tokenFor = (secondsFromNow: number, roles = ['COUNCIL']) =>
	`${encode({ alg: 'HS256' })}.${encode({
		sub: 'u-council',
		name: 'Marta Gil Soler',
		email: 'ayto@lumen.madrid',
		org: 'Área de Obras y Equipamientos',
		roles,
		exp: Math.floor(Date.now() / 1000) + secondsFromNow
	})}.sig`;

describe('AuthService', () => {
	let service: AuthService;
	let http: HttpTestingController;

	beforeEach(() => {
		localStorage.removeItem(TOKEN_KEY);
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [AuthService, provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(AuthService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		http.verify();
		localStorage.removeItem(TOKEN_KEY);
	});

	it('starts out booting, with no user', () => {
		expect(service.booting()).toBe(true);
		expect(service.user()).toBeNull();
		expect(service.isAuthenticated()).toBe(false);
	});

	describe('initializeUser', () => {
		/* The whole point of the exercise: this must never reject. A rejected
		   app initializer leaves Angular with nothing bootstrapped - no login
		   screen, no error, just a blank document. */
		it('resolves rather than rejecting on an expired token', async () => {
			localStorage.setItem(TOKEN_KEY, tokenFor(-60));
			await expectAsync(service.initializeUser()).toBeResolved();

			expect(service.user()).toBeNull();
			expect(service.failure()).toBe('EXPIRED');
			expect(service.booting()).toBe(false);
		});

		it('resolves rather than rejecting on a malformed token', async () => {
			localStorage.setItem(TOKEN_KEY, 'not-a-jwt');
			await expectAsync(service.initializeUser()).toBeResolved();

			expect(service.failure()).toBe('MALFORMED');
			expect(service.booting()).toBe(false);
		});

		/* A bad token is discarded, or the next reload fails the same way and
		   the user is stuck in a loop they cannot clear from the UI. */
		it('discards the token it could not resolve', async () => {
			localStorage.setItem(TOKEN_KEY, tokenFor(-60));
			await service.initializeUser();
			expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
		});

		it('restores a valid session', async () => {
			localStorage.setItem(TOKEN_KEY, tokenFor(3600));
			await service.initializeUser();

			expect(service.user()?.email).toBe('ayto@lumen.madrid');
			expect(service.isAuthenticated()).toBe(true);
			expect(service.failure()).toBeNull();
		});

		/* A first-time visitor has no token and therefore no problem - reporting
		   a failure here would show "your session expired" to someone who never
		   had one. */
		it('reports no failure when there was nothing to resolve', async () => {
			await service.initializeUser();
			expect(service.failure()).toBeNull();
			expect(service.booting()).toBe(false);
		});

		it('stops booting even if storage throws', async () => {
			spyOn(Storage.prototype, 'getItem').and.throwError('denied');
			await expectAsync(service.initializeUser()).toBeResolved();
			expect(service.booting()).toBe(false);
		});
	});

	describe('login', () => {
		it('adopts the returned token', async () => {
			const pending = service.login({ email: 'ayto@lumen.madrid', password: 'lumen' });
			http.expectOne('/api/auth/login').flush({ token: tokenFor(3600) });
			await pending;

			expect(service.isAuthenticated()).toBe(true);
			expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();
		});

		/* A login response is HTTP 200 even when the token inside it is already
		   expired, so the failure has to surface from adopt() rather than from
		   the request itself. */
		it('rejects an already-expired token and stores nothing', async () => {
			const pending = service.login({ email: 'ayto@lumen.madrid', password: 'lumen' });
			http.expectOne('/api/auth/login').flush({ token: tokenFor(-60) });

			await expectAsync(pending).toBeRejected();
			expect(service.failure()).toBe('EXPIRED');
			expect(service.isAuthenticated()).toBe(false);
			expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
		});
	});

	describe('roles and abilities', () => {
		const signIn = async (roles: string[]) => {
			const pending = service.login({ email: 'e', password: 'p' });
			http.expectOne('/api/auth/login').flush({ token: tokenFor(3600, roles) });
			await pending;
		};

		it('distinguishes all-roles from some-roles', async () => {
			await signIn(['COUNCIL']);
			expect(service.hasSomeRole(['ADMIN', 'COUNCIL'])).toBe(true);
			expect(service.hasAllRoles(['ADMIN', 'COUNCIL'])).toBe(false);
			expect(service.hasAllRoles(['COUNCIL'])).toBe(true);
		});

		it('gives a VIEWER no write abilities at all', async () => {
			await signIn(['VIEWER']);
			const abilities = service.abilities();

			expect(abilities.viewFaults).toBe(true);
			expect(abilities.createFault).toBe(false);
			expect(abilities.validateFault).toBe(false);
			expect(abilities.closeFault).toBe(false);
			expect(abilities.deleteFault).toBe(false);
			expect(abilities.seeDiagnostics).toBe(false);
		});

		it('gives ADMIN every ability', async () => {
			await signIn(['ADMIN']);
			expect(Object.values(service.abilities()).every(Boolean)).toBe(true);
		});

		it('clears the session on logout', async () => {
			await signIn(['ADMIN']);
			service.logout();

			expect(service.user()).toBeNull();
			expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
			expect(service.abilities().deleteFault).toBe(false);
		});
	});
});
