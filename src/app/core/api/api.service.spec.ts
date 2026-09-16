import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_ERROR_TOAST, SKIP_RETRY } from './api-options';
import { ApiService } from './api.service';

describe('ApiService', () => {
	let service: ApiService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(ApiService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => http.verify());

	it('sends a typed GET with query params attached', () => {
		service.get<{ id: string }[]>('/api/luminaires', { zoneId: 'Z01' }).subscribe();

		const request = http.expectOne((req) => req.url === '/api/luminaires');
		expect(request.request.method).toBe('GET');
		expect(request.request.params.get('zoneId')).toBe('Z01');
		request.flush([{ id: 'lum-0001' }]);
	});

	it('drops a null or undefined param rather than sending it as the string "null"', () => {
		service.get('/api/luminaires', { zoneId: null, street: undefined }).subscribe();

		const request = http.expectOne('/api/luminaires');
		expect(request.request.params.has('zoneId')).toBe(false);
		expect(request.request.params.has('street')).toBe(false);
		request.flush([]);
	});

	it('posts a body untouched by the params builder', () => {
		service.post('/api/faults', { luminaireId: 'lum-0001' }).subscribe();

		const request = http.expectOne('/api/faults');
		expect(request.request.method).toBe('POST');
		expect(request.request.body).toEqual({ luminaireId: 'lum-0001' });
		request.flush({});
	});

	it('sends PUT, PATCH and DELETE with the right method', () => {
		service.put('/api/faults/fault-1', { status: 'CLOSED' }).subscribe();
		http.expectOne((req) => req.method === 'PUT').flush({});

		service.patch('/api/work-orders/wo-1', { status: 'DONE' }).subscribe();
		http.expectOne((req) => req.method === 'PATCH').flush({});

		service.delete('/api/faults/fault-1').subscribe();
		http.expectOne((req) => req.method === 'DELETE').flush(null);
	});

	it('carries per-call options onto the request context for the interceptor to read', () => {
		service.get('/api/luminaires', undefined, { silent: true, retry: false }).subscribe();

		const request = http.expectOne('/api/luminaires');
		expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
		expect(request.request.context.get(SKIP_RETRY)).toBe(true);
		request.flush([]);
	});

	it('requests a blob response type rather than JSON', () => {
		service.getBlob('/api/export').subscribe();

		const request = http.expectOne('/api/export');
		expect(request.request.responseType).toBe('blob');
		request.flush(new Blob(['x']));
	});
});
