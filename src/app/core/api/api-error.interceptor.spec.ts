import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { getTranslocoModule } from '../../../testing/transloco-testing';
import { AuthService } from '../auth/auth.service';
import { SKIP_ERROR_TOAST, SKIP_RETRY } from './api-options';
import { apiErrorInterceptor } from './api-error.interceptor';
import { ToastService } from './toast.service';

/* A retryable GET failure (offline, or the server's own 5xx) runs the full
   bounded-retry cycle: an initial attempt, then two retries backed off 300ms
   and 600ms. `settleGet` drives one URL through all three attempts inside a
   fakeAsync zone, which is what makes an assertion taken right after mean
   "after the interceptor gave up" rather than "before its first real
   setTimeout ever fired". */
const settleGet = (httpMock: HttpTestingController, url: string, status: number) => {
	const fail = () => httpMock.expectOne(url).error(new ProgressEvent('error'), { status });
	fail();
	tick(400);
	fail();
	tick(700);
	fail();
};

describe('apiErrorInterceptor', () => {
	let http: HttpClient;
	let httpMock: HttpTestingController;
	let toast: ToastService;
	let auth: jasmine.SpyObj<Pick<AuthService, 'logout'>>;
	let router: jasmine.SpyObj<Pick<Router, 'navigateByUrl'>>;

	beforeEach(() => {
		auth = jasmine.createSpyObj('AuthService', ['logout']);
		router = jasmine.createSpyObj('Router', ['navigateByUrl']);

		TestBed.configureTestingModule({
			imports: [getTranslocoModule()],
			providers: [
				provideHttpClient(withInterceptors([apiErrorInterceptor])),
				provideHttpClientTesting(),
				{ provide: AuthService, useValue: auth },
				{ provide: Router, useValue: router }
			]
		});

		http = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
		toast = TestBed.inject(ToastService);
	});

	/* A deliberate timeout cancellation leaves one request the backend never
	   answered - that is what "cancelled" means to HttpTestingController, not
	   a forgotten assertion, so it is the one thing verify() is told to allow. */
	afterEach(() => httpMock.verify({ ignoreCancelled: true }));

	it('retries a failing GET up to the bound before giving up', fakeAsync(() => {
		let caught: unknown;
		http.get('/api/luminaires').subscribe({ error: (error) => (caught = error) });

		settleGet(httpMock, '/api/luminaires', 500);

		expect(caught).toBeTruthy();
		expect(toast.toasts()).toHaveSize(1);
		expect(toast.toasts()[0].tone).toBe('critical');
	}));

	/* The structural guarantee the brief asks for: a write is never wrapped in
	   retry, so this fails if a second request ever reaches the mock - ticking
	   well past every retry delay used above is what makes that assertion mean
	   something, rather than merely running before a real setTimeout fires. */
	it('never retries a failing POST', fakeAsync(() => {
		http.post('/api/faults', {}).subscribe({ error: () => undefined });
		httpMock.expectOne('/api/faults').flush(null, { status: 500, statusText: 'Server error' });

		tick(5000);
	}));

	/* A 401 is never retried even on an idempotent GET - resubmitting the same
	   expired token teaches the server nothing new - so this settles in one
	   round trip rather than three. */
	it('logs out and redirects to login on a 401, without swallowing the error', () => {
		let caught: unknown;
		http.get('/api/luminaires').subscribe({ error: (error) => (caught = error) });
		httpMock.expectOne('/api/luminaires').error(new ProgressEvent('error'), { status: 401 });

		expect(auth.logout).toHaveBeenCalled();
		expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
		expect(caught).toBeTruthy();
	});

	/* The same non-retryable-status guard, proven on a GET that never resolves
	   even though the method itself is idempotent. The assertion is the
	   shared afterEach's httpMock.verify() above: a retry would leave a
	   second outstanding request that expectOne never matched. */
	// eslint-disable-next-line sonarjs/assertions-in-tests
	it('never retries a 404 GET, only a transient-looking failure', () => {
		http.get('/api/luminaires/does-not-exist').subscribe({ error: () => undefined });
		httpMock
			.expectOne('/api/luminaires/does-not-exist')
			.flush(null, { status: 404, statusText: 'Not found' });
	});

	/* Same reasoning: httpMock.verify() in afterEach is what actually proves
	   no retry fired. */
	// eslint-disable-next-line sonarjs/assertions-in-tests
	it('honours SKIP_RETRY on an otherwise-idempotent GET', () => {
		const context = new HttpContext().set(SKIP_RETRY, true);
		http.get('/api/luminaires', { context }).subscribe({ error: () => undefined });
		httpMock.expectOne('/api/luminaires').flush(null, { status: 500, statusText: 'Server error' });
	});

	it('honours SKIP_ERROR_TOAST and shows no toast at all', () => {
		const context = new HttpContext().set(SKIP_ERROR_TOAST, true);
		http.get('/api/luminaires', { context }).subscribe({ error: () => undefined });
		httpMock.expectOne('/api/luminaires').flush(null, { status: 401, statusText: 'Unauthorized' });

		expect(toast.toasts()).toHaveSize(0);
		expect(auth.logout).toHaveBeenCalled();
	});

	it('shows the translated offline message for a network-level failure', fakeAsync(() => {
		http.get('/api/luminaires').subscribe({ error: () => undefined });

		settleGet(httpMock, '/api/luminaires', 0);

		expect(toast.toasts()[0].message).toBe(
			'Sin conexión con el mock API. Reintenta cuando vuelva la red.'
		);
	}));

	/* One clear toast, not a cascade - the DONE WHEN criterion from the brief. */
	it('collapses a burst of identical failures into a single toast', fakeAsync(() => {
		http.get('/api/a').subscribe({ error: () => undefined });
		http.get('/api/b').subscribe({ error: () => undefined });

		settleGet(httpMock, '/api/a', 0);
		settleGet(httpMock, '/api/b', 0);

		expect(toast.toasts()).toHaveSize(1);
	}));

	/* Isolates the timeout mechanism on a POST, which the retry operator never
	   touches, so this proves timeout() alone without retry compounding it. */
	it('cancels a request that outlasts the timeout and reports it distinctly', fakeAsync(() => {
		let caught: unknown;
		http.post('/api/diagnostics/slow', {}).subscribe({ error: (error) => (caught = error) });

		httpMock.expectOne('/api/diagnostics/slow');
		tick(15_001);

		expect(caught).toBeTruthy();
		expect(toast.toasts()[0].message).toBe('La petición tardó demasiado y se ha cancelado.');
	}));
});
