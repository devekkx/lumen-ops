import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardService, DashboardSnapshot } from './dashboard.service';

const SNAPSHOT: DashboardSnapshot = {
	bucketHours: 24,
	series: [{ t: 0, kwh: 12.3 }],
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

describe('DashboardService', () => {
	let service: DashboardService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(DashboardService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('GETs the real /api/dashboard endpoint, not the dead /summary one', () => {
		service
			.snapshot({ from: '2026-09-09T00:00:00.000Z', to: '2026-09-16T00:00:00.000Z' })
			.subscribe();

		const request = http.expectOne((req) => req.url === '/api/dashboard');
		expect(request.request.method).toBe('GET');
		expect(request.request.params.get('from')).toBe('2026-09-09T00:00:00.000Z');
		expect(request.request.params.get('to')).toBe('2026-09-16T00:00:00.000Z');
		request.flush(SNAPSHOT);
	});

	it('omits zoneId from the query string rather than sending it as "undefined"', () => {
		service.snapshot({ from: 'a', to: 'b' }).subscribe();

		const request = http.expectOne((req) => req.url === '/api/dashboard');
		expect(request.request.params.has('zoneId')).toBe(false);
		request.flush(SNAPSHOT);
	});

	it('forwards zoneId when the caller narrows to one zone', () => {
		service.snapshot({ from: 'a', to: 'b', zoneId: 'Z01' }).subscribe();

		const request = http.expectOne((req) => req.url === '/api/dashboard');
		expect(request.request.params.get('zoneId')).toBe('Z01');
		request.flush(SNAPSHOT);
	});

	it('resolves the typed snapshot from the response body', () => {
		let result: DashboardSnapshot | undefined;
		service.snapshot({ from: 'a', to: 'b' }).subscribe((value) => (result = value));

		http.expectOne((req) => req.url === '/api/dashboard').flush(SNAPSHOT);

		expect(result).toEqual(SNAPSHOT);
	});
});
