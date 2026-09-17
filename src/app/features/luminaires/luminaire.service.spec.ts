import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createPageRequest } from '@shared/models/pagination';
import { LuminaireService } from './luminaire.service';

describe('LuminaireService', () => {
	let service: LuminaireService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(LuminaireService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('POSTs the full envelope to /api/luminaires/paged rather than a query string', () => {
		const request = createPageRequest(['code', 'street', 'zone'], {
			property: 'code',
			direction: 'ASC'
		});
		service.page(request).subscribe();

		const testRequest = http.expectOne('/api/luminaires/paged');
		expect(testRequest.request.method).toBe('POST');
		expect(testRequest.request.body).toEqual(request);
		testRequest.flush({ data: [], currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
	});

	it('reads a single luminaire by its string id', () => {
		service.get('lum-0001').subscribe();
		const testRequest = http.expectOne('/api/luminaires/lum-0001');
		expect(testRequest.request.method).toBe('GET');
		testRequest.flush({ id: 'lum-0001' });
	});

	it('POSTs to /api/luminaires/geo and reads back a plain array, not a page', () => {
		let result: unknown;
		service.geo({ searchTerm: 'LUM-0001' }).subscribe((response) => (result = response));

		const testRequest = http.expectOne('/api/luminaires/geo');
		expect(testRequest.request.method).toBe('POST');
		expect(testRequest.request.body).toEqual({ searchTerm: 'LUM-0001' });
		testRequest.flush([{ id: 'lum-0001' }]);

		expect(result).toEqual([{ id: 'lum-0001' }]);
	});

	it('defaults the geo request body to {} - an empty request means "everything"', () => {
		service.geo().subscribe();
		const testRequest = http.expectOne('/api/luminaires/geo');
		expect(testRequest.request.body).toEqual({});
		testRequest.flush([]);
	});
});
