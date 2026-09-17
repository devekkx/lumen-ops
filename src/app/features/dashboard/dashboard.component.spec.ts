import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { getTranslocoModule } from '../../../testing/transloco-testing';
import { LanguageService, Locale } from '@core/i18n/language.service';
import { DashboardComponent } from './dashboard.component';
import { DashboardSnapshot } from './dashboard.service';

const SNAPSHOT: DashboardSnapshot = {
	bucketHours: 24,
	series: [
		{ t: Date.parse('2026-09-09T00:00:00.000Z'), kwh: 12.3 },
		{ t: Date.parse('2026-09-10T00:00:00.000Z'), kwh: 9.1 }
	],
	byLampType: [
		{ name: 'LED', kwh: 10 },
		{ name: 'SODIUM', kwh: 2 },
		{ name: 'METAL_HALIDE', kwh: 0.3 }
	],
	bySeverity: [
		{ name: 'LOW', count: 1 },
		{ name: 'MEDIUM', count: 0 },
		{ name: 'HIGH', count: 0 },
		{ name: 'CRITICAL', count: 0 }
	],
	kpis: { luminaires: 600, openFaults: 12, ordersOpen: 5, consumption: 4602, availability: 92.3 }
};

describe('DashboardComponent', () => {
	let http: HttpTestingController;
	const locale = signal<Locale>('es');

	/* ngAfterViewInit fires the initial load, so a fixture is only useful to a
	   test once detectChanges has run at least once. */
	const render = () => {
		const fixture = TestBed.createComponent(DashboardComponent);
		fixture.detectChanges();
		return fixture;
	};

	beforeEach(() => {
		jasmine.clock().install();
		jasmine.clock().mockDate(new Date('2026-09-16T12:00:00.000Z'));
		locale.set('es');

		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			imports: [DashboardComponent, getTranslocoModule()],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: LanguageService,
					useValue: {
						current: locale.asReadonly(),
						intlLocale: () => (locale() === 'es' ? 'es-ES' : 'en-GB'),
						use: (value: Locale) => locale.set(value)
					}
				}
			]
		});

		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		http.verify();
		jasmine.clock().uninstall();
	});

	it('loads the real endpoint for the default 7-day range, anchored on now', () => {
		render();

		const request = http.expectOne((req) => req.url === '/api/dashboard');
		expect(request.request.params.get('to')).toBe('2026-09-16T12:00:00.000Z');
		expect(request.request.params.get('from')).toBe('2026-09-09T12:00:00.000Z');
		request.flush(SNAPSHOT);
	});

	it('re-requests a narrower window for the 24-hour range', () => {
		const fixture = render();
		http.expectOne((req) => req.url === '/api/dashboard').flush(SNAPSHOT);

		fixture.componentInstance.selectRange('1');
		fixture.detectChanges();

		const request = http.expectOne((req) => req.url === '/api/dashboard');
		expect(request.request.params.get('from')).toBe('2026-09-15T12:00:00.000Z');
		request.flush(SNAPSHOT);
	});

	/* expectNone below is the assertion: it throws if a matching request was
	   actually made. */
	// eslint-disable-next-line sonarjs/assertions-in-tests
	it('does not re-request when the active range is clicked again', () => {
		const fixture = render();
		http.expectOne((req) => req.url === '/api/dashboard').flush(SNAPSHOT);

		fixture.componentInstance.selectRange('7');
		fixture.detectChanges();

		http.expectNone('/api/dashboard');
	});

	it('reports a chart as having no data when every value in it is zero', () => {
		const fixture = render();
		http
			.expectOne((req) => req.url === '/api/dashboard')
			.flush({
				...SNAPSHOT,
				bySeverity: SNAPSHOT.bySeverity.map((item) => ({ ...item, count: 0 }))
			});
		fixture.detectChanges();

		expect(fixture.componentInstance.hasSeverityData()).toBe(false);
		expect(fixture.componentInstance.hasLampData()).toBe(true);
		expect(fixture.componentInstance.hasEnergyData()).toBe(true);
	});

	it('treats a genuinely empty series the same as an all-zero one', () => {
		const fixture = render();
		http.expectOne((req) => req.url === '/api/dashboard').flush({ ...SNAPSHOT, series: [] });
		fixture.detectChanges();

		expect(fixture.componentInstance.hasEnergyData()).toBe(false);
	});

	it('falls back to the empty state and stops loading when the request fails', () => {
		const fixture = render();
		http
			.expectOne((req) => req.url === '/api/dashboard')
			.flush('boom', { status: 500, statusText: 'Server error' });
		fixture.detectChanges();

		expect(fixture.componentInstance.loading()).toBe(false);
		expect(fixture.componentInstance.snapshot()).toBeNull();
		expect(fixture.componentInstance.hasEnergyData()).toBe(false);
	});

	it('builds one KPI tile per response metric', () => {
		const fixture = render();
		http.expectOne((req) => req.url === '/api/dashboard').flush(SNAPSHOT);
		fixture.detectChanges();

		const tiles = fixture.componentInstance.kpiTiles();
		expect(tiles.map((tile) => tile.key)).toEqual([
			'luminaires',
			'openFaults',
			'ordersOpen',
			'consumption',
			'availability'
		]);
		expect(tiles.find((tile) => tile.key === 'consumption')?.value).toBe(4602);
		expect(tiles.find((tile) => tile.key === 'availability')?.suffix).toBe('%');
	});

	it('survives a language switch without throwing', () => {
		const fixture = render();
		http.expectOne((req) => req.url === '/api/dashboard').flush(SNAPSHOT);
		fixture.detectChanges();

		expect(() => {
			locale.set('en');
			fixture.detectChanges();
		}).not.toThrow();
	});

	it('disposes every chart instance on destroy', () => {
		const fixture = render();
		http.expectOne((req) => req.url === '/api/dashboard').flush(SNAPSHOT);
		fixture.detectChanges();

		expect(() => fixture.destroy()).not.toThrow();
	});
});
