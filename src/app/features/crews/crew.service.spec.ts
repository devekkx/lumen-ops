import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createPageRequest } from '@shared/models/pagination';
import { CrewService } from './crew.service';

const emptyPage = { data: [], currentPage: 1, lastPage: 1, total: 0, perPage: 20 };

describe('CrewService', () => {
	let service: CrewService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(CrewService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('POSTs the full envelope to /api/crews/paged rather than a query string', () => {
		const request = createPageRequest(['code', 'name', 'contractor', 'zone'], {
			property: 'code',
			direction: 'ASC'
		});
		service.page(request).subscribe();

		const testRequest = http.expectOne('/api/crews/paged');
		expect(testRequest.request.method).toBe('POST');
		expect(testRequest.request.body).toEqual(request);
		testRequest.flush(emptyPage);
	});

	it('list() GETs the full, unpaged crew array from /api/crews', () => {
		let result: unknown;
		service.list().subscribe((response) => (result = response));

		const testRequest = http.expectOne('/api/crews');
		expect(testRequest.request.method).toBe('GET');
		testRequest.flush([{ id: 'crew-01', code: 'CU-01' }]);

		expect(result).toEqual([{ id: 'crew-01', code: 'CU-01' }]);
	});
});
